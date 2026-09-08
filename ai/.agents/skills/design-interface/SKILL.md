---
name: design-interface
description: Designs and reviews module and service boundaries. Use for responsibility placement, coupling or abstraction decisions, and interface design reviews.
---

# Design Interfaces

Keep independent concerns independently understandable. Choose where knowledge, decisions, invariants, and effects belong so that change stays local.

## Prefer Simple Over Easy

Simplicity means keeping concerns from being intertwined. Easy means familiar or convenient; it does not necessarily mean simple.

Judge the resulting system, not the brevity of the code or convenience of the tool. Fewer lines, methods, files, or abstractions do not by themselves make a design simpler. Prefer designs that require fewer concepts to be held in mind at once; additional code or components are useful when they genuinely separate concerns.

Identify what the design intertwines: policy with mechanism, information with behavior, or decisions with shared mutable state, timing, and call order. Remove unnecessary dependencies. Make necessary coordination explicit and give it a clear owner. Hiding complexity behind an interface can contain it without eliminating it.

## Assess Before Redesigning

Treat a smell as evidence to inspect, not proof that the design must change.

1. Inspect surrounding behavior, callers, implementations, domain language, and likely change. Do not diagnose from a pattern in isolation. Ask only about unknowns that can change the design.
2. Name the concrete cost: an obscured invariant, unclear ownership, invalid state, difficult change, hidden effect, coupling, or excess conceptual weight.
3. Find the smallest design that reduces that cost. Do not prescribe a pattern merely because it can fit.
4. Decide whether improvement belongs in the current scope. Fix it when it protects correctness, enables the requested change, or materially simplifies the touched boundary. Otherwise, contain it and proceed.

Preserve correct behavior and explicit invariants. Prefer conceptual simplicity, supported by clear ownership and locality of change. Accept duplication or a larger cohesive unit when either makes ownership clearer.

Make the change easy, then make the easy change: when intertwined concerns make the requested change difficult, first make the smallest behavior-preserving structural change that separates them, then implement the behavior. Verify existing behavior before and after the preparation, and verify the requested behavior separately. Judge the preparation by the complexity it removes, not merely by how easy it makes the next edit. If the change is already straightforward, make it directly.

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

1. **Simplicity:** Which concerns can be understood independently? What unnecessary coupling does this design remove rather than hide?
2. **Ease of change:** Which design keeps likely changes on one side?
3. **Semantic clarity:** Does the contract use precise domain language instead of storage, transport, framework, or vendor terms?
4. **Knowledge and coupling:** Does either side know field order, call order, timing, algorithms, or internal shapes that it should not know?
5. **Invariant and failure ownership:** Is one side clearly responsible for valid transitions, partial failure, and recovery?
6. **Abstraction fit:** Do shared cases have the same meaning and reasons to change?

Reject generic names such as `Manager`, `Service`, `Processor`, or `Handler` when they hide behavior. Also challenge generic CRUD operations, wide DTOs, positional argument lists, vendor objects, and interfaces that make callers run a multi-step protocol.

Reject pass-through layers, ports, repositories, factories, or events that own no decision or invariant and isolate no effect or source of change. Do not pay now for a hypothetical future requirement.

## Response Shape

Match the output to the decision. For a review, identify material smells, concrete costs, and the smallest useful improvement (or explain why no change is warranted). For a design, show enough of the contract, ownership, and failure behavior to make the recommendation usable. Include alternatives only for a material tradeoff and a safe migration step when recommending changes to an existing boundary. A small decision may need only a short paragraph, not a full design report.
