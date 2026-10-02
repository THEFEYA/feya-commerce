# M2 — Quote-bound Order Intent Authority — 2026-10-02

Status: **ENGINEERING FOUNDATION IMPLEMENTED / PRODUCTION SWITCH OFF**

Canonical context:
- M1 commerce quote authority is already closed for the 207-product release.
- Search Release v12 is active independently.
- Seller Online provider role/API method is awaiting exact written confirmation.
- This package must not wait for a provider answer because it is provider-neutral and removes browser price authority from the future checkout path.

## Problem being removed

The historical checkout-draft function `feya_commerce_create_order_draft_v1` accepts browser-supplied
item amounts and totals. Those legacy drafts are not payment/order truth and must not be used to authorize
a transaction.

The old `CheckoutClient` is not mounted by the live catalog checkout route and its local/browser totals are
not promoted into the new authority path.

## New authority boundary

New contract:

`commerce_order_intent_v1`

Client input is limited to:

- idempotent request ID;
- 1–20 immutable server quote receipt IDs;
- contact/delivery text;
- shipping method choice.

The client cannot submit:

- item price;
- subtotal;
- currency;
- total;
- payment amount;
- provider session amount.

The database reconstructs every line from `feya_commerce_quote_receipts_v1` and revalidates that each receipt
still matches:

- the current offer head;
- an active offer revision;
- an active offer item;
- exact variant/configuration/color/size identity;
- exact current unit amount/currency;
- price quote ID/revision/source.

All quote receipts in one intent must have one currency and one commerce release reference.

## Intent state

A created intent is deliberately:

`quote_bound_shipping_pending`

It returns the server-authoritative merchandise subtotal, but:

- shipping amount = null;
- total amount = null;
- shipping authority ready = false;
- order creation enabled = false;
- payment enabled = false;
- provider session enabled = false.

This prevents the existing browser `+$45` express display or any other client total from becoming transaction authority.

## Provider boundary

Seller Online is not called from this package.

After Seller Online confirms the exact `thefeya.com` integration method:

1. add a governed shipping/payment total authority;
2. turn the quote-bound intent into an immutable payable-order snapshot;
3. create a provider-neutral payment-session interface;
4. add the Seller Online adapter for the confirmed mode only;
5. validate callback/webhook idempotency/signature/auth;
6. run provider-safe sandbox/test purchase;
7. only then enable live checkout.

## Rollout

Migration:
`supabase/migrations/20261002131500_commerce_order_intent_v1.sql`

Server route:
`POST /api/commerce/order-intents`

Feature switch:
`FEYA_COMMERCE_ORDER_INTENT_ENABLED=false`

The switch stays false after schema installation until exact production runtime evidence passes.

This package does not change the public visual storefront.
