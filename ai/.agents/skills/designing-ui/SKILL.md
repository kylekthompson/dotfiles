---
name: designing-ui
description: Improves visual composition, hierarchy, and interaction quality while creating, changing, or reviewing web and native interfaces. Use for UI work even without an explicit design request, including screens, components, forms, dashboards, layouts, styling, and visual polish; not for backend-only work or module/API interface design.
---

# Designing UI

Make the interface clear, coherent, and appropriate to its users. Apply design judgment during ordinary implementation, not as a separate command or a cleanup phase the user must request.

## Start From the Product

Inspect the affected screen and comparable interfaces, rendering the existing UI when practical. Read the actual components and tokens. Understand who uses the screen, what they need to decide or do, and which information supports that task. Use repository guidance and existing product behavior to resolve choices; ask only about missing product decisions that materially change the outcome.

An established product's visual language takes precedence over generic aesthetic preferences. Do not replace its typography, colors, density, or interaction conventions to make a change look novel. For a new interface, choose a coherent direction appropriate to its audience rather than assembling fashionable effects. A clinical worklist and a promotional landing page need different design decisions.

Keep this work proportional. A small edit needs a focused composition check, not a design brief. For a substantial layout or workflow change, consider genuinely different arrangements and briefly explain the chosen hierarchy. Use available visual exploration tools when useful, but do not require commands, design documents, or approval rounds before ordinary implementation. Review-only requests remain reviews.

## Compose Before Decorating

- **Hierarchy:** Make the primary subject and next action apparent. Group supporting information by meaning, and subordinate secondary actions. If everything is bold, colored, or boxed, nothing is prominent.
- **Structure:** Choose a layout that supports the task. A comparison may need aligned rows; an edit flow may need grouped fields; a detail view may need a summary beside supporting material. Do not automatically turn every datum into a card.
- **Spacing and alignment:** Use shared spacing tokens and clear relationships: related items closer together, distinct sections farther apart. Align labels, values, controls, and repeated rows to a common structure. Check the whole affected composition, not just the new element.
- **Typography:** Give headings, body text, labels, and metadata distinct but restrained roles. Use readable sizes, line heights, and line lengths. Align comparable numbers and use tabular numerals where appropriate. Fix hierarchy before shrinking text to fit.
- **Color and surfaces:** Use contrast and emphasis to communicate importance, state, or grouping. Borders, shadows, gradients, and backgrounds must earn their place. Neither default fonts nor neutral colors are inherently wrong; arbitrary bans are not design judgment.
- **Density:** Fit the work, not a template. Repeated operational data can be compact without being cramped; generous space should clarify grouping rather than strand content. Prefer useful alignment and progressive disclosure over either a wall of controls or oversized empty cards.
- **Copy and controls:** Use concise labels that identify actions and outcomes. Remove redundant headings and instructions; do not use explanatory prose to compensate for confusing structure. Keep important actions discoverable rather than hiding them merely to simplify the screenshot.
- **Motion and imagery:** Use them to explain change, orient the user, or support the content. Avoid effects added only to make the UI appear designed. Respect reduced motion and do not introduce assets or dependencies without a real need.

## Design Beyond the Ideal Screenshot

Use plausible content lengths and counts. Check relevant long names, missing values, many items, empty and loading states, validation errors, and pending or disabled actions. Preserve important information when space becomes constrained; do not truncate or hide it simply to make a layout fit.

Adapt the composition at representative sizes, not just the outer width. Watch for competing scroll regions, clipped menus, awkward wrapping, and controls separated from what they affect. Check supported themes and platform-specific concerns where applicable; browser emulation is not native verification.

Preserve semantic controls, visible focus, logical keyboard order, meaningful labels, sufficient contrast, text scaling, and appropriate hit targets. Do not communicate state by color alone or make actions available only on hover. A static mockup cannot establish accessible interaction behavior.

## Critique the Rendered Result

Render the implemented interface and exercise changed interactions. Inspect the whole affected area and relevant non-default states. Passing tests, reading source, or generating a concept image does not establish visual quality.

Judge the result against the task rather than defending the implementation:

- Is it immediately clear what matters and what the user can do next?
- Does the eye follow the intended hierarchy, or do incidental controls and decoration dominate?
- Are spacing, alignment, type, and density coherent with neighboring content and the product?
- Is anything cramped, noisy, awkwardly empty, clipped, or difficult to read with realistic content?
- Did the layout make the task easier, or merely make the screenshot more attractive?

For implementation work, fix the most consequential issues within scope and inspect again. Prioritize structure and hierarchy before cosmetic details. Do not leave obvious defects as suggested future polish, and do not expand the task into an unrelated redesign. Stop when the affected composition is coherent and the relevant checks pass, not when every possible variation has been explored.

For completed implementation, include an inspected screenshot or preview and briefly name the sizes, states, and interactions checked. For review-only work, report findings and verification limits without implementing fixes; exploration-only work need not produce an implemented interface. Use synthetic or non-sensitive data. Clearly distinguish implemented UI from generated concepts, and disclose rendering blockers or native-verification gaps rather than claiming unobserved quality.
