import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

// Register plugin reference copies here. The RWX skill is maintained directly, not generated.
const copies: readonly (readonly [skill: string, destination: string])[] = []

export function syncPluginSkills(
	agentsDirectory: string,
	copies: readonly (readonly [skill: string, destination: string])[],
	check = false,
) {
	for (const [skill, destination] of copies) {
		const source = readFileSync(resolve(agentsDirectory, 'skills', skill, 'SKILL.md'), 'utf8')
		const frontmatter = source.match(/^---\n[\s\S]*?\n---\n+/)
		if (!frontmatter) throw new Error(`Missing frontmatter in ${skill}/SKILL.md`)
		const content = `<!-- Generated from ai/.agents/skills/${skill}/SKILL.md by sync-plugin-skills.ts. -->\n\n${source.slice(frontmatter[0].length)}`
		const target = resolve(agentsDirectory, '../.config/amp/plugins', destination)
		if (check) {
			if (readFileSync(target, 'utf8') !== content) {
				throw new Error(`${destination} is stale; run bun ai/.agents/sync-plugin-skills.ts`)
			}
		} else {
			mkdirSync(dirname(target), { recursive: true })
			writeFileSync(target, content)
		}
	}
}

if (import.meta.main) {
	const check = process.argv.includes('--check')
	if (process.argv.slice(2).some((argument) => argument !== '--check')) {
		throw new Error('Usage: bun ai/.agents/sync-plugin-skills.ts [--check]')
	}

	syncPluginSkills(import.meta.dir, copies, check)
	console.log(`Shared plugin skill references ${check ? 'are current' : 'updated'} (${copies.length} configured).`)
}
