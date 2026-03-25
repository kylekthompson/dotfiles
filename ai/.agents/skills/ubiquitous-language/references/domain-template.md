# `DOMAIN.md` Template

Use this structure when creating or normalizing a project glossary. Keep entries short, declarative, and domain-facing. Prefer one canonical term per concept. Default to a hybrid format: a compact index table for scanning, followed by detailed per-term records.

## Recommended Shape

```md
# Domain Language

## Index

| Canonical | Aliases | Discouraged |
| --- | --- | --- |
| Order | Purchase | Cart, Sale |
| Fulfillment Request | Shipping Request | Shipment Job |

## Approved Terms

### Order
Definition: The committed purchase record after checkout succeeds.
Aliases: Purchase
Discouraged terms: Cart, Sale
Notes: Use `Order` for APIs, events, and internal types after checkout.

### Fulfillment Request
Definition: The instruction sent to operations to fulfill an order.
Aliases: Shipping Request
Discouraged terms: Shipment Job
Notes: Use when the work item is about requesting fulfillment, not the warehouse process itself.

## Synonyms and Aliases

- Purchase -> `Order`
- Shipping Request -> `Fulfillment Request`

## Discouraged Terms

- Cart -> `Order` when checkout is complete.
- Sale -> `Order` when referring to the persisted record.
- Shipment Job -> `Fulfillment Request`

## Open Questions

- Do `Reservation` and `Hold` describe different lifecycle states, or are they synonyms?
```

## Authoring Rules

- Use `## Index` as a quick scan layer, not the source of nuance.
- Put the canonical term in an `###` heading under `## Approved Terms`.
- Keep the index row aligned with the detailed entry for the same concept.
- Keep `Definition` to one or two sentences.
- Record known synonyms in `Aliases`, even if they are acceptable shorthand.
- Record known sources of drift in `Discouraged terms`.
- Use `Notes` only for scope boundaries or lifecycle distinctions that prevent misuse.
- Use `## Open Questions` for unresolved concepts instead of pretending the vocabulary is settled.

## Pending Entry Shape

Use this shape when the skill finds a real concept gap:

```md
### Canonical Term
Definition: Short definition of the concept.
Aliases: Optional accepted synonyms
Discouraged terms: Optional drift terms to avoid
Notes: Optional scope or lifecycle nuance
```
