import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { testables } from './index'

describe('bundled skill guidance', () => {
	test('uses current RWX documentation and local changes for run loops', () => {
		const skill = readFileSync(join(import.meta.dir, 'skills', 'rwx', 'SKILL.md'), 'utf8')

		expect(skill).toContain('rwx docs pull /migrating/rwx-reference')
		expect(skill).toContain('rwx lint .rwx/<name>.yml')
		expect(skill).toContain('rwx run .rwx/<file>.yml --wait')
		expect(skill).toContain('does not require a commit or push')
	})

	test('prefers RWX results after watched GitHub checks fail', () => {
		const skill = readFileSync(join(import.meta.dir, 'skills', 'rwx', 'SKILL.md'), 'utf8')

		expect(skill).toContain('`gh pr checks --watch`')
		expect(skill).toContain('run `rwx results <run-id>`')
		expect(skill).toContain('RWX URL')
		expect(skill).toContain('before inspecting individual logs')
	})
})

describe('GitHub check guidance', () => {
	test('adds RWX results guidance when watched PR checks fail', () => {
		const result = testables.failedChecksGuidance('gh pr checks --watch', {
			output:
				'RWX: CI\tfail\t1m2s\thttps://cloud.rwx.com/acme/widgets/runs/421186a89f5b4f379d9fe7d712ad17b2',
			exitCode: 1,
		})

		expect(result).toEqual({
			status: 'done',
			output: {
				output:
					'RWX: CI\tfail\t1m2s\thttps://cloud.rwx.com/acme/widgets/runs/421186a89f5b4f379d9fe7d712ad17b2\n\nGitHub reported failed checks. Run `rwx results 421186a89f5b4f379d9fe7d712ad17b2` for a more useful, LLM-friendly failure summary before inspecting individual logs.',
				exitCode: 1,
			},
		})
	})

	test('does not add guidance for successful or unwatched checks', () => {
		expect(
			testables.failedChecksGuidance('gh pr checks --watch', { output: 'All checks passed', exitCode: 0 }),
		).toBeUndefined()
		expect(
			testables.failedChecksGuidance('gh pr checks', { output: 'Checks failed', exitCode: 1 }),
		).toBeUndefined()
		expect(
			testables.failedChecksGuidance('gh pr checks --watch', {
				output: 'Checks failed without an RWX URL',
				exitCode: 1,
			}),
		).toBeUndefined()
	})
})

describe('sandbox guidance', () => {
	test('tells the agent to load the RWX skill for a configured workspace', async () => {
		const workspace = await configuredWorkspace()
		const guidance = testables.sandboxGuidance(workspace)

		expect(guidance?.message.content).toContain('.rwx/sandbox.yml')
		expect(guidance?.message.content).toContain('load the rwx:rwx skill')
		expect(guidance?.message.content).toContain('through shell_command')
	})

	test('does not add guidance without sandbox configuration', async () => {
		const workspace = await mkdtemp(join(tmpdir(), 'rwx-plugin-'))
		expect(testables.sandboxGuidance(workspace).message).toBeUndefined()
	})
})

describe('orb CLI installation', () => {
	test('selects official assets for supported Amp platforms', () => {
		expect(testables.cliAssetName('linux', 'x64')).toBe('rwx-linux-x86_64')
		expect(testables.cliAssetName('linux', 'arm64')).toBe('rwx-linux-aarch64')
		expect(testables.cliAssetName('darwin', 'arm64')).toBe('rwx-darwin-aarch64')
		expect(testables.cliAssetName('win32', 'x64')).toBeUndefined()
	})

	test('downloads, verifies, installs, and caches the latest unstable release', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'rwx-install-'))
		const binary = new TextEncoder().encode('rwx binary')
		const digest = `sha256:${createHash('sha256').update(binary).digest('hex')}`
		let calls = 0
		const fetchRelease = async (url: string | URL | Request) => {
			calls += 1
			return String(url).includes('/releases/tags/unstable')
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

	test('replaces an existing CLI once and records plugin ownership', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'rwx-install-'))
		const executable = join(directory, 'rwx')
		const binary = new TextEncoder().encode('unstable rwx binary')
		const digest = `sha256:${createHash('sha256').update(binary).digest('hex')}`
		const existingBinary = new TextEncoder().encode('existing rwx binary')
		const existingDigest = `sha256:${createHash('sha256').update(existingBinary).digest('hex')}`
		writeFileSync(executable, existingBinary)
		writeFileSync(
			join(directory, '.rwx-install.json'),
			JSON.stringify({ digest: existingDigest, checkedAt: 1_000, releaseTag: 'unstable' }),
		)
		let calls = 0
		const fetchRelease = async (url: string | URL | Request) => {
			calls += 1
			return String(url).includes('/releases/tags/unstable')
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

		await testables.installLatestRwxCli(directory, fetchRelease as typeof fetch, 2_000)

		expect(readFileSync(executable)).toEqual(Buffer.from(binary))
		expect(JSON.parse(readFileSync(join(directory, '.rwx-install.json'), 'utf8'))).toEqual({
			digest,
			checkedAt: 2_000,
			releaseTag: 'unstable',
			installedByPlugin: true,
		})

		await testables.installLatestRwxCli(directory, fetchRelease as typeof fetch, 3_000)
		expect(calls).toBe(2)
	})

	test('does not reuse metadata from the stable release channel', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'rwx-install-'))
		const binary = new TextEncoder().encode('rwx binary')
		const digest = `sha256:${createHash('sha256').update(binary).digest('hex')}`
		writeFileSync(join(directory, 'rwx'), binary)
		writeFileSync(join(directory, '.rwx-install.json'), JSON.stringify({ digest, checkedAt: 1_000 }))
		let calls = 0
		const fetchRelease = async (url: string | URL | Request) => {
			calls += 1
			expect(String(url)).toContain('/releases/tags/unstable')
			return Response.json({
				assets: [
					{
						name: testables.cliAssetName(),
						digest,
						browser_download_url: 'https://example.test/rwx',
					},
				],
			})
		}

		await testables.installLatestRwxCli(directory, fetchRelease as typeof fetch, 2_000)

		expect(calls).toBe(1)
		expect(JSON.parse(readFileSync(join(directory, '.rwx-install.json'), 'utf8'))).toEqual({
			digest,
			checkedAt: 2_000,
			releaseTag: 'unstable',
			installedByPlugin: true,
		})
	})

	test('rejects an asset whose checksum does not match GitHub', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'rwx-install-'))
		const fetchRelease = async (url: string | URL | Request) =>
			String(url).includes('/releases/tags/unstable')
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

async function configuredWorkspace(): Promise<string> {
	const workspace = await mkdtemp(join(tmpdir(), 'rwx-plugin-'))
	mkdirSync(join(workspace, '.rwx'))
	writeFileSync(join(workspace, '.rwx', 'sandbox.yml'), '')
	return workspace
}
