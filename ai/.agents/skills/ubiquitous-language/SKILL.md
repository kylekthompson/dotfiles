---
name: ubiquitous-language
description: Keeps domain vocabulary aligned with `DOMAIN.md`. Use during naming, implementation, refactoring, review, documentation, API or schema design, and explicit glossary audits or updates.
---

# Ubiquitous Language

Use the same terms for the same domain concepts in conversation, code, contracts, and documentation. Apply the language quietly during normal work. Report terminology findings only when they affect the work or the user asks for an audit.

## Establish the Vocabulary

1. Find the `DOMAIN.md` that governs the active files. Use the nearest ancestor file, then the repository-root file as a fallback. A nearer glossary governs its subtree; do not blend conflicting scopes.
2. If no glossary exists, stay quiet during ordinary work. Create or propose one only when the user asks to bootstrap or document the language.
3. Read the glossary before endorsing a domain-significant term. Treat explicit entries as the source of truth even when the document format is informal:
   - **Canonical term:** the default term for project language.
   - **Alias:** a recognized synonym, not the default unless its notes allow that use.
   - **Discouraged term:** a known source of drift that should be replaced in active scope.
   - **Open question:** an unresolved decision, not permission to guess.
4. Do not infer approval from common usage or the current implementation. If entries conflict or a concept is unresolved, state the ambiguity and propose a pending decision.

## Apply the Language

- Use canonical terms in active conversation, prose, identifiers, types, APIs, schemas, events, and tests. Apply the rule to internal and public names, not only documentation.
- Keep the default scope to proposed or touched files and nearby text needed for consistency. Do not start a repository-wide rename unless the user asks.
- Check meaning before replacing text. The same word can name different concepts, and similar words can mark important lifecycle or responsibility boundaries.
- Do not police ordinary technical language merely because it is absent from `DOMAIN.md`. The glossary governs domain concepts.
- Preserve required vendor, protocol, generated, migration, and compatibility terms. Translate them at an adapter boundary and use canonical language inside that boundary.
- Do not rename public, persisted, or serialized identifiers without accounting for compatibility and migration.
- When active work introduces a stable concept that the glossary does not define, propose a glossary update instead of silently declaring a canonical term.

## Resolve Findings

Classify a terminology issue by the decision it needs:

- **`drift`:** active usage conflicts with an approved canonical or discouraged term. Replace it where the meaning is equivalent.
- **`gap`:** the glossary lacks a real concept or a distinction needed by the work. Propose a pending entry; do not present it as approved.
- **`exception`:** non-canonical wording is required at an external or compatibility boundary. Keep it local and map it to the canonical term.

In an audit, inspect the requested scope and report exact occurrences. Do not report every accepted exception. Findings are guidance, not blockers, unless the user asks for enforcement.

## Maintain `DOMAIN.md`

When the user asks to add or normalize terms, use the existing structure when it is clear. Otherwise, use concise records:

```md
### Canonical Term
Definition: What the concept means and how it differs from nearby concepts.
Aliases: Recognized synonyms, if any.
Discouraged terms: Terms that cause ambiguity or drift, if any.
Notes: Scope, lifecycle, or boundary details needed for correct use.
```

Keep unresolved decisions under `Open Questions`. Do not move a proposed term into the approved vocabulary until the user or project authority resolves it.

## Response Shape

- During normal work, use canonical language and mention terminology only when it changes the recommendation or edit.
- For an audit, emit one actionable record per issue:
  - `type`: `drift` | `gap` | `exception`
  - `location`: exact file, symbol, or prose occurrence
  - `canonical`: approved term, if one exists
  - `observed`: conflicting or new term
  - `why`: one short explanation tied to the glossary meaning
  - `action`: exact replacement or `DOMAIN.md` update to make
- For a `gap`, include the proposed term, definition, aliases, discouraged terms, and open questions.
