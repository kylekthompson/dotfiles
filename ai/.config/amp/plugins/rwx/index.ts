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
	'Installs the RWX CLI in Amp orbs and authenticates RWX shell commands for the checkout owner.'

const TOKEN_BY_OWNER: ReadonlyMap<string, string> = new Map([
	['rwx-cloud', 'RWX_RWX_ACCESS_TOKEN'],
	['rwx-research', 'RWX_RWX_ACCESS_TOKEN'],
	['kylekthompson', 'SSC_RWX_ACCESS_TOKEN'],
	['somesoftwarecompany', 'SSC_RWX_ACCESS_TOKEN'],
])

const BASHRC_BLOCK_START = '# >>> rwx-access-token plugin >>>'
const BASHRC_BLOCK_END = '# <<< rwx-access-token plugin <<<'
const RWX_EXECUTABLE = /(^|[\s;&|()])(?:["']?[^ \t\r\n;&|()"'=]*\/)?["']?rwx["']?(?=$|[\s;&|()])/m
const CLI_RELEASE_URL = 'https://api.github.com/repos/rwx-cloud/rwx/releases/tags/latest'
const CLI_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const SANDBOX_GUIDANCE =
	'This workspace has .rwx/sandbox.yml. Before running tests, linters, formatters, type checks, builds, package scripts, migrations, code generation, or database commands, load the rwx:rwx skill and use rwx sandbox exec through shell_command. Keep inspection and editing on the host.'

type ReleaseAsset = {
	name: string
	digest: string
	browser_download_url: string
}

type InstallMetadata = {
	digest: string
	checkedAt: number
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
		throw new Error(`The latest RWX release has no verified ${assetName} asset.`)
	}

	if (installedDigest !== asset.digest) {
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

	writeFileSync(metadataPath, JSON.stringify({ digest: asset.digest, checkedAt: now }))
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

export default async function (amp: PluginAPI) {
	const workspaceRoot = amp.system.workspaceRoot
	if (!workspaceRoot) return

	const workspacePath = amp.helpers.filePathFromURI(workspaceRoot)
	const owner = githubOwner(workspacePath)
	const sourceVariable = tokenVariableForOwner(owner)
	if (process.env.AMP_ORB === '1') {
		try {
			await installLatestRwxCli()
		} catch (error) {
			console.error(
				`RWX CLI installation failed: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
		if (sourceVariable) installOrbTerminalHook(sourceVariable)
	}

	amp.on('tool.call', (event) => {
		const shellCommand = amp.helpers.shellCommandFromToolCall(event)
		if (!sourceVariable || !shellCommand || !RWX_EXECUTABLE.test(shellCommand.command)) {
			return { action: 'allow' }
		}

		const key = commandInputKey(event.input)
		if (!key) return { action: 'allow' }
		const command = event.input[key] as string
		return {
			action: 'modify',
			input: { ...event.input, [key]: tokenExportCommand(sourceVariable) + command },
		}
	})

	amp.on('agent.start', () => sandboxGuidance(workspacePath))

	await amp.registerSkill({ path: 'skills/rwx' })
}

export const testables = {
	cliAssetName,
	installLatestRwxCli,
	sandboxGuidance,
	tokenExportCommand,
	tokenVariableForOwner,
}
