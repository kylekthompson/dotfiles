---
name: coordinating-complex-rollouts
description: Loads the unified delivery workflow for an existing plan or user request that names coordinating-complex-rollouts. New delivery plans should use delivery-cockpit:delivering-changes directly.
---

# Coordinate Complex Rollouts

Load `delivery-cockpit:delivering-changes` and use its **Complex Rollouts** section when operational coordination is needed. Continue in the invocation thread; this compatibility entry point does not create another owner or workflow.

The unified skill owns dispatch, publication authorization, verification, rollout gates, and completion criteria. Its `reference/scenarios.md` contains the delivery and rollout evaluation cases.
