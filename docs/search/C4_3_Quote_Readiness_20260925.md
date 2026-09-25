# C4.3-A — authoritative quote readiness audit

25 September 2026. This is the first C4.3 package after the sealed 207-product closed review. It is intentionally **read-only against production** and does not enable checkout, payment, public indexing or variant promotion.

## Why this package exists

The storefront currently contains display prices and legacy local-cart/checkout components, but a display amount is not automatically an authoritative server quote. FEYA's canonical rule is stricter: the selected configuration/variant must exist, its price must be explicitly approved and exact, the configuration must itself be reviewed, fallback/range values must not be borrowed, and the server must revalidate the current revision before an order can be created.

Connecting payment before this evidence exists would violate Product Truth, the C4 variant contract and the pre-index commerce gate.

## Read-only production audit

Project checked: FEYA production Supabase `ysnizcgzhdwdfdkjkhud`. No writes or migrations were executed.

Observed current state:

- `feya_commerce_configuration_prices`: **1,170 rows**.
- `feya_commerce_sellable_configurations`: **460 rows**.
- Strict C4.3 quote-readiness gate (approved configuration + public candidate + non-sampler + approved price review + `price_status in ('approved','owner_reviewed')` + non-fallback + positive public price + valid currency): **5 configuration-price rows across 2 products**.
- One additional row has `price_status='owner_reviewed'` and `review_status='approved'`, but its sellable configuration is still `not_reviewed`; it remains **HOLD**, not quote-ready.
- Production does **not** currently contain `feya_commerce_variant_heads_v1`, `feya_commerce_variant_revisions_v1`, `feya_commerce_read_variant_draft_v1` or `feya_commerce_save_variant_draft_v1`. This is consistent with the intentional decision not to apply the C4.1 migration to production yet.
- Legacy `feya_commerce_order_drafts` / `feya_commerce_order_draft_items` currently contain one saved draft/item. These tables are not payment truth and are not evidence that checkout is production-ready.

The five rows that pass the configuration-price gate belong to only two products. This does **not** mean those products are orderable yet: exact color/size/configuration tuples and a released active variant revision are still required.

## New deterministic gate

`lib/commerceQuoteReadiness.ts` now classifies configuration-price evidence before it may enter the server-quote stage.

It deliberately refuses to:

- infer an exact price from source/range values;
- borrow a fallback price;
- treat `draft` / `needs_review` as equivalent to approval;
- treat an approved price as sufficient when the sellable configuration is not approved;
- auto-promote a sampler or non-public configuration;
- create or activate a variant;
- declare checkout enabled.

The gate consumes the already existing configuration/price authority fields and returns deterministic reason codes. It does not add a parallel product or price master.

## Important implementation finding

The current legacy cart/checkout UI must remain non-authoritative. It stores client-side price values and the checkout component posts to `/api/checkout/drafts`, which does not exist on the current branch. Its safe-preview wording is therefore accurate; it must not be converted into payment simply by adding a provider button.

The current cart also contains legacy hard-coded delivery presentation. C5 will replace those values only from approved Business Truth; they are not used by C4.3 quote readiness.

## C4.3-B — next engineering package

The next package should stay isolated from production and add the actual quote/orderability projection:

1. promote only explicitly reviewed variant tuples into an immutable quoteable revision; draft/retired tuples remain unavailable;
2. bind each active tuple to exactly one verified configuration quote or one explicit verified exception;
3. create a server quote request using stable `canonical_product_id`, `variant_id`, `configuration_price_id`, product revision and quantity;
4. return quote ID, price revision, exact minor-unit amount, currency and expiry/version context;
5. make cart lines store stable IDs and the returned quote, never trust the browser price on checkout;
6. revalidate quote + variant + product revision at order creation; stale/retired/changed price fails explicitly instead of silently changing;
7. persist a sandbox order line only after server validation; payment remains OFF until provider/webhook/idempotency work is completed;
8. keep the 207-product sealed review and all existing visual components unchanged.

## Rollback / release status

This package adds only pure code, tests and documentation. No production schema/data/environment/indexing/payment mutation is included. Rollback is a normal code revert; there is no database rollback.

C4.3 is **not done** after this package. The result is a verified fail-closed input gate and a measured readiness baseline. C4.3-B is the next implementation step.
