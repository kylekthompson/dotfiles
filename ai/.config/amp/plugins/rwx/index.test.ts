import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Bun caches homedir at process startup, so each scenario needs its own HOME.
function scenario(body: string, environment: Record<string, string> = {}) {
	const directory = mkdtempSync(join(tmpdir(), 'rwx-workspace-plugin-'))
	try {
		const result = Bun.spawnSync({
			cmd: [
				process.execPath,
				'-e',
				`
				import assert from 'node:assert/strict';
				import { execFileSync } from 'node:child_process';
				import { createHash } from 'node:crypto';
				import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
				import { join } from 'node:path';
				import rwx from ${JSON.stringify(join(import.meta.dir, 'index.ts'))};
				const directory = process.cwd();
				const binary = new TextEncoder().encode('#!/bin/sh\\nprintf "fixture RWX CLI\\\\n"\\n');
				const digest = 'sha256:' + createHash('sha256').update(binary).digest('hex');
				const assets = {
					'linux:x64': 'rwx-linux-x86_64', 'linux:arm64': 'rwx-linux-aarch64',
					'darwin:x64': 'rwx-darwin-x86_64', 'darwin:arm64': 'rwx-darwin-aarch64',
				};
				const requests = [];
				globalThis.fetch = async (url, init) => {
					requests.push({url: String(url), headers: new Headers(init?.headers)});
					return String(url).endsWith('/releases/tags/unstable')
						? Response.json({assets: [{name: assets[process.platform + ':' + process.arch], digest, id: 123}]})
						: new Response(binary);
				};
				async function loadPlugin(workspaceRoot = directory) {
					const hooks = new Map();
					const skills = [];
					await rwx({
						system: {workspaceRoot},
						helpers: {
							filePathFromURI: (path) => path,
							shellCommandFromToolCall: (event) => event.tool === 'shell_command'
								? {command: event.input.command ?? event.input.cmd} : null,
						},
						on: (event, handler) => hooks.set(event, handler),
						registerSkill: async ({path}) => {skills.push(path)},
					});
					return {
						call: (command) => hooks.get('tool.call')({tool: 'shell_command', input: {command}}),
						start: () => hooks.get('agent.start')({}),
						skills,
					};
				}
				${body}
			`,
			],
			cwd: directory,
			env: {
				...process.env,
				HOME: directory,
				AMP_ORB: '1',
				GH_TOKEN: 'fixture-github-token',
				RWX_ACCESS_TOKEN: 'fixture-explicit-token',
				...environment,
			},
		})
		expect(result.stderr.toString()).toBe('')
		expect(result.exitCode).toBe(0)
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
}

test('discovers the skill and reminds configured workspaces without installing or selecting credentials', () => {
	scenario(`
		writeFileSync(join(directory, '.bashrc'), '# existing terminal configuration');
		const plugin = await loadPlugin();
		assert.deepEqual(plugin.skills, ['skills/rwx']);
		assert.deepEqual(plugin.start(), {});
		mkdirSync(join(directory, '.rwx'));
		writeFileSync(join(directory, '.rwx/sandbox.yml'), '');
		assert.match(plugin.start().message.content, /load the rwx:rwx skill/);
		rmSync(join(directory, '.rwx/sandbox.yml'));
		assert.deepEqual(plugin.start(), {});
		for (const command of ['git status', 'echo rwx-not-a-command', 'gh pr checks --watch']) {
			assert.deepEqual(await plugin.call(command), {action: 'allow'});
		}
		assert.equal(requests.length, 0);
		assert.equal(readFileSync(join(directory, '.bashrc'), 'utf8'), '# existing terminal configuration');
		assert.equal(process.env.RWX_ACCESS_TOKEN, 'fixture-explicit-token');
	`)
})

test('installs once on concurrent RWX calls and allows original commands unchanged', () => {
	scenario(`
		const plugin = await loadPlugin();
		assert.equal(requests.length, 0);
		const results = await Promise.all(['rwx whoami', 'rwx sandbox exec -- npm test'].map(plugin.call));
		assert.deepEqual(results, [{action: 'allow'}, {action: 'allow'}]);
		assert.deepEqual(requests.map(({url}) => url), [
			'https://api.github.com/repos/rwx-cloud/rwx/releases/tags/unstable',
			'https://api.github.com/repos/rwx-cloud/rwx/releases/assets/123',
		]);
		assert.deepEqual(requests.map(({headers}) => headers.get('Authorization')), [
			'Bearer fixture-github-token', 'Bearer fixture-github-token',
		]);
		assert.equal(requests[1].headers.get('Accept'), 'application/octet-stream');
		const executable = join(directory, '.amp/bin/rwx');
		assert.ok(statSync(executable).mode & 0o111);
		assert.equal(execFileSync(executable, {encoding: 'utf8'}), 'fixture RWX CLI\\n');
		await plugin.call('rwx results fixture');
		await (await loadPlugin()).call('rwx whoami');
		assert.equal(requests.length, 2);
		assert.equal(process.env.RWX_ACCESS_TOKEN, 'fixture-explicit-token');
	`)
})

test('rejects failed downloads and checksum mismatches, then retries without a poisoned cache', () => {
	scenario(`
		const plugin = await loadPlugin();
		const successfulFetch = globalThis.fetch;
		globalThis.fetch = async () => new Response('', {status: 503});
		const unavailable = await plugin.call('rwx whoami');
		assert.equal(unavailable.action, 'reject-and-continue');
		assert.match(unavailable.message, /HTTP 503/);
		globalThis.fetch = async (url, init) => String(url).endsWith('/releases/tags/unstable')
			? successfulFetch(url, init) : new Response('corrupted download');
		const corrupted = await plugin.call('rwx whoami');
		assert.equal(corrupted.action, 'reject-and-continue');
		assert.match(corrupted.message, /checksum/);
		assert.equal(existsSync(join(directory, '.amp/bin/rwx')), false);
		globalThis.fetch = successfulFetch;
		assert.deepEqual(await plugin.call('rwx whoami'), {action: 'allow'});
		assert.equal(execFileSync(join(directory, '.amp/bin/rwx'), {encoding: 'utf8'}), 'fixture RWX CLI\\n');
	`)
})

test('refreshes stale metadata without downloading unchanged assets and repairs changed binaries', () => {
	scenario(`
		await (await loadPlugin()).call('rwx whoami');
		const metadataPath = join(directory, '.amp/bin/.rwx-install.json');
		const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
		writeFileSync(metadataPath, JSON.stringify({...metadata, checkedAt: Date.now() - 86_400_001}));
		await (await loadPlugin()).call('rwx whoami');
		assert.equal(requests.length, 3);
		writeFileSync(join(directory, '.amp/bin/rwx'), 'changed executable');
		await (await loadPlugin()).call('rwx whoami');
		assert.equal(requests.length, 5);
		assert.deepEqual(readFileSync(join(directory, '.amp/bin/rwx')), Buffer.from(binary));
	`)
})

test('keeps local execution untouched and supports skill discovery without a workspace', () => {
	scenario(
		`
		const plugin = await loadPlugin(null);
		assert.deepEqual(plugin.skills, ['skills/rwx']);
		assert.deepEqual(plugin.start(), {});
		assert.deepEqual(await plugin.call('rwx whoami'), {action: 'allow'});
		assert.equal(requests.length, 0);
		assert.equal(existsSync(join(directory, '.amp')), false);
		process.env.AMP_ORB = '1';
		assert.deepEqual(await plugin.call('rwx whoami'), {action: 'allow'});
		assert.equal(requests.length, 2);
	`,
		{ AMP_ORB: '0' },
	)
})
