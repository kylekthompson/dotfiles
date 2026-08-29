import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { testables } from './index'

describe('RWX command construction', () => {
	test('passes generic CLI arguments directly', () => {
		expect(testables.rwxArguments({ args: ['results', 'run-id'] })).toEqual(['results', 'run-id'])
	})

	test('preserves sandbox shell syntax as one exact argument', () => {
		const args = ['sandbox', 'exec', '--', 'sh', '-lc', 'npm test | tee test.log']
		expect(testables.rwxArguments({ args })).toEqual(args)
	})

	test('rejects an empty command', () => {
		expect(() => testables.rwxArguments({ args: [] })).toThrow('must not be empty')
	})

	test('serializes only sandbox commands', () => {
		expect(testables.usesSandboxQueue({ args: ['sandbox', 'list'] })).toBeTrue()
		expect(testables.usesSandboxQueue({ args: ['results', 'run-id'] })).toBeFalse()
		expect(testables.usesSandboxQueue({ args: ['logs', 'task-id'] })).toBeFalse()
	})
})

describe('orb CLI installation', () => {
	test('selects official assets for supported Amp platforms', () => {
		expect(testables.cliAssetName('linux', 'x64')).toBe('rwx-linux-x86_64')
		expect(testables.cliAssetName('linux', 'arm64')).toBe('rwx-linux-aarch64')
		expect(testables.cliAssetName('darwin', 'arm64')).toBe('rwx-darwin-aarch64')
		expect(testables.cliAssetName('win32', 'x64')).toBeUndefined()
	})

	test('downloads, verifies, installs, and caches the latest release', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'rwx-install-'))
		const binary = new TextEncoder().encode('rwx binary')
		const digest = `sha256:${createHash('sha256').update(binary).digest('hex')}`
		let calls = 0
		const fetchRelease = async (url: string | URL | Request) => {
			calls += 1
			return String(url).includes('/releases/tags/latest')
				? Response.json({
						assets: [
							{
								name: testables.cliAssetName(),
								digest,
								browser_download_url: 'https://example.test/rwx',
							},
						],
					})
				: new Response(binary)
		}

		const executable = await testables.installLatestRwxCli(
			directory,
			fetchRelease as typeof fetch,
			1_000,
		)
		expect(readFileSync(executable)).toEqual(Buffer.from(binary))
		expect(statSync(executable).mode & 0o111).not.toBe(0)
		expect(calls).toBe(2)

		await testables.installLatestRwxCli(directory, fetchRelease as typeof fetch, 2_000)
		expect(calls).toBe(2)
	})

	test('rejects an asset whose checksum does not match GitHub', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'rwx-install-'))
		const fetchRelease = async (url: string | URL | Request) =>
			String(url).includes('/releases/tags/latest')
				? Response.json({
						assets: [
							{
								name: testables.cliAssetName(),
								digest: `sha256:${'0'.repeat(64)}`,
								browser_download_url: 'https://example.test/rwx',
							},
						],
					})
				: new Response('different bytes')

		await expect(
			testables.installLatestRwxCli(directory, fetchRelease as typeof fetch),
		).rejects.toThrow('checksum')
		expect(existsSync(join(directory, 'rwx'))).toBeFalse()
	})
})

test('selects the token variable for the GitHub owner', () => {
	expect(testables.tokenVariableForOwner('kylekthompson')).toBe('SSC_RWX_ACCESS_TOKEN')
	expect(testables.tokenVariableForOwner('rwx-cloud')).toBe('RWX_RWX_ACCESS_TOKEN')
	expect(testables.tokenVariableForOwner('unknown')).toBeUndefined()
})

test('preserves token selection for direct RWX CLI commands', () => {
	const command = testables.tokenExportCommand('SSC_RWX_ACCESS_TOKEN')
	expect(command).toContain('${RWX_ACCESS_TOKEN:-}')
	expect(command).toContain('${SSC_RWX_ACCESS_TOKEN:?SSC_RWX_ACCESS_TOKEN is not set}')
})

describe('executeRwx', () => {
	test('rejects a workspace without sandbox config', async () => {
		const workspace = await mkdtemp(join(tmpdir(), 'rwx-plugin-'))
		expect(
			await testables.executeRwx(
				{ args: ['sandbox', 'exec', '--', 'npm', 'test'] },
				workspace,
				'TOKEN',
				{
					TOKEN: 'secret',
				},
			),
		).toContain('.rwx/sandbox.yml is not present')
	})

	test('runs results without requiring sandbox config', async () => {
		const workspace = await mkdtemp(join(tmpdir(), 'rwx-plugin-'))
		let receivedArgs: string[] = []
		await testables.executeRwx(
			{ args: ['results', 'run-id'] },
			workspace,
			'TOKEN',
			{ TOKEN: 'secret' },
			async (args) => {
				receivedArgs = args
				return { exitCode: 0, output: 'results' }
			},
		)
		expect(receivedArgs).toEqual(['results', 'run-id'])
	})

	test('selects an existing RWX_ACCESS_TOKEN before the owner token', async () => {
		const workspace = await configuredWorkspace()
		let receivedToken = ''
		const output = await testables.executeRwx(
			{ args: ['sandbox', 'exec', '--', 'npm', 'test'] },
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
		const output = await testables.executeRwx(
			{ args: ['results', 'run-id'] },
			workspace,
			'TOKEN',
			{},
		)
		expect(output).toBe('RWX execution blocked: TOKEN is not set.')
	})

	test('reports command failure and redacts the token', async () => {
		const workspace = await configuredWorkspace()
		const output = await testables.executeRwx(
			{ args: ['results', 'run-id'] },
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
