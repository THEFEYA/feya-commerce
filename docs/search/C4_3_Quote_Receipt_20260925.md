# C4.3-C — private quote receipt and server API

25 September 2026. This package implements the next **isolated** commerce layer after the C4.3-A readiness audit and C4.3-B pure quote contract.

It still does **not** promote any production offer, enable checkout/payment or alter public indexing.

## Contract

New private database objects are supplied as an **unapplied additive migration**:

- `feya_commerce_offer_revisions_v1` — immutable governed offer snapshot header; references an existing product/variant revision.
- `feya_commerce_offer_heads_v1` — mutable pointer to the current governed offer revision for a product.
- `feya_commerce_offer_variant_items_v1` — immutable exact tuple + exact monetary snapshot.
- `feya_commerce_quote_receipts_v1` — immutable idempotent server-quote receipts.

The quote service can SELECT the approved offer projection and INSERT a quote receipt only. It cannot insert/update/delete offer revisions or offer items. Anonymous/authenticated database roles receive no direct access.

The migration deliberately contains **no offer-promotion writer**. A future controlled release/promotion path must create offer revisions after Product Truth, exact tuple and price evidence are approved. This avoids quietly treating legacy display prices or C4.1 draft variants as active commerce truth.

## Quote RPC

`feya_commerce_create_quote_v1(jsonb)` is SECURITY INVOKER (default), service-only and fail-closed. It:

1. validates an exact nine-field request shape;
2. rejects client-supplied amount/currency/orderability fields;
3. locks the idempotency request key;
4. reads the current offer pointer and immutable offer revision;
5. checks active state, expected offer revision and expected product revision;
6. verifies the exact variant/configuration/color/size tuple against the stable C4 variant identity;
7. applies server-side quantity policy;
8. calculates the line amount from immutable server evidence;
9. writes one immutable quote receipt;
10. replays the same receipt for an identical retry and rejects a changed payload under the same request ID.

No arbitrary TTL was invented. `expires_at` is currently null; the quote is revision-bound and future order creation must revalidate the current offer before accepting it.

The response explicitly keeps `order_creation_enabled=false` and `payment_enabled=false`.

## Next.js boundary

`POST /api/commerce/quote` is server-only, no-store, same-origin, bounded to 32 KB and disabled unless `FEYA_COMMERCE_QUOTE_ENABLED=true`. The service-role credential never reaches the browser.

The route is not wired to ProductDetail/Cart/Checkout in this package. Existing visual/storefront components stay unchanged.

## Validation

New deterministic and database tests cover:

- private RLS/grants and non-security-definer functions;
- service role cannot promote/edit offers;
- exact quote happy path;
- idempotent replay and conflicting retry;
- monetary/capability field smuggling;
- stale product/offer revisions;
- wrong tuple / quantity over limit;
- hold pointer;
- injected receipt failure rollback + retry;
- immutable offer/quote history;
- permissions drift;
- native concurrent identical quote requests.

CI receives a dedicated PostgreSQL 17 `commerce-quote` suite.

## Rollback

Operational rollback revokes quote RPC execution and quote-receipt INSERT privilege. It does not delete immutable history.

## Remaining dependency

**C4.3-D:** implement the controlled offer-promotion/release writer that converts an approved variant/configuration/price decision into an immutable offer revision and atomically moves the offer head. Only after that proof should the storefront cart request real server quotes. Order persistence, payment provider, webhook/idempotency and refunds remain later gates.
