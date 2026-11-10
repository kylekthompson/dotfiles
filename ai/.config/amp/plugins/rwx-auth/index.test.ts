import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Isolate HOME and all token values: loading an orb plugin must never touch the real .bashrc.
function fixture(code: string) {
	const directory = mkdtempSync(join(tmpdir(), 'rwx-auth-'))
	try {
		const result = Bun.spawnSync({
			cmd: [process.execPath, '-e', String.raw`
				import assert from 'node:assert/strict';
				import { execFileSync } from 'node:child_process';
				import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
				import { join } from 'node:path';
				import rwxAuth from ${JSON.stringify(join(import.meta.dir, 'index.ts'))};
				execFileSync('git', ['init', '-q']);
				execFileSync('git', ['remote', 'add', 'origin', 'https://github.com/kylekthompson/fixture']);
				const bashrc = join(process.env.HOME, '.bashrc');
				const hooks = new Map();
				const amp = {
					system: {workspaceRoot: process.cwd()},
					helpers: {
						filePathFromURI: (path) => path,
						shellCommandFromToolCall: (event) => ['shell_command', 'Bash'].includes(event.tool)
							? {command: event.input.command ?? event.input.cmd} : null,
					},
					on: (name, handler) => hooks.set(name, handler),
					registerSkill: async () => assert.fail('auth must not register a common skill'),
				};
				const load = async (remote = 'https://github.com/kylekthompson/fixture') => {
					execFileSync('git', ['remote', 'set-url', 'origin', remote]);
					hooks.clear();
					await rwxAuth(amp);
				};
				const call = async (command, key = 'command', tool = 'shell_command') =>
					await hooks.get('tool.call')?.({tool, input: {[key]: command, workdir: '/fixture'}})
					?? {action: 'allow'};
				const shell = (command, env = {}) => Bun.spawnSync({
					cmd: ['bash', '--noprofile', '--norc', '-c', command],
					env: {...process.env, RWX_ACCESS_TOKEN: '', ...env},
				});
				mkdirSync('bin');
				writeFileSync('bin/rwx', '#!/bin/sh\nprintf "%s" "$RWX_ACCESS_TOKEN"\n', {mode: 0o755});
				process.env.PATH = join(process.cwd(), 'bin') + ':' + process.env.PATH;
				globalThis.fetch = () => assert.fail('auth must not download a CLI');
				${code}
			`],
			cwd: directory,
			env: {
				...process.env,
				HOME: directory,
				AMP_ORB: '0',
				RWX_ACCESS_TOKEN: '',
				RWX_RWX_ACCESS_TOKEN: 'rwx-fixture-secret',
				SSC_RWX_ACCESS_TOKEN: 'ssc-fixture-secret',
			},
		})
		expect(result.stderr.toString()).toBe('')
		expect(result.exitCode).toBe(0)
	} finally {
		rmSync(directory, { recursive: true, force: true })
	}
}

test('routes all mapped GitHub owners without exposing token values in commands', () => {
	fixture(`
		for (const [remote, expected] of [
			['https://github.com/rwx-cloud/fixture.git', 'rwx-fixture-secret'],
			['git@github.com:rwx-research/fixture.git', 'rwx-fixture-secret'],
			['ssh://git@github.com/SomeSoftwareCompany/fixture', 'ssc-fixture-secret'],
			['https://github.com/KyleKThompson/fixture', 'ssc-fixture-secret'],
		]) {
			await load(remote);
			const result = await call('rwx whoami');
			assert.equal(result.action, 'modify');
			assert.equal(result.input.workdir, '/fixture');
			assert.ok(!result.input.command.includes('fixture-secret'));
			const executed = shell(result.input.command);
			assert.equal(executed.exitCode, 0);
			assert.equal(executed.stdout.toString(), expected);
		}
		assert.ok(!existsSync(bashrc), 'non-orbs must not write terminal authentication');
	`)
})

test('preserves explicit generic credentials and fails closed when the selected source is missing', () => {
	fixture(`
		await load();
		for (const [generic, source, expected, succeeds] of [
			['explicit-fixture', 'ssc-source', 'explicit-fixture', true],
			['explicit-fixture', '', 'explicit-fixture', true],
			['', 'ssc-source', 'ssc-source', true],
			['', '', '', false],
		]) {
			const result = await call('rwx whoami');
			const executed = shell(result.input.command, {RWX_ACCESS_TOKEN: generic, SSC_RWX_ACCESS_TOKEN: source});
			assert.equal(executed.exitCode === 0, succeeds);
			assert.equal(executed.stdout.toString(), expected);
			if (!succeeds) assert.match(executed.stderr.toString(), /SSC_RWX_ACCESS_TOKEN is not set/);
		}
	`)
})

test('only modifies RWX shell calls', () => {
	fixture(`
		await load();
		for (const [command, key, tool] of [
			['rwx whoami', 'command', 'shell_command'],
			['rwx results fixture', 'cmd', 'Bash'],
			['/fixture/bin/rwx whoami', 'command', 'shell_command'],
			['git status && rwx whoami', 'command', 'shell_command'],
		]) {
			const result = await call(command, key, tool);
			assert.equal(result.action, 'modify');
			assert.ok(result.input[key].endsWith(command));
		}
		assert.deepEqual(await call('git status'), {action: 'allow'});
		assert.deepEqual(await call('rwx-other whoami'), {action: 'allow'});
		assert.deepEqual(await call('rwx', 'path', 'read_file'), {action: 'allow'});
	`)
})

test('defaults to RWX credentials for unmapped or missing checkouts and remotes', () => {
	fixture(`
		process.env.AMP_ORB = '1';
		const assertFallback = async () => {
			const result = await call('rwx whoami');
			assert.equal(result.action, 'modify');
			assert.ok(!result.input.command.includes('fixture-secret'));
			const executed = shell(result.input.command);
			assert.equal(executed.exitCode, 0);
			assert.equal(executed.stdout.toString(), 'rwx-fixture-secret');
			assert.equal(shell(result.input.command, {RWX_ACCESS_TOKEN: 'explicit-fixture'}).stdout.toString(), 'explicit-fixture');
			const missing = shell(result.input.command, {RWX_RWX_ACCESS_TOKEN: ''});
			assert.notEqual(missing.exitCode, 0);
			assert.match(missing.stderr.toString(), /RWX_RWX_ACCESS_TOKEN is not set/);
			const terminal = shell('source "$HOME/.bashrc"; rwx whoami');
			assert.equal(terminal.exitCode, 0);
			assert.equal(terminal.stdout.toString(), 'rwx-fixture-secret');
		};
		for (const remote of ['https://github.com/unknown/fixture', 'https://gitlab.com/rwx-cloud/fixture']) {
			await load(remote);
			await assertFallback();
		}
		execFileSync('git', ['remote', 'remove', 'origin']);
		hooks.clear();
		await rwxAuth(amp);
		await assertFallback();
		amp.system.workspaceRoot = join(process.cwd(), 'not-a-checkout');
		hooks.clear();
		await rwxAuth(amp);
		await assertFallback();
		amp.system.workspaceRoot = undefined;
		hooks.clear();
		await rwxAuth(amp);
		await assertFallback();
	`)
})

test('migrates orb terminal authentication idempotently using variable references and generic precedence', () => {
	fixture(String.raw`
		process.env.AMP_ORB = '1';
		await load();
		assert.equal(shell('source "$HOME/.bashrc"; rwx whoami').stdout.toString(), 'ssc-fixture-secret');
		writeFileSync(bashrc, '# keep before\n# >>> rwx-access-token plugin >>>\nold auth\n# <<< rwx-access-token plugin <<<\n# keep after\n');
		for (const [remote, selected, other, expected] of [
			['https://github.com/kylekthompson/fixture', 'SSC_RWX_ACCESS_TOKEN', 'RWX_RWX_ACCESS_TOKEN', 'ssc-fixture-secret'],
			['https://github.com/rwx-cloud/fixture', 'RWX_RWX_ACCESS_TOKEN', 'SSC_RWX_ACCESS_TOKEN', 'rwx-fixture-secret'],
		]) {
			await load(remote);
			const content = readFileSync(bashrc, 'utf8');
			await load(remote);
			assert.equal(readFileSync(bashrc, 'utf8'), content);
			assert.equal(content.split('# >>> rwx-access-token plugin >>>').length, 2);
			assert.ok(content.startsWith('# keep before\n'));
			assert.ok(content.endsWith('# keep after\n'));
			assert.ok(!content.includes('old auth'));
			assert.ok(!content.includes(other));
			assert.ok(!content.includes('fixture-secret'));
			const terminalCommand = 'source "$HOME/.bashrc"; rwx whoami';
			assert.equal(shell(terminalCommand).stdout.toString(), expected);
			assert.equal(shell(terminalCommand, {RWX_ACCESS_TOKEN: 'explicit-fixture', [selected]: ''}).stdout.toString(), 'explicit-fixture');
			const missing = shell(terminalCommand, {[selected]: ''});
			assert.equal(missing.stdout.toString(), '');
			assert.ok(missing.stderr.toString().includes(selected + ' is not set'));
		}
	`)
})
