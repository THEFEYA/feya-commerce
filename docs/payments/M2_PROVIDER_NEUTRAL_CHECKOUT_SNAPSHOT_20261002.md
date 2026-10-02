# M2 — Provider-neutral Checkout Snapshot — 2026-10-02

Status: **FOUNDATION IMPLEMENTED / REQUIRES SHIPPING AUTHORITY / PUBLIC SWITCH OFF**

This is the next finite package after:
- exact server merchandise quotes;
- quote-bound order intent;
- exact policy acknowledgement;
- server-owned shipping quote foundation.

## Contract

`commerce_checkout_snapshot_v1`

Client input contains only:
- request ID;
- order intent ID;
- shipping quote receipt ID.

It cannot submit:
- item amount;
- subtotal;
- shipping amount;
- currency;
- total;
- payment amount.

## Server revalidation

Before a checkout snapshot is persisted, the server revalidates:

1. order intent exists and remains in `quote_bound_shipping_pending`;
2. explicit policy acknowledgement exists;
3. accepted policy hash still equals the current checkout policy bundle;
4. shipping quote belongs to that exact intent, method and currency;
5. shipping quote is not expired;
6. every merchandise quote receipt still binds to the current offer head, active offer revision and active exact variant item;
7. recomputed merchandise subtotal exactly equals the immutable order-intent subtotal.

Only then is:

`total = merchandise_subtotal + shipping_amount`

computed server-side.

## Deliberate boundary

The resulting snapshot is:

`provider_pending`

and explicitly records:

- transaction_party_bound = false;
- order_creation_enabled = false;
- payment_enabled = false;
- provider_session_enabled = false.

Therefore an exact total is still **not** a live order or payment instruction.

## Why this can be built before Seller Online replies

The snapshot is provider-neutral. Seller Online's exact API/link integration and legal role do not change:
- current variant/price authority;
- accepted policy bundle;
- shipping quote identity;
- exact total arithmetic.

Seller Online becomes relevant only at the next boundary: binding a transaction party/provider and creating a payment session.

## Blocker before runtime success

The shipping foundation currently seeds zero active rates, so no shipping quote can yet be created.

Next evidence required:
- exact Human Owner-approved EUR standard/express rates; or
- a verified Seller Online/provider dynamic quote method.

No historical browser shipping number is adopted automatically.
