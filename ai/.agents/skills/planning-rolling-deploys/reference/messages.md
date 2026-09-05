# Jobs and Persisted Messages

## Inventory

Inspect affected payloads and job types, queues, scheduled entries, outbox/event records, persisted cache entries, and serializers. Identify producers, consumers, routing, and maximum scheduled, retry, dead-letter, replay, and rollback horizons. Treat positional arguments, serialized class names, implicit defaults, and tolerance for missing or unknown fields as contract details.

## Design

- Deploy tolerant consumers before producers emit a new format.
- Prefer named additive optional fields with explicit defaults, after verifying serializer behavior.
- Do not change positional argument meaning in place. Use a payload version or new job type when meaning changes or readers are strict.
- Do not enqueue a new job type while an incompatible worker can reserve it; wait for rollout or isolate its queue.
- Retain old consumers until ready, scheduled, retry, dead-letter, replay, and rollback horizons have drained.
- Make overlapping old/new jobs idempotent at a stable business boundary.
- Test delayed jobs against the schema state in which they can execute. If storage also changes, read [Database contracts](database.md).

## Focused Checks

- Deserialize current payloads with target consumers and the reverse when reachable.
- Enqueue before deploy and execute after deploy.
- Prove incompatible workers cannot reserve target jobs.
- Test retries, delays, duplicate delivery, and replay when relevant.
- Simulate rollback after producer activation, including messages already persisted in the target format.
