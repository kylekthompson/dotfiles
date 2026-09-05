import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { PluginAPI } from '@ampcode/plugin'

export const description =
	'Installs the latest unstable RWX CLI on first agent use in Amp orbs and authenticates RWX shell commands for the checkout owner.'

const TOKEN_BY_OWNER: ReadonlyMap<string, string> = new Map([
	['rwx-cloud', 'RWX_RWX_ACCESS_TOKEN'],
	['rwx-research', 'RWX_RWX_ACCESS_TOKEN'],
	['kylekthompson', 'SSC_RWX_ACCESS_TOKEN'],
	['somesoftwarecompany', 'SSC_RWX_ACCESS_TOKEN'],
])

const BASHRC_BLOCK_START = '# >>> rwx-access-token plugin >>>'
const BASHRC_BLOCK_END = '# <<< rwx-access-token plugin <<<'
const RWX_EXECUTABLE = /(^|[\s;&|()])(?:["']?[^ \t\r\n;&|()"'=]*\/)?["']?rwx["']?(?=$|[\s;&|()])/m
const GH_PR_CHECKS_WATCH = /(^|[\s;&|()])gh\s+pr\s+checks\b[^\n;&|]*\s--watch(?:[=\s]|$)/m
const CLI_RELEASE_TAG = 'unstable'
const CLI_RELEASE_URL = `https://api.github.com/repos/rwx-cloud/rwx/releases/tags/${CLI_RELEASE_TAG}`
const CLI_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const SANDBOX_GUIDANCE =
	'This workspace has .rwx/sandbox.yml. Before environment-dependent project commands, load the rwx:rwx skill for execution policy through shell_command. Inspection and editing stay on the host.'
const RWX_RUN_URL = /https:\/\/cloud\.rwx\.com\/[^/\s]+\/[^/\s]+\/runs\/([a-zA-Z0-9_-]+)/

type ReleaseAsset = {
	name: string
	digest: string
	browser_download_url: string
}

type InstallMetadata = {
	digest: string
	checkedAt: number
	releaseTag: string
	installedByPlugin: true
}

function githubOwner(workspacePath: string): string | undefined {
	let remote: string

	try {
		remote = execFileSync('git', ['-C', workspacePath, 'remote', 'get-url', 'origin'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim()
	} catch {
		return
	}

	return remote.match(/github\.com[/:]([^/]+)\//i)?.[1]?.toLowerCase()
}

function tokenVariableForOwner(owner: string | undefined): string | undefined {
	return owner ? TOKEN_BY_OWNER.get(owner) : undefined
}

function cliAssetName(
	platform = process.platform,
	architecture = process.arch,
): string | undefined {
	const operatingSystem =
		platform === 'linux' ? 'linux' : platform === 'darwin' ? 'darwin' : undefined
	const cpu = architecture === 'x64' ? 'x86_64' : architecture === 'arm64' ? 'aarch64' : undefined
	return operatingSystem && cpu ? `rwx-${operatingSystem}-${cpu}` : undefined
}

function readInstallMetadata(path: string): InstallMetadata | undefined {
	try {
		return JSON.parse(readFileSync(path, 'utf8')) as InstallMetadata
	} catch {
		return
	}
}

function sha256(bytes: Uint8Array): string {
	return `sha256:${createHash('sha256').update(bytes).digest('hex')}`
}

async function installLatestRwxCli(
	binDirectory = join(homedir(), '.amp', 'bin'),
	fetchRelease: typeof fetch = fetch,
	now = Date.now(),
): Promise<string> {
	const assetName = cliAssetName()
	if (!assetName)
		throw new Error(`RWX does not publish a CLI for ${process.platform}/${process.arch}.`)

	const executablePath = join(binDirectory, 'rwx')
	const metadataPath = join(binDirectory, '.rwx-install.json')
	const metadata = readInstallMetadata(metadataPath)
	const installedDigest = existsSync(executablePath)
		? sha256(readFileSync(executablePath))
		: undefined
	if (
		metadata &&
		metadata.installedByPlugin === true &&
		metadata.releaseTag === CLI_RELEASE_TAG &&
		installedDigest === metadata.digest &&
		now - metadata.checkedAt < CLI_CHECK_INTERVAL_MS
	) {
		return executablePath
	}

	const releaseResponse = await fetchRelease(CLI_RELEASE_URL, {
		headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'amp-rwx-plugin' },
	})
	if (!releaseResponse.ok) {
		throw new Error(`GitHub release lookup failed with HTTP ${releaseResponse.status}.`)
	}
	const release = (await releaseResponse.json()) as { assets?: ReleaseAsset[] }
	const asset = release.assets?.find((candidate) => candidate.name === assetName)
	if (!asset?.digest?.startsWith('sha256:')) {
		throw new Error(`The unstable RWX release has no verified ${assetName} asset.`)
	}

	if (installedDigest !== asset.digest || metadata?.installedByPlugin !== true) {
		const downloadResponse = await fetchRelease(asset.browser_download_url)
		if (!downloadResponse.ok) {
			throw new Error(`RWX CLI download failed with HTTP ${downloadResponse.status}.`)
		}
		const bytes = new Uint8Array(await downloadResponse.arrayBuffer())
		const digest = sha256(bytes)
		if (digest !== asset.digest)
			throw new Error('The downloaded RWX CLI checksum does not match GitHub.')

		mkdirSync(binDirectory, { recursive: true })
		const temporaryPath = join(binDirectory, `.rwx-${process.pid}.tmp`)
		try {
			writeFileSync(temporaryPath, bytes)
			chmodSync(temporaryPath, 0o755)
			renameSync(temporaryPath, executablePath)
		} finally {
			rmSync(temporaryPath, { force: true })
		}
	}

	writeFileSync(
		metadataPath,
		JSON.stringify({
			digest: asset.digest,
			checkedAt: now,
			releaseTag: CLI_RELEASE_TAG,
			installedByPlugin: true,
		}),
	)
	return executablePath
}

function installOrbTerminalHook(sourceVariable: string): void {
	const bashrcPath = join(homedir(), '.bashrc')
	const current = existsSync(bashrcPath) ? readFileSync(bashrcPath, 'utf8') : ''
	const block = [
		BASHRC_BLOCK_START,
		'if [[ -n "${RWX_ACCESS_TOKEN-}" ]]; then',
		'\t:',
		`elif [[ -n "\${${sourceVariable}-}" ]]; then`,
		`\texport RWX_ACCESS_TOKEN="\${${sourceVariable}}"`,
		'else',
		'\tunset RWX_ACCESS_TOKEN',
		`\tprintf '%s\\n' '${sourceVariable} is not set; RWX_ACCESS_TOKEN remains unset.' >&2`,
		'fi',
		BASHRC_BLOCK_END,
	].join('\n')

	const start = current.indexOf(BASHRC_BLOCK_START)
	const end = current.indexOf(BASHRC_BLOCK_END, start)
	let next: string

	if (start >= 0 && end >= 0) {
		next = current.slice(0, start) + block + current.slice(end + BASHRC_BLOCK_END.length)
	} else {
		const separator = current.length > 0 && !current.endsWith('\n') ? '\n' : ''
		next = `${current}${separator}${block}\n`
	}

	if (next !== current) writeFileSync(bashrcPath, next)
}

function commandInputKey(input: Record<string, unknown>): 'command' | 'cmd' | undefined {
	if (typeof input.command === 'string') return 'command'
	if (typeof input.cmd === 'string') return 'cmd'
}

function tokenExportCommand(sourceVariable: string): string {
	return `if [ -z "\${RWX_ACCESS_TOKEN:-}" ]; then export RWX_ACCESS_TOKEN="\${${sourceVariable}:?${sourceVariable} is not set}"; fi; `
}

function sandboxGuidance(workspacePath: string) {
	if (!existsSync(join(workspacePath, '.rwx', 'sandbox.yml'))) return {}
	return { message: { content: SANDBOX_GUIDANCE } }
}

function failedChecksGuidance(
	command: string,
	output: unknown,
): { status: 'done'; output: unknown } | undefined {
	if (!GH_PR_CHECKS_WATCH.test(command) || typeof output !== 'object' || output === null) return

	const result = output as Record<string, unknown>
	if (typeof result.exitCode !== 'number' || result.exitCode === 0) return

	const commandOutput = typeof result.output === 'string' ? result.output : ''
	const runID = commandOutput.match(RWX_RUN_URL)?.[1]
	if (!runID) return

	const guidance = `GitHub reported failed checks. Run \`rwx results ${runID}\` for a more useful, LLM-friendly failure summary before inspecting individual logs.`
	return {
		status: 'done',
		output: {
			...result,
			output: `${commandOutput}${commandOutput.endsWith('\n') ? '' : '\n'}\n${guidance}`,
		},
	}
}

export default async function (amp: PluginAPI) {
	const workspaceRoot = amp.system.workspaceRoot
	if (!workspaceRoot) return

	const workspacePath = amp.helpers.filePathFromURI(workspaceRoot)
	const owner = githubOwner(workspacePath)
	const sourceVariable = tokenVariableForOwner(owner)
	const isOrb = process.env.AMP_ORB === '1'
	let cliInstall: Promise<string> | undefined
	if (isOrb && sourceVariable) installOrbTerminalHook(sourceVariable)

	amp.on('tool.call', async (event) => {
		const shellCommand = amp.helpers.shellCommandFromToolCall(event)
		if (!shellCommand || !RWX_EXECUTABLE.test(shellCommand.command)) {
			return { action: 'allow' }
		}

		const key = commandInputKey(event.input)
		if (!key) return { action: 'allow' }
		if (isOrb) {
			try {
				await (cliInstall ??= installLatestRwxCli())
			} catch (error) {
				cliInstall = undefined
				return {
					action: 'reject-and-continue',
					message: `RWX CLI installation failed: ${error instanceof Error ? error.message : String(error)}. The command did not run.`,
				}
			}
		}
		if (!sourceVariable) return { action: 'allow' }
		const command = event.input[key] as string
		return {
			action: 'modify',
			input: { ...event.input, [key]: tokenExportCommand(sourceVariable) + command },
		}
	})

	amp.on('tool.result', (event) => {
		const shellCommand = amp.helpers.shellCommandFromToolCall(event)
		return shellCommand ? failedChecksGuidance(shellCommand.command, event.output) : undefined
	})

	amp.on('agent.start', () => sandboxGuidance(workspacePath))

	await amp.registerSkill({ path: 'skills/rwx' })
}

export const testables = {
	cliAssetName,
	failedChecksGuidance,
	installLatestRwxCli,
	sandboxGuidance,
	tokenExportCommand,
	tokenVariableForOwner,
}
