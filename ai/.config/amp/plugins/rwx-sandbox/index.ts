import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { PluginAPI } from '@ampcode/plugin'

export const description =
	'Runs environment-dependent commands in the configured RWX sandbox and selects the correct RWX token for the checkout owner.'

const TOKEN_BY_OWNER: ReadonlyMap<string, string> = new Map([
	['rwx-cloud', 'RWX_RWX_ACCESS_TOKEN'],
	['rwx-research', 'RWX_RWX_ACCESS_TOKEN'],
	['kylekthompson', 'SSC_RWX_ACCESS_TOKEN'],
	['somesoftwarecompany', 'SSC_RWX_ACCESS_TOKEN'],
])

const BASHRC_BLOCK_START = '# >>> rwx-access-token plugin >>>'
const BASHRC_BLOCK_END = '# <<< rwx-access-token plugin <<<'
const RWX_EXECUTABLE = /(^|[\s;&|()])(?:["']?[^ \t\r\n;&|()"'=]*\/)?["']?rwx["']?(?=$|[\s;&|()])/m
const MAX_OUTPUT_BYTES = 64 * 1024

type RwxInput = {
	command: string
	args?: string[]
	reset?: boolean
}

type ProcessResult = {
	exitCode: number
	output: string
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

function hasShellSyntax(command: string): boolean {
	let quote: "'" | '"' | undefined
	let escaped = false

	for (const character of command) {
		if (escaped) {
			escaped = false
			continue
		}
		if (character === '\\' && quote === '"') return true
		if (character === '\\' && !quote) {
			escaped = true
			continue
		}
		if (quote) {
			if (character === quote) quote = undefined
			if (character === '$' && quote === '"') return true
			continue
		}
		if (character === "'" || character === '"') {
			quote = character
			continue
		}
		if ('|&;<>()$`\n*?[]{}'.includes(character)) return true
	}

	return /(^|\s)(?:[A-Za-z_][A-Za-z0-9_]*=|#)/.test(command) || /(^|\s)~(?:\/|$)/.test(command)
}

function splitSimpleCommand(command: string): string[] {
	const words: string[] = []
	let word = ''
	let started = false
	let quote: "'" | '"' | undefined
	let escaped = false

	for (const character of command) {
		if (escaped) {
			word += character
			started = true
			escaped = false
			continue
		}
		if (character === '\\' && quote !== "'") {
			escaped = true
			started = true
			continue
		}
		if (quote) {
			if (character === quote) quote = undefined
			else word += character
			started = true
			continue
		}
		if (character === "'" || character === '"') {
			quote = character
			started = true
			continue
		}
		if (/\s/.test(character)) {
			if (started) {
				words.push(word)
				word = ''
				started = false
			}
			continue
		}
		word += character
		started = true
	}

	if (quote || escaped) throw new Error('Command has an unclosed quote or escape.')
	if (started) words.push(word)
	return words
}

function rwxArguments(input: RwxInput): string[] {
	const prefix = ['sandbox', 'exec', ...(input.reset ? ['--reset'] : []), '--']
	if (input.args) return [...prefix, input.command, ...input.args]
	if (hasShellSyntax(input.command)) return [...prefix, 'sh', '-lc', input.command]

	const command = splitSimpleCommand(input.command)
	if (command.length === 0) throw new Error('Command must not be empty.')
	return [...prefix, ...command]
}

function runProcess(args: string[], cwd: string, token: string): Promise<ProcessResult> {
	return new Promise((resolve) => {
		const child = spawn('rwx', args, {
			cwd,
			env: { ...process.env, RWX_ACCESS_TOKEN: token },
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		let output = ''
		let omittedBytes = 0

		const collect = (chunk: Buffer) => {
			output += chunk.toString()
			if (Buffer.byteLength(output) > MAX_OUTPUT_BYTES) {
				const bytes = Buffer.from(output)
				omittedBytes += bytes.length - MAX_OUTPUT_BYTES
				output = bytes.subarray(bytes.length - MAX_OUTPUT_BYTES).toString()
			}
		}

		child.stdout.on('data', collect)
		child.stderr.on('data', collect)
		child.on('error', (error) => resolve({ exitCode: 127, output: error.message }))
		child.on('close', (exitCode) => {
			const notice = omittedBytes > 0 ? `[Earlier output omitted: ${omittedBytes} bytes]\n` : ''
			resolve({ exitCode: exitCode ?? 1, output: notice + output })
		})
	})
}

async function executeRwx(
	input: RwxInput,
	workspacePath: string,
	sourceVariable: string | undefined,
	environment: NodeJS.ProcessEnv = process.env,
	run: (args: string[], cwd: string, token: string) => Promise<ProcessResult> = runProcess,
): Promise<string> {
	if (!existsSync(join(workspacePath, '.rwx', 'sandbox.yml'))) {
		return 'RWX execution blocked: .rwx/sandbox.yml is not present in the workspace root.'
	}
	if (!sourceVariable) {
		return 'RWX execution blocked: the GitHub owner has no configured RWX token selection.'
	}

	const token = environment.RWX_ACCESS_TOKEN || environment[sourceVariable]
	if (!token) return `RWX execution blocked: ${sourceVariable} is not set.`

	let args: string[]
	try {
		args = rwxArguments(input)
	} catch (error) {
		return `RWX execution blocked: ${error instanceof Error ? error.message : String(error)}`
	}

	const result = await run(args, workspacePath, token)
	const output = result.output.split(token).join('[REDACTED]')
	const summary =
		result.exitCode === 0
			? 'RWX command completed successfully.'
			: `RWX command failed with exit code ${result.exitCode}.`
	return output.trim() ? `${summary}\n\n${output.trimEnd()}` : summary
}

export default async function (amp: PluginAPI) {
	const workspaceRoot = amp.system.workspaceRoot
	if (!workspaceRoot) return

	const workspacePath = amp.helpers.filePathFromURI(workspaceRoot)
	const owner = githubOwner(workspacePath)
	const sourceVariable = tokenVariableForOwner(owner)
	if (sourceVariable && process.env.AMP_ORB === '1') installOrbTerminalHook(sourceVariable)

	let executionQueue = Promise.resolve()
	amp.registerTool({
		name: 'rwx_exec',
		title: 'Run in RWX sandbox',
		transcriptGroup: { active: 'Running in RWX', complete: 'Ran in RWX' },
		description:
			'Run one environment-dependent command in the repository RWX sandbox. Use only with the bundled rwx-sandbox skill. Host file reads, edits, searches, and lightweight Git inspection do not belong here.',
		inputSchema: {
			type: 'object',
			properties: {
				command: {
					type: 'string',
					description: 'A command line, or an executable name when args is supplied.',
				},
				args: {
					type: 'array',
					items: { type: 'string' },
					description: 'Optional exact arguments. Use this to avoid shell parsing.',
				},
				reset: {
					type: 'boolean',
					description:
						'Reset the sandbox before execution. Use only after setup inputs change or the sandbox is damaged.',
				},
			},
			required: ['command'],
			additionalProperties: false,
		},
		execute: (input) => {
			const execute = () => executeRwx(input as RwxInput, workspacePath, sourceVariable)
			const result = executionQueue.then(execute, execute)
			executionQueue = result.then(
				() => undefined,
				() => undefined,
			)
			return result
		},
	})

	amp.on('tool.call', (event) => {
		const shellCommand = amp.helpers.shellCommandFromToolCall(event)
		if (!sourceVariable || !shellCommand || !RWX_EXECUTABLE.test(shellCommand.command)) {
			return { action: 'allow' }
		}

		const key = commandInputKey(event.input)
		if (!key) return { action: 'allow' }
		const command = event.input[key] as string
		const exportCommand = `if [ -z "\${RWX_ACCESS_TOKEN:-}" ]; then export RWX_ACCESS_TOKEN="\${${sourceVariable}:?${sourceVariable} is not set}"; fi; `
		return {
			action: 'modify',
			input: { ...event.input, [key]: exportCommand + command },
		}
	})

	await amp.registerSkill({ path: 'skills/rwx-sandbox' })
}

export const testables = {
	executeRwx,
	hasShellSyntax,
	rwxArguments,
	splitSimpleCommand,
	tokenVariableForOwner,
}
