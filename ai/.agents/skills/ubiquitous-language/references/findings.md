# Findings Examples

Use these examples as formatting anchors for audit mode. Keep findings short, concrete, and tied to `DOMAIN.md`.

## `drift`

```text
type: drift
canonical: Order
observed: Cart
why: `DOMAIN.md` defines `Order` as the committed purchase record after checkout and lists `Cart` as discouraged in that state.
action: Rename `CartSummary` to `OrderSummary` in the touched files and update any nearby prose that refers to the persisted record.
```

## `gap`

```text
type: gap
canonical: Fulfillment Hold
observed: Warehouse Pause
why: The conversation introduces a recurring operational concept that is not defined in `DOMAIN.md`, so the glossary cannot distinguish it from other hold states yet.
action: Add a pending `Fulfillment Hold` entry to `DOMAIN.md` and use that term consistently in the touched files until the definition is confirmed.

pending_entry:
  term: Fulfillment Hold
  definition: A temporary state that prevents fulfillment from starting while an order-level issue is being resolved.
  aliases: Warehouse Pause
  discouraged_terms: Pause Flag
  open_questions: Does this state block payment capture, or only warehouse execution?
```

## `exception`

```text
type: exception
canonical: Customer
observed: Stripe Customer
why: The identifier names a third-party object and should preserve the vendor's contract term rather than forcing the internal domain term.
action: Leave the vendor-facing identifier as-is, but use the canonical internal term everywhere outside the adapter boundary.
```

## Output Rules

- Prefer one finding per issue instead of batching unrelated terminology problems together.
- Keep `why` to one sentence.
- Make `action` specific enough that a follow-up edit is obvious.
- Emit `exception` only when the distinction matters; otherwise, silently tolerate allowed exception buckets.
