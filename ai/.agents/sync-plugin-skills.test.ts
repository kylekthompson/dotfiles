import { expect, test } from 'bun:test'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('generates self-contained policies and detects drift without modifying files', () => {
	const root = mkdtempSync(join(tmpdir(), 'plugin-skills-'))
	try {
		const agents = join(root, '.agents')
		mkdirSync(agents)
		cpSync(join(import.meta.dir, 'sync-plugin-skills.ts'), join(agents, 'sync-plugin-skills.ts'))
		for (const skill of ['grill-me', 'rwx-sandbox']) {
			mkdirSync(join(agents, 'skills', skill), { recursive: true })
			writeFileSync(join(agents, 'skills', skill, 'SKILL.md'), `---\nname: ${skill}\n---\n\n# Shared policy\n`)
		}
		const run = (...args: string[]) => Bun.spawnSync({
			cmd: [process.execPath, join(agents, 'sync-plugin-skills.ts'), ...args],
			cwd: root,
		})

		expect(run().exitCode).toBe(0)
		expect(run('--check').exitCode).toBe(0)
		const generated = join(root, '.config/amp/plugins/grill-me/skills/grilling-plans/reference/planning.md')
		const original = readFileSync(generated, 'utf8')
		expect(original).toContain('# Shared policy')
		expect(original).not.toContain('name: grill-me')

		writeFileSync(join(agents, 'skills/grill-me/SKILL.md'), '---\nname: grill-me\n---\n\n# Changed policy\n')
		const stale = run('--check')
		expect(stale.exitCode).not.toBe(0)
		expect(stale.stderr.toString()).toContain('is stale')
		expect(readFileSync(generated, 'utf8')).toBe(original)
		expect(run().exitCode).toBe(0)
		expect(run('--check').exitCode).toBe(0)
		expect(readFileSync(generated, 'utf8')).toContain('# Changed policy')
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})
