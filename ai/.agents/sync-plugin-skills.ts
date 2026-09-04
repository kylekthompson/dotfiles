import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const check = process.argv.includes('--check')
if (process.argv.slice(2).some((argument) => argument !== '--check')) {
	throw new Error('Usage: bun ai/.agents/sync-plugin-skills.ts [--check]')
}

const copies = [
	['rwx-sandbox', 'rwx/skills/rwx/reference/sandbox.md'],
] as const

for (const [skill, destination] of copies) {
	const source = readFileSync(resolve(import.meta.dir, 'skills', skill, 'SKILL.md'), 'utf8')
	const frontmatter = source.match(/^---\n[\s\S]*?\n---\n+/)
	if (!frontmatter) throw new Error(`Missing frontmatter in ${skill}/SKILL.md`)
	const content = `<!-- Generated from ai/.agents/skills/${skill}/SKILL.md by sync-plugin-skills.ts. -->\n\n${source.slice(frontmatter[0].length)}`
	const target = resolve(import.meta.dir, '../.config/amp/plugins', destination)
	if (check) {
		if (readFileSync(target, 'utf8') !== content) {
			throw new Error(`${destination} is stale; run bun ai/.agents/sync-plugin-skills.ts`)
		}
	} else {
		mkdirSync(dirname(target), { recursive: true })
		writeFileSync(target, content)
	}
}

console.log(`Shared plugin skill references ${check ? 'are current' : 'updated'}.`)
