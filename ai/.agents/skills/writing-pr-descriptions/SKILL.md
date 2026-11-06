---
name: writing-pr-descriptions
description: Writes concise, conversational, rationale-first pull request titles and descriptions. Use when drafting or updating a PR title or description.
---

# Writing PR Descriptions

Write a note to a teammate who knows the codebase, not a report about work completed.
Compose the title and optional body as one explanation: the concrete change,
why this approach, and anything that affects whether or how it should land.

## Before writing

Read the diff and relevant context. When updating a PR, read its current
description and preserve others' contributions. Identify the actual behavior
change, motivation, and any meaningful tradeoff or scope boundary. Do not fill in
missing facts with a plausible story. Follow required repository templates, but
otherwise do not impose a template.

## Write the title and body together

Lead with a plain, usually verb-led title naming the concrete change, rule, or
distinction. Keep a condition or rationale in the title when it makes the title
more useful. Prefer specificity over an arbitrary character limit. Do not add
conventional-commit prefixes unless the repository requires them.

The body continues the title rather than restarting the explanation. Add only
the context, reasoning, evidence, or caveats that are still missing.

## Choose the amount of explanation

- Small, obvious change: one sentence is often enough. If the title already says
  what changed, use the body for the reason rather than restating it. A relevant
  link or no body can be enough when there is genuinely nothing to add.
- Bug fix: explain the triggering condition and what went wrong, then the change
  that addresses it. Name the specific behavior, not just "fixes an issue."
- Design choice: explain the constraint and why this approach fits. Mention a
  rejected alternative only when it helps the reviewer judge the decision.
- Incremental work: say what this piece enables, what it does not handle yet,
  and any known follow-up or rollout ordering that matters.
- Subtle or risky change: spend the words it needs. Include concrete examples,
  measurements, reproduction output, or testing limitations when relevant and
  actually known. Concise does not mean omitting important reasoning.

These are choices, not sections to fill out. Stop when the reviewer has what they
need; do not add a conclusion that repeats it.

## Voice and formatting

- Use plain, direct, conversational engineering prose. Contractions and natural
  "I"/"we" are welcome. Prefer "We need this to..." to abstract benefits.
- Use concrete names and causal links: "When...", "Without this...", "because...",
  "Instead...", "Notably...". Do not mechanically insert these phrases.
- Match confidence to evidence. "I think" belongs on a real inference, not every
  claim. State established behavior directly.
- Use short paragraphs by default. Use bullets for genuinely distinct behaviors,
  cases, or remaining work, not a file-by-file or commit-by-commit inventory.
- Do not add routine Summary / Changes / Testing / Risks headings, checklists,
  or empty sections. Headings are useful for actual before/after evidence or a
  genuinely long description, not as decoration.
- Put identifiers in backticks. Link related PRs or discussions when useful.
- For changes that can be shown visually, include relevant screenshots or
  recordings when you have them or can easily produce them. Use screenshots for
  appearance and short recordings for interactions.
- Avoid sales language and vague claims such as "robust", "seamless", "enhances
  maintainability", or "comprehensive testing". Say what actually changes.
- Do not manufacture personality: no obligatory emoji, jokes, apologies, slang,
  hedging, or intentional typos. The informality is incidental, not the goal.
- Never invent conversations, observations, tests run, deployment state, links,
  or promises of follow-up. Distinguish verified facts, hypotheses, and plans.

## Fictional examples

These examples are invented, not excerpts or anonymized accounts of real PRs.
Use their structure and level of detail, not their facts.

### Title only

**Title:** Preserve blank lines when copying a selection

No body is needed if the title and diff supply all relevant context.

### Minimal reason

**Title:** Read author names from document metadata

**Body:** We need this to group the export by author.

### Bug mechanism

**Title:** Resolve image paths relative to the document, not the working directory

**Body:** Opening a document from another directory breaks its relative image
paths. This uses the document's parent directory as the base so those paths resolve
the same way regardless of where the command runs.

### Scope boundary

**Title:** Add validation for bookmark imports

**Body:** Only checks that the file has the expected columns for now. It doesn't
validate individual URLs yet.

### Rationale that merits more space

**Title:** Keep export settings in the document instead of a separate config file

**Body:** A separate config file makes it easy to export the same document with
different settings, but it also means the document isn't enough to reproduce the
output. Moving or sharing it can silently pick up different defaults.

Keeping the settings with the document makes the export self-contained. This does
mean changing the document to change the output format, which seems like an okay
tradeoff for now.

## Final pass

Remove sentences that merely narrate the diff or assert generic benefits. Keep
the reason, consequential details, and honest limits. Return the description
and/or title requested, without "Here's a PR description" or an explanation of
the writing style.
