---
name: ubiquitous-language
description: Use in projects that keep domain vocabulary in `DOMAIN.md` to apply the approved ubiquitous language during naming, refactoring, review, documentation, API or schema design, and terminology audits. Trigger when work introduces or changes domain terms, when active code or docs may drift from `DOMAIN.md`, or when the user wants to review, update, normalize, or bootstrap the glossary.
---

# Ubiquitous Language

Keep project language aligned with `DOMAIN.md`. Stay quiet during ordinary work, then switch into an explicit audit only when drift, gaps, or a direct terminology request make the language decision important.

## Workflow

1. Locate the glossary.
   - Look for the nearest ancestor `DOMAIN.md` from the current workdir.
   - If none exists there, fall back to a repo-root `DOMAIN.md`.
   - If no `DOMAIN.md` exists anywhere, do nothing unless the user explicitly asks to bootstrap or document the ubiquitous language. For bootstrap work, read `references/domain-template.md`.
2. Choose a mode.
   - Use normal mode for naming, refactoring, review, documentation, API or schema work, and when the conversation introduces unfamiliar domain nouns.
   - Use audit mode when the user explicitly asks to review or update terminology, or when the current conversation or touched code or docs show conflicts or missing concepts.
   - Keep the default audit scope to the current conversation and active proposed or touched code or docs. Do not expand to a whole-repo sweep unless the user asks.
3. Read `DOMAIN.md` conservatively.
   - Treat `DOMAIN.md` as canonical.
   - Prefer explicit approved terms, aliases, discouraged terms, and open questions over free-form interpretation.
   - Tolerate minor formatting drift. If the file is too loose to parse confidently, propose normalizing it with `references/domain-template.md` instead of inventing policy.
   - If a concept is unresolved in `DOMAIN.md`, avoid presenting a guessed term as settled. Surface the ambiguity and propose a pending entry.
4. Apply terminology pressure.
   - Use canonical terms in new prose, code, APIs, schemas, and review feedback.
   - Enforce terminology across all identifiers in active scope, not just public surfaces.
   - Allow explicit exceptions for vendor or third-party terms, compatibility shims, migration code, generated code, and obviously throwaway test fixtures.
   - Prefer changes in already touched files. Do not chase terminology into untouched files unless the user explicitly asks for a broader refactor.
5. Resolve issues.
   - Classify mismatches as `drift`, `gap`, or `exception`.
   - `drift`: a non-canonical or discouraged term conflicts with an approved term in `DOMAIN.md`.
   - `gap`: a real concept is missing from `DOMAIN.md`.
   - `exception`: local usage is acceptable because it falls into an allowed exception bucket; mention it only when the distinction matters.
   - When a new concept is real, propose a pending glossary entry with canonical term, short definition, aliases or synonyms, discouraged terms, and open questions.

## Defaults

- Optimize for quiet guidance first. Do not turn normal implementation work into a glossary lecture.
- Prefer the canonical domain term even when an implementation synonym feels shorter or more familiar.
- Treat code, docs, review comments, and architecture language as one vocabulary system.
- If `DOMAIN.md` is absent, stay silent unless the user explicitly asks to create or maintain it.
- If the conversation introduces a term that looks domain-significant but not obviously canonical, check `DOMAIN.md` before endorsing it.

## Response Shape

- In normal mode, adopt the canonical language and mention terminology only when it affects the recommendation or edit.
- In audit mode, emit structured findings using this shape:
  - `type`: `drift` | `gap` | `exception`
  - `canonical`: approved term, if one exists
  - `observed`: conflicting or new term
  - `why`: one short rationale tied to `DOMAIN.md`
  - `action`: exact replacement or `DOMAIN.md` update to make
- For `gap`, include a pending glossary entry with canonical term, definition, aliases, discouraged terms, and open questions.
- Treat findings as actionable guidance, not hard blockers, unless the user explicitly asks for gatekeeping.

## References

- Read `references/domain-template.md` when bootstrapping a missing `DOMAIN.md`, normalizing an existing one, or drafting a pending glossary entry.
- Read `references/findings.md` when you need concrete examples of `drift`, `gap`, or `exception` outputs.
