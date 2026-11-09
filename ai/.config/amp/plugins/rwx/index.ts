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
	'Installs the verified unstable RWX CLI on first agent use in orbs and guides project checks through configured RWX sandboxes. Authentication stays with the user.'

const RWX_EXECUTABLE = /(^|[\s;&|()])(?:["']?[^ \t\r\n;&|()"'=]*\/)?["']?rwx["']?(?=$|[\s;&|()])/m
const CLI_RELEASE_TAG = 'unstable'
const CLI_RELEASE_URL = `https://api.github.com/repos/rwx-cloud/rwx/releases/tags/${CLI_RELEASE_TAG}`
const CLI_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const SANDBOX_GUIDANCE =
	'This workspace has .rwx/sandbox.yml. Before environment-dependent project commands, load the rwx:rwx skill for execution policy through shell_command. Inspection and editing stay on the host.'

type ReleaseAsset = {
	id: number
	name: string
	digest: string
}

type InstallMetadata = {
	digest: string
	checkedAt: number
	releaseTag: string
	installedByPlugin: true
}

function cliAssetName(): string | undefined {
	const operatingSystem =
		process.platform === 'linux' ? 'linux' : process.platform === 'darwin' ? 'darwin' : undefined
	const cpu = process.arch === 'x64' ? 'x86_64' : process.arch === 'arm64' ? 'aarch64' : undefined
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

function githubToken(): string | undefined {
	const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
	if (token) return token

	try {
		return (
			execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], {
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore'],
			}).trim() || undefined
		)
	} catch {
		return
	}
}

async function installLatestRwxCli(): Promise<void> {
	const assetName = cliAssetName()
	if (!assetName)
		throw new Error(`RWX does not publish a CLI for ${process.platform}/${process.arch}.`)

	const binDirectory = join(homedir(), '.amp', 'bin')
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
		Date.now() - metadata.checkedAt < CLI_CHECK_INTERVAL_MS
	) {
		return
	}

	const headers = new Headers({
		Accept: 'application/vnd.github+json',
		'User-Agent': 'amp-rwx-plugin',
	})
	const token = githubToken()
	if (token) headers.set('Authorization', `Bearer ${token}`)
	const releaseResponse = await fetch(CLI_RELEASE_URL, { headers })
	if (!releaseResponse.ok) {
		throw new Error(`GitHub release lookup failed with HTTP ${releaseResponse.status}.`)
	}
	const release = (await releaseResponse.json()) as { assets?: ReleaseAsset[] }
	const asset = release.assets?.find((candidate) => candidate.name === assetName)
	if (!asset?.digest?.startsWith('sha256:')) {
		throw new Error(`The unstable RWX release has no verified ${assetName} asset.`)
	}

	if (installedDigest !== asset.digest || metadata?.installedByPlugin !== true) {
		const downloadHeaders = new Headers(headers)
		downloadHeaders.set('Accept', 'application/octet-stream')
		const downloadResponse = await fetch(
			`https://api.github.com/repos/rwx-cloud/rwx/releases/assets/${asset.id}`,
			{ headers: downloadHeaders },
		)
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
			checkedAt: Date.now(),
			releaseTag: CLI_RELEASE_TAG,
			installedByPlugin: true,
		}),
	)
}

export default async function (amp: PluginAPI) {
	const workspacePath = amp.system.workspaceRoot
		? amp.helpers.filePathFromURI(amp.system.workspaceRoot)
		: undefined
	let cliInstall: Promise<void> | undefined

	amp.on('tool.call', async (event) => {
		const shellCommand = amp.helpers.shellCommandFromToolCall(event)
		if (process.env.AMP_ORB === '1' && shellCommand && RWX_EXECUTABLE.test(shellCommand.command)) {
			try {
				cliInstall ??= installLatestRwxCli()
				await cliInstall
			} catch (error) {
				cliInstall = undefined
				return {
					action: 'reject-and-continue',
					message: `RWX CLI installation failed: ${error instanceof Error ? error.message : String(error)}. The command did not run.`,
				}
			}
		}
		return { action: 'allow' }
	})

	amp.on('agent.start', () => {
		if (workspacePath && existsSync(join(workspacePath, '.rwx', 'sandbox.yml'))) {
			return { message: { content: SANDBOX_GUIDANCE } }
		}
		return {}
	})

	await amp.registerSkill({ path: 'skills/rwx' })
}
