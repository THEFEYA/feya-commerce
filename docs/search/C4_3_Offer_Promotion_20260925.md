# C4.3-D — controlled offer promotion

25 September 2026. This package creates the **governed transition** between an internal Product/Variant revision and a quoteable commerce offer.

It remains unapplied to production and feature-flagged OFF in the application. It does not create an order, connect a payment provider, change public indexing or alter storefront visuals.

## Why a separate promotion layer is required

The C4.1 editor stores explicit color/size/configuration tuples as internal drafts. The C4.3-A audit proved that a visible/display price is not enough for commerce. C4.3-C then created immutable offer/quote infrastructure but intentionally supplied no writer capable of activating an offer.

C4.3-D closes that gap without giving the quote service direct mutation rights.

## Promotion contract

The application sends only:

- exact request UUID;
- canonical product ID;
- expected current variant revision;
- expected current offer revision;
- exact release ref;
- max quantity per line;
- explicit stable variant IDs.

The payload contains **no price, currency, orderability flag or approval hash**.

The database writer re-derives each monetary value from current authoritative configuration/price rows and refuses promotion unless:

- product is not held;
- selected variant exists in the exact current variant revision;
- tuple identity still matches the stable variant registry;
- variant is draft, not retired;
- color/size attributes used by the tuple are confirmed;
- pricing mode is the normal configuration base;
- sellable configuration is approved, public and non-sampler;
- price review is approved;
- price status is `approved` or `owner_reviewed`;
- fallback is false;
- public price is positive/exact;
- currency is supported by the deterministic minor-unit registry.

Explicit price exceptions remain HOLD until a separate verified-exception workflow exists. This is intentional; the system does not turn an unverified exception proposal into a chargeable amount.

## Exact human authority and Execution Gateway

`feya_commerce_promote_offer_v1` is the only writer in this package. It is a narrowly scoped SECURITY DEFINER RPC because the shared service role intentionally retains **no direct INSERT/UPDATE/DELETE privilege** on offer revisions, offer items or the offer head.

The RPC creates the canonical `PROMOTE_PRODUCT_OFFER` execution request, binds it to the exact payload/source revision/evidence hash, obtains the authenticated human approval through the existing approval function and records the resulting request/approval hash in the immutable offer revision.

If any later insert/change-event/outbox step fails, the whole transaction rolls back.

## Price revision behavior

A promotion snapshots exact minor-unit price evidence into the offer item.

If the same variant is promoted again with the same amount, currency, source mode and evidence fingerprint, its price quote ID/revision are reused. A changed price/evidence creates a new price quote ID and increments the price revision. Product/offer revision and price revision therefore remain independent.

## Application boundary

A new admin-only route is feature-flagged by `FEYA_COMMERCE_OFFER_PROMOTION_ENABLED=true`.

The route additionally checks:

- authenticated FEYA admin allowlist;
- same origin;
- product membership in the sealed 207-product source manifest;
- exact release ID from `closed-review-presentation-binding.json`.

So the database writer cannot be used by this application route to promote the excluded duplicate or an arbitrary release.

## Validation

A dedicated PostgreSQL 17 `offer-promotion` suite covers:

- security-definer isolation and no direct offer DML for service role;
- exact reviewed price/config promotion;
- canonical Execution Gateway approval hash;
- idempotent replay / conflicting retry;
- stale variant/offer revisions;
- price/configuration blockers;
- fallback/missing/unsupported currency;
- unverified exception hold;
- second revision + real quote RPC;
- immutable history;
- injected outbox rollback;
- native concurrent identical promotions.

## Next

**C4.3-E:** connect the admin price-readiness queue to a review/promote action only for rows that pass all gates, then update PDP/cart to request authoritative server quotes. Order persistence and provider payment remain separate later gates.
