import { afterEach, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
	changes,
	diskTree,
	manifestNames,
	reconcile,
	validateTrees,
} from './bin/dot-sync-amp'

const originalEnvironment = { ...process.env }
const temporary: string[] = []
afterEach(() => {
	process.env = { ...originalEnvironment }
	for (const directory of temporary.splice(0))
		rmSync(directory, { recursive: true, force: true })
})

function write(path: string, text: string) {
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, text)
}

function git(cwd: string, ...args: string[]) {
	return execFileSync('git', args, {
		cwd,
		env: process.env,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	}).trim()
}

function skill(name: string) {
	return `---\nname: ${name}\ndescription: Tests synchronization. Use for sync tests.\n---\n# Test\n`
}

function fixture() {
	const root = mkdtempSync(join(tmpdir(), 'dot-sync-amp-test-'))
	temporary.push(root)
	process.env.GIT_CONFIG_GLOBAL = join(root, 'gitconfig')
	process.env.GIT_CONFIG_NOSYSTEM = '1'
	write(
		process.env.GIT_CONFIG_GLOBAL,
		'[user]\nname = Sync Test\nemail = test@example.test\n[commit]\ngpgsign = false\n[init]\ndefaultBranch = main\n',
	)
	const source = join(root, 'source')
	const cache = join(root, 'cache')
	mkdirSync(source)
	mkdirSync(cache)
	git(source, 'init')
	write(
		join(source, 'ai/.agents/amp-skills.json'),
		JSON.stringify({ skills: ['testing-sync'] }),
	)
	write(
		join(source, 'ai/.agents/skills/testing-sync/SKILL.md'),
		skill('testing-sync'),
	)
	write(
		join(source, 'ai/.agents/skills/testing-sync/scripts/run.sh'),
		'#!/bin/sh\necho test\n',
	)
	chmodSync(
		join(source, 'ai/.agents/skills/testing-sync/scripts/run.sh'),
		0o755,
	)
	write(
		join(source, 'ai/.agents/skills/not-selected/SKILL.md'),
		'not a valid skill',
	)
	write(join(source, 'ai/.config/amp/settings.json'), 'do not publish')
	write(
		join(source, 'ai/.config/amp/plugins/example/index.ts'),
		"export const description = 'Tests sync.'\nexport default async function(amp) { await amp.registerSkill({ path: 'skills/testing-plugin' }) }\n",
	)
	write(
		join(
			source,
			'ai/.config/amp/plugins/example/skills/testing-plugin/SKILL.md',
		),
		skill('testing-plugin'),
	)
	git(source, 'add', '.')
	git(source, 'commit', '-m', 'Source')
	git(root, 'clone', '--bare', source, join(root, 'source.git'))
	git(source, 'remote', 'add', 'origin', join(root, 'source.git'))
	const clones = ['skills', 'plugins'].map((kind) => {
		const directory = join(cache, `example.test-user-${kind}`)
		mkdirSync(directory)
		git(directory, 'init')
		write(join(directory, 'obsolete.txt'), 'remove me')
		git(directory, 'add', '.')
		git(directory, 'commit', '-m', 'Old published content')
		const remote = join(root, `${kind}.git`)
		git(root, 'clone', '--bare', directory, remote)
		const url = `https://example.test/user/${kind}`
		git(directory, 'remote', 'add', 'origin', url)
		// Redirect only fixture remotes; no credentials or real repositories are used.
		git(directory, 'config', `url.${remote}.insteadOf`, url)
		return directory
	})
	write(
		join(root, 'bin/amp'),
		`#!/usr/bin/env bun\nconst kind = process.argv[2]; console.log(JSON.stringify([{ scope: 'user', exists: true, cloneURL: 'https://example.test/user/' + kind, viewerCanWrite: true, cloneRef: 'user/' + kind }]));\n`,
	)
	chmodSync(join(root, 'bin/amp'), 0o755)
	process.env.PATH = `${join(root, 'bin')}:${process.env.PATH}`
	return {
		root,
		source,
		cache,
		clones,
		revision: git(source, 'rev-parse', 'HEAD'),
	}
}

test('rejects malformed, empty, duplicate, unsafe and non-string manifest names', () => {
	for (const text of [
		'{',
		'{}',
		'{"skills":[]}',
		'{"skills":["a","a"]}',
		'{"skills":["../a"]}',
		'{"skills":[1]}',
		'{"skills":["a--b"]}',
	]) {
		expect(() => manifestNames(Buffer.from(text))).toThrow()
	}
	expect(manifestNames(Buffer.from('{"skills":["b","a"]}'))).toEqual(['a', 'b'])
})

test('validates frontmatter, plugin descriptions, entrypoints and registrations', () => {
	const file = (text: string) => ({ bytes: Buffer.from(text), mode: 0o644 })
	const skills = new Map([
		['testing-sync/SKILL.md', file(skill('testing-sync'))],
	])
	for (const plugins of [
		new Map([['config.json', file('{}')]]),
		new Map([
			['plugin.ts', file(`export const description = '${'x'.repeat(301)}'`)],
		]),
		new Map([
			['plugin/index.ts', file('export default function() {}')],
			['plugin/skills/testing-plugin/SKILL.md', file(skill('testing-plugin'))],
		]),
	])
		expect(() => validateTrees(skills, plugins, ['testing-sync'])).toThrow()
	expect(() =>
		validateTrees(
			new Map([['testing-sync/SKILL.md', file(skill('wrong-name'))]]),
			new Map(),
			['testing-sync'],
		),
	).toThrow()
	expect(() =>
		validateTrees(
			new Map([
				['testing-sync/SKILL.md', file('---\nname: testing-sync\n---\n')],
			]),
			new Map(),
			['testing-sync'],
		),
	).toThrow()
})

test('preview does not publish; publish copies nested files and modes, removes stale files, and is idempotent', () => {
	const f = fixture()
	const before = f.clones.map((directory) =>
		git(directory, 'rev-parse', 'HEAD'),
	)
	// Local source edits must never leak into staging or be overwritten.
	write(join(f.source, 'ai/.agents/skills/testing-sync/SKILL.md'), 'local edit')
	reconcile(f.source, f.cache)
	expect(
		f.clones.map((directory) => git(directory, 'rev-parse', 'HEAD')),
	).toEqual(before)
	reconcile(f.source, f.cache, f.revision)
	expect([...diskTree(f.clones[0]).keys()]).toEqual([
		'testing-sync/SKILL.md',
		'testing-sync/scripts/run.sh',
	])
	expect(diskTree(f.clones[0]).get('testing-sync/scripts/run.sh')?.mode).toBe(
		0o755,
	)
	expect(
		readFileSync(
			join(f.source, 'ai/.agents/skills/testing-sync/SKILL.md'),
			'utf8',
		),
	).toBe('local edit')
	expect(
		changes(
			diskTree(f.clones[1]),
			diskTree(join(f.source, 'ai/.config/amp/plugins')),
		),
	).toEqual([])
	const heads = f.clones.map((directory) => git(directory, 'rev-parse', 'HEAD'))
	for (const directory of f.clones) {
		expect(git(directory, 'rev-list', '--count', 'HEAD')).toBe('2')
		expect(git(directory, 'status', '--porcelain')).toBe('')
		expect(
			git(directory, 'ls-remote', 'origin', 'refs/heads/main').split(/\s/)[0],
		).toBe(git(directory, 'rev-parse', 'HEAD'))
	}
	reconcile(f.source, f.cache, f.revision)
	expect(
		f.clones.map((directory) => git(directory, 'rev-parse', 'HEAD')),
	).toEqual(heads)
})

test('a dirty second clone blocks writes to both destinations', () => {
	const f = fixture()
	const before = f.clones.map(diskTree)
	write(join(f.clones[1], 'untracked.txt'), 'user work')
	expect(() => reconcile(f.source, f.cache, f.revision)).toThrow('Dirty clone')
	expect(changes(before[0], diskTree(f.clones[0]))).toEqual([])
	expect(git(f.clones[0], 'rev-list', '--count', 'HEAD')).toBe('1')
})

test('a skills-only update does not commit or push the unchanged plugins repository', () => {
	const f = fixture()
	reconcile(f.source, f.cache, f.revision)
	const pluginHead = git(f.clones[1], 'rev-parse', 'HEAD')
	write(
		join(f.source, 'ai/.agents/skills/testing-sync/reference.md'),
		'New reference',
	)
	git(f.source, 'add', '.')
	git(f.source, 'commit', '-m', 'Update one skill')
	git(f.source, 'push', 'origin', 'main')
	reconcile(f.source, f.cache, git(f.source, 'rev-parse', 'HEAD'))
	expect(git(f.clones[0], 'rev-list', '--count', 'HEAD')).toBe('3')
	expect(git(f.clones[1], 'rev-parse', 'HEAD')).toBe(pluginHead)
})

test('invalid source manifest or missing selected skill changes neither destination', () => {
	const f = fixture()
	const before = f.clones.map(diskTree)
	write(
		join(f.source, 'ai/.agents/amp-skills.json'),
		'{"skills":["missing-skill"]}',
	)
	git(f.source, 'add', '.')
	git(f.source, 'commit', '-m', 'Invalid manifest')
	git(f.source, 'push', 'origin', 'main')
	expect(() => reconcile(f.source, f.cache)).toThrow()
	f.clones.forEach((directory, index) =>
		expect(changes(before[index], diskTree(directory))).toEqual([]),
	)
})

test('failing colocated plugin tests block both publications', () => {
	const f = fixture()
	const before = f.clones.map(diskTree)
	write(
		join(f.source, 'ai/.config/amp/plugins/example/index.test.ts'),
		"import { test, expect } from 'bun:test'; test('failure', () => expect(true).toBe(false))\n",
	)
	git(f.source, 'add', '.')
	git(f.source, 'commit', '-m', 'Failing plugin test')
	git(f.source, 'push', 'origin', 'main')
	expect(() =>
		reconcile(f.source, f.cache, git(f.source, 'rev-parse', 'HEAD')),
	).toThrow('bun test')
	f.clones.forEach((directory, index) =>
		expect(changes(before[index], diskTree(directory))).toEqual([]),
	)
})

test('refuses a stale reviewed revision and unpublished local destination commits', () => {
	const f = fixture()
	expect(() => reconcile(f.source, f.cache, '0'.repeat(40))).toThrow(
		'Reviewed revision',
	)
	write(join(f.clones[1], 'local.txt'), 'local commit')
	git(f.clones[1], 'add', '.')
	git(f.clones[1], 'commit', '-m', 'Local work')
	expect(() => reconcile(f.source, f.cache, f.revision)).toThrow(
		'Unpublished local commits',
	)
	expect(git(f.clones[0], 'rev-list', '--count', 'HEAD')).toBe('1')
})

test('refuses symlinks rather than following them while comparing trees', () => {
	const f = fixture()
	symlinkSync(f.source, join(f.clones[0], 'escape'))
	expect(() => diskTree(f.clones[0])).toThrow('Refusing symlink')
})
