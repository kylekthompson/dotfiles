---
name: design-interface
description: Designs and reviews interfaces between modules, bounded contexts, services, adapters, and public APIs. Use when assigning responsibilities, comparing boundary options, reducing coupling, preserving domain language, or deciding whether workflows share an abstraction.
---

# Design Interfaces

Choose where knowledge, decisions, invariants, and effects belong so that change stays local.

## Define the Boundary

1. Inspect existing callers, implementations, domain terms, and change patterns before asking questions. Ask only about unknowns that can change the design.
2. State the caller, the boundary, the business capability, and the key invariant. Assign each decision and effect to one owner.
3. Name the change that the boundary must absorb. Separate changes that should stay local from changes that must cross the boundary.
4. Sketch concrete contracts with names, inputs, outcomes, and failures. Use signatures, request and response shapes, or event schemas as appropriate.
5. When responsibility placement is not clear, present 2-3 viable options. Vary what each side knows and owns; do not create options that differ only in syntax.
6. Recommend one design. Explain the main tradeoff, the strongest rejected alternative, and the first safe migration step for an existing boundary.

## Place Responsibilities

- Give each business invariant one owner. Do not make both sides coordinate the same rule.
- Keep contracts small and explicit. Accept inputs at the caller's level of knowledge. Let the boundary own call order, retries, timing, and lifecycle transitions that protect its invariant.
- Use domain actions for commands, domain facts for events, and explicit business concepts for queries. Return business outcomes instead of internal state.
- Keep policy and classification separate from I/O where practical. Put database, framework, transport, queue, and vendor details behind adapters at the edge.
- Make invalid states hard to express. Define preconditions, postconditions, idempotency, and failure ownership when they affect correct use.
- Preserve domain meaning at external boundaries. Adapt transport shapes without letting them define the internal model.
- Share an interface only when cases enforce the same invariant or change together. Similar fields, signatures, or current implementations are not enough; accept duplication until the shared meaning is clear.

Prefer `Inventory.reserve(orderId, lines) -> ReservationOutcome` over `InventoryService.updateStock(productId, delta)` when inventory owns the reservation rule.

## Compare Options

Evaluate options in this order:

1. **Ease of change:** Which design keeps likely changes on one side?
2. **Semantic clarity:** Does the contract use precise domain language instead of storage, transport, framework, or vendor terms?
3. **Knowledge and coupling:** Does either side know field order, call order, timing, algorithms, or internal shapes that it should not know?
4. **Invariant and failure ownership:** Is one side clearly responsible for valid transitions, partial failure, and recovery?
5. **Abstraction fit:** Do shared cases have the same meaning and reasons to change?

Reject generic names such as `Manager`, `Service`, `Processor`, or `Handler` when they hide behavior. Also challenge generic CRUD operations, wide DTOs, positional argument lists, vendor objects, and interfaces that make callers run a multi-step protocol.

## Response Shape

- Frame the caller, boundary, owned decisions, owned effects, and key invariant in one short paragraph.
- Present concrete options only when there is a material responsibility tradeoff.
- Recommend one interface and explain why it best localizes change.
- State what the caller knows, what the boundary owns, and what stays hidden.
- Show the contract and relevant invariants, preconditions, postconditions, and failure behavior.
- Name the most important rejected alternative and why it is worse.
- For an existing boundary, end with the first safe refactor or migration step.
