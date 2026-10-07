# M2 — Shipping Quote Authority Foundation — 2026-10-02

Status: **SCHEMA/CONTRACT READY / ZERO ACTIVE RATES / PUBLIC SWITCH OFF**

> 2026-10-07 continuation: the owner chose configurable product shipping profiles and destination rates, calculated on the server before payment. The current GLOBAL-only foundation is not that implementation. See [the cart/delivery execution plan](M2_CART_DELIVERY_SERVICES_EXECUTION_PLAN_20261007.md) for versioned successors, calendars and acceptance criteria. Numerical examples remain drafts; a third-party carrier calculator is optional, and provider payment confirmation is a separate dependency.

This package advances the finite checkout path without inventing shipping prices.

## Why it exists

The public cart/legacy checkout code contains historical presentation values such as:
- standard shipping displayed as included;
- express shipping displayed as +45.

Those browser values are **not** approved transaction authority and must not be promoted into a payable total.

Current owner-approved shipping truth covers delivery timing:
- Standard international shipping: usually 10–14 business days.
- Express shipping: usually 7–10 business days.

It does **not** currently provide a canonical global EUR shipping charge.

## New authority model

Tables:
- `feya_commerce_shipping_rate_versions_v1`
- `feya_commerce_shipping_rate_heads_v1`
- `feya_commerce_shipping_quote_receipts_v1`

RPCs:
- `feya_commerce_shipping_quote_health_v1()`
- `feya_commerce_create_shipping_quote_v1(jsonb)`

Server route:
- `POST /api/commerce/shipping-quotes`

Feature gate:
- `FEYA_COMMERCE_SHIPPING_QUOTE_ENABLED=false`

## Rules

A browser request may provide only:
- idempotent request id;
- exact quote-bound order_intent_id;
- selected method: standard or express.

It may **not** provide:
- shipping amount;
- currency;
- total;
- provider amount.

The server derives currency/method from the immutable order intent and resolves the amount only from the current approved rate head.

## Deliberate zero-rate state

This migration seeds **no rate rows**.

Therefore after installation:
- schema_ready = true;
- active standard EUR rate count = 0;
- active express EUR rate count = 0;
- shipping_authority_ready = false;
- attempts to quote shipping fail with `shipping_quote_rate_not_configured`.

This is the correct state until one of these evidence paths exists:

1. Human Owner approves exact EUR standard/express rates for the storefront; or
2. Seller Online confirms a provider-side dynamic quote/payment model and a provider adapter supplies an authoritative amount.

No current UI number is silently adopted.

## Next finite step

Once exact shipping authority exists:

1. materialize approved rate version(s) or provider quote adapter;
2. create immutable shipping quote receipt;
3. combine the quote-bound merchandise intent + shipping quote into an immutable payable-order snapshot;
4. only then create a provider-neutral payment-session interface;
5. Seller Online adapter follows the exact confirmed integration mode;
6. callback/webhook proof + sandbox/test purchase;
7. live checkout activation.

Search Release, Product Truth and visual storefront are unchanged by this package.
