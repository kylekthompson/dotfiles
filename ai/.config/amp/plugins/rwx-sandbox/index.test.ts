import { describe, expect, test } from 'bun:test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { testables } from './index'

describe('rwxArguments', () => {
	test('passes a simple command directly', () => {
		expect(testables.rwxArguments({ command: 'npm test' })).toEqual([
			'sandbox',
			'exec',
			'--',
			'npm',
			'test',
		])
	})

	test('preserves quoted arguments without using a shell', () => {
		expect(testables.rwxArguments({ command: "printf '%s\\n' 'hello world'" })).toEqual([
			'sandbox',
			'exec',
			'--',
			'printf',
			'%s\\n',
			'hello world',
		])
	})

	test('puts shell syntax inside the sandbox', () => {
		expect(
			testables.rwxArguments({
				command: 'npm test | tee test.log',
				reset: true,
			}),
		).toEqual(['sandbox', 'exec', '--reset', '--', 'sh', '-lc', 'npm test | tee test.log'])
	})

	test('uses exact arguments when supplied', () => {
		expect(testables.rwxArguments({ command: 'printf', args: ['%s', '$HOME'] })).toEqual([
			'sandbox',
			'exec',
			'--',
			'printf',
			'%s',
			'$HOME',
		])
	})
})

test('selects the token variable for the GitHub owner', () => {
	expect(testables.tokenVariableForOwner('kylekthompson')).toBe('SSC_RWX_ACCESS_TOKEN')
	expect(testables.tokenVariableForOwner('rwx-cloud')).toBe('RWX_RWX_ACCESS_TOKEN')
	expect(testables.tokenVariableForOwner('unknown')).toBeUndefined()
})

describe('executeRwx', () => {
	test('rejects a workspace without sandbox config', async () => {
		const workspace = await mkdtemp(join(tmpdir(), 'rwx-plugin-'))
		expect(
			await testables.executeRwx({ command: 'npm test' }, workspace, 'TOKEN', {
				TOKEN: 'secret',
			}),
		).toContain('.rwx/sandbox.yml is not present')
	})

	test('selects an existing RWX_ACCESS_TOKEN before the owner token', async () => {
		const workspace = await configuredWorkspace()
		let receivedToken = ''
		const output = await testables.executeRwx(
			{ command: 'npm test' },
			workspace,
			'TOKEN',
			{ RWX_ACCESS_TOKEN: 'override', TOKEN: 'owner-token' },
			async (_args, _cwd, token) => {
				receivedToken = token
				return { exitCode: 0, output: 'passed' }
			},
		)

		expect(receivedToken).toBe('override')
		expect(output).toContain('completed successfully')
	})

	test('reports a missing owner token without running', async () => {
		const workspace = await configuredWorkspace()
		const output = await testables.executeRwx({ command: 'npm test' }, workspace, 'TOKEN', {})
		expect(output).toBe('RWX execution blocked: TOKEN is not set.')
	})

	test('reports command failure and redacts the token', async () => {
		const workspace = await configuredWorkspace()
		const output = await testables.executeRwx(
			{ command: 'npm test' },
			workspace,
			'TOKEN',
			{ TOKEN: 'secret' },
			async () => ({ exitCode: 2, output: 'request used secret' }),
		)
		expect(output).toContain('failed with exit code 2')
		expect(output).toContain('[REDACTED]')
		expect(output).not.toContain('secret')
	})
})

async function configuredWorkspace(): Promise<string> {
	const workspace = await mkdtemp(join(tmpdir(), 'rwx-plugin-'))
	mkdirSync(join(workspace, '.rwx'))
	writeFileSync(join(workspace, '.rwx', 'sandbox.yml'), '')
	return workspace
}
