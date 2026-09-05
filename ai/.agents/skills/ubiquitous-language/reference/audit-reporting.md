# Terminology Audit Reporting

Inspect only the requested scope. Emit one actionable record per issue:

- `type`: `drift` | `gap` | `exception`
- `location`: exact file, symbol, or prose occurrence
- `canonical`: approved term, if one exists
- `observed`: conflicting or new term
- `why`: one short explanation tied to the glossary meaning
- `action`: exact replacement or `DOMAIN.md` update to make

For a `gap`, include the proposed term, definition, aliases, discouraged terms, and open questions. Keep proposals distinct from approved vocabulary. Do not report every accepted exception. Findings are guidance, not blockers, unless the user asks for enforcement.
