---
name: design-interface
description: Designs and reviews module and service boundaries. Use for responsibility placement, coupling or abstraction decisions, and interface design reviews.
---

# Design Interfaces

Choose where knowledge, decisions, invariants, and effects belong so that change stays local.

## Assess Before Redesigning

Treat a smell as evidence to inspect, not proof that the design must change.

1. Inspect surrounding behavior, callers, implementations, domain language, and likely change. Do not diagnose from a pattern in isolation. Ask only about unknowns that can change the design.
2. Name the concrete cost: an obscured invariant, unclear ownership, invalid state, difficult change, hidden effect, coupling, or excess conceptual weight.
3. Find the smallest design that reduces that cost. Do not prescribe a pattern merely because it can fit.
4. Decide whether improvement belongs in the current scope. Fix it when it protects correctness, enables the requested change, or materially simplifies the touched boundary. Otherwise, contain it and proceed.

Prefer correct behavior and explicit invariants, then locality of change, clear ownership, and conceptual simplicity. Accept duplication or a larger cohesive unit when either makes ownership clearer.

## Define the Boundary

Frame the caller, boundary, business capability, and key invariant. Name the change the boundary must absorb and distinguish local changes from those that must cross it. Sketch concrete contracts with names, inputs, outcomes, and failures using signatures, request/response shapes, or event schemas as appropriate.

When responsibility placement is unclear, compare 2-3 viable options that differ in what each side knows and owns, not merely syntax. Recommend the smallest useful design using the principles below.

## Place Responsibilities

- Give each business invariant, decision, and effect one owner. Do not make both sides coordinate the same rule.
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

Reject pass-through layers, ports, repositories, factories, or events that own no decision or invariant and isolate no effect or source of change. Do not pay now for a hypothetical future requirement.

## Response Shape

Match the output to the decision. For a review, identify material smells, concrete costs, and the smallest useful improvement (or explain why no change is warranted). For a design, show enough of the contract, ownership, and failure behavior to make the recommendation usable. Include alternatives only for a material tradeoff and a safe migration step when recommending changes to an existing boundary. A small decision may need only a short paragraph, not a full design report.
