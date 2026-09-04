---
name: grilling-plans
description: Interrogates a rough plan through interactive choice and free-text dialogs until its material product and technical decisions are implementation-ready. Use when the user says "grill me," wants to stress-test an approach, or needs a decision-complete implementation brief.
builtin-tools:
  - ask_grill_question
---

# Grilling Plans

Read [reference/planning.md](reference/planning.md) before starting. It owns investigation, materiality, convergence, and the implementation brief. Apply the following Amp-specific presentation rules instead of its chat batching guidance while interactive UI is available.

## Ask Through the Interactive UI

- Call `ask_grill_question` for each material question, one at a time. Use the answer to decide whether the next question is still relevant.
- Give 2–5 distinct concrete options, with the recommended answer as an exact option value so the UI can preselect it.
- Explain the main tradeoff briefly. Put extended analysis in the final brief, not in the dialog.
- The UI accepts free text; treat that answer as authoritative rather than forcing one of the options.
- If the user cancels, stop asking and summarize the decisions and remaining blockers.
- If UI is unavailable, ask the fallback question in normal chat and continue with the shared planning policy.
