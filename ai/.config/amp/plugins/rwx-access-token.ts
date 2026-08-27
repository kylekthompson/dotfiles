import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { PluginAPI } from '@ampcode/plugin'

export const description =
	"Selects RWX_ACCESS_TOKEN from the user's RWX or SSC secret based on the checkout's GitHub owner."

const TOKEN_BY_OWNER: ReadonlyMap<string, string> = new Map([
	['rwx-cloud', 'RWX_RWX_ACCESS_TOKEN'],
	['rwx-research', 'RWX_RWX_ACCESS_TOKEN'],
	['kylekthompson', 'SSC_RWX_ACCESS_TOKEN'],
	['somesoftwarecompany', 'SSC_RWX_ACCESS_TOKEN'],
])

const BASHRC_BLOCK_START = '# >>> rwx-access-token plugin >>>'
const BASHRC_BLOCK_END = '# <<< rwx-access-token plugin <<<'
const RWX_EXECUTABLE =
	/(^|[\s;&|()])(?:["']?[^ \t\r\n;&|()"'=]*\/)?["']?rwx["']?(?=$|[\s;&|()])/m

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

	if (next !== current) {
		writeFileSync(bashrcPath, next)
	}
}

function commandInputKey(input: Record<string, unknown>): 'command' | 'cmd' | undefined {
	if (typeof input.command === 'string') return 'command'
	if (typeof input.cmd === 'string') return 'cmd'
}

export default function (amp: PluginAPI) {
	const workspaceRoot = amp.system.workspaceRoot
	if (!workspaceRoot) return

	const workspacePath = amp.helpers.filePathFromURI(workspaceRoot)
	const owner = githubOwner(workspacePath)
	const sourceVariable = owner ? TOKEN_BY_OWNER.get(owner) : undefined
	if (!sourceVariable) return

	if (process.env.AMP_ORB === '1') {
		installOrbTerminalHook(sourceVariable)
	}

	amp.on('tool.call', (event) => {
		const shellCommand = amp.helpers.shellCommandFromToolCall(event)
		if (!shellCommand || !RWX_EXECUTABLE.test(shellCommand.command)) {
			return { action: 'allow' }
		}

		const key = commandInputKey(event.input)
		if (!key) return { action: 'allow' }

		const command = event.input[key] as string
		const exportCommand =
			'if [ -z "${RWX_ACCESS_TOKEN:-}" ]; then export RWX_ACCESS_TOKEN="${' +
			sourceVariable +
			':?' +
			sourceVariable +
			' is not set}"; fi; '

		return {
			action: 'modify',
			input: { ...event.input, [key]: exportCommand + command },
		}
	})
}
