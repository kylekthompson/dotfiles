# Interface Examples

Use these examples as anchors, not templates to copy blindly.

## 1. Module Boundary

Situation: ordering needs inventory to commit stock for an order.

Prefer:

```text
Inventory.reserve(order_id, order_lines) -> ReservationOutcome
```

Reject:

```text
InventoryService.update_stock(product_id, quantity_delta)
InventoryRepository.save(reservation_row)
```

Why: the preferred command names the domain action, hides persistence, and keeps the inventory invariant inside one boundary.

## 2. Bounded-Context API

Situation: billing needs fulfillment to stop shipment when an account enters collections.

Prefer:

```text
POST /accounts/{id}/shipping-holds
```

or an event such as:

```text
ShippingHoldPlaced(account_id, reason, placed_at)
```

Reject:

```text
PATCH /customers/{id} { "status": "blocked" }
```

Why: the preferred contracts preserve the business meaning at the boundary instead of flattening it into a vague status mutation.

## 3. Third-Party Adapter

Situation: shipping needs to buy labels from a carrier API.

Prefer:

```text
LabelPurchase.purchase(shipment) -> PurchasedLabel
```

Reject:

```text
CarrierClient.create_shipment(EasyPostShipmentRequest)
```

Why: the preferred internal interface keeps vendor types and transport rules at the edge so the rest of the system speaks in shipping language.

## 4. Abstraction Trap

Situation: both `pause_subscription` and `cancel_subscription` accept `account_id`, `effective_on`, and `reason`.

Prefer:

```text
PauseSubscription(account_id, effective_on, reason)
CancelSubscription(account_id, effective_on, reason)
```

Reject:

```text
ChangeSubscriptionStatus(account_id, status, effective_on, reason)
```

Why: the shared shape is not enough. Pause and cancel usually have different downstream rules, reversal behavior, and reporting semantics, so a generic status mutation hides the real invariant.
