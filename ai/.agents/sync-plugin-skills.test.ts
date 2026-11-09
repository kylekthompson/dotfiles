import { expect, test } from 'bun:test'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { syncPluginSkills } from './sync-plugin-skills'

test('generates self-contained policies and detects drift without modifying files', () => {
	const root = mkdtempSync(join(tmpdir(), 'plugin-skills-'))
	try {
		const agents = join(root, '.agents')
		const source = join(agents, 'skills/shared-policy/SKILL.md')
		const destination = 'example/skills/example/reference/policy.md'
		const copies = [['shared-policy', destination]] as const
		mkdirSync(join(agents, 'skills/shared-policy'), { recursive: true })
		writeFileSync(source, '---\nname: shared-policy\n---\n\n# Shared policy\n')

		syncPluginSkills(agents, copies)
		syncPluginSkills(agents, copies, true)
		const generated = join(root, '.config/amp/plugins', destination)
		const original = readFileSync(generated, 'utf8')
		expect(original).toBe('<!-- Generated from ai/.agents/skills/shared-policy/SKILL.md by sync-plugin-skills.ts. -->\n\n# Shared policy\n')

		writeFileSync(source, '---\nname: shared-policy\n---\n\n# Changed policy\n')
		expect(() => syncPluginSkills(agents, copies, true)).toThrow('is stale')
		expect(readFileSync(generated, 'utf8')).toBe(original)
		syncPluginSkills(agents, copies)
		syncPluginSkills(agents, copies, true)
		expect(readFileSync(generated, 'utf8')).toContain('# Changed policy')
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})

test('the CLI creates no plugin files when no reference copies are configured', () => {
	const root = mkdtempSync(join(tmpdir(), 'plugin-skills-'))
	try {
		const agents = join(root, '.agents')
		mkdirSync(agents)
		cpSync(join(import.meta.dir, 'sync-plugin-skills.ts'), join(agents, 'sync-plugin-skills.ts'))
		for (const args of [[], ['--check']]) {
			const result = Bun.spawnSync({
				cmd: [process.execPath, join(agents, 'sync-plugin-skills.ts'), ...args],
				cwd: root,
			})
			expect(result.stderr.toString()).toBe('')
			expect(result.exitCode).toBe(0)
			expect(existsSync(join(root, '.config/amp/plugins'))).toBe(false)
		}
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})
