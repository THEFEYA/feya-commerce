# M2 — Checkout Preflight v2, immutable destination & policy snapshot (PRIVATE)

2026-10-09. Finite engineering successor to PR #85 structured buyer address, PR #80 immutable shipping quote v2, PR #97 private carrier source evidence, and PR #98 exact merchandise/handling breakdown. Main tracking [Issue #81](https://github.com/THEFEYA/feya-commerce/issues/81). ACTIVE Search v12 and current product/visual/SEO contracts remain FROZEN.

## Implemented facts

`supabase/migrations/20261009213500_commerce_checkout_preflight_private_v2.sql` adds:
- **Service-role-only, RLS-locked, immutable** `feya_commerce_checkout_preflights_v2` with separate private full structured destination and consent/basket hashes. There is no public RPC grant, contact form, browser/API route, customer login dependency or analytics PII event.
- `feya_commerce_create_checkout_preflight_v2(jsonb)` rejects browser totals, amounts, promo/discount/tax/flags; requires a versioned `commerce_checkout_destination_v2` address and explicit `accepted:true` for the current authoritative policy-bundle SHA.
- In one PostgreSQL transaction: lock exact shipping-v2 receipt, reject stale/different country/postal/method/basket/hash, share existing owner-delivery lock and compare current approval head, lock current offer heads, re-read `feya_commerce_approved_delivery_context_v1` for current active prices/configs/catalog, bind the currently active `feya_commerce_checkout_policy_bundle_v1()`, sum EUR merchandise + one quote shipping + **€5 per extra DISTINCT canonical listing**. Both request and recorded response are idempotent and replay-safe.
- Actual buyer address/email are stored privately only after the surrounding runtime gate is consciously activated, not echoed in the returned RPC receipt. The safe response contains only hashes, versions, subtotal and review statuses, no personal contacts.
- Exactly **no final tax, discounts, provider fee or amount due are fabricated**: `taxes_minor=null`, `discount_minor=null`, `provider_fees_minor=null`, `amount_due_minor=null` and `carrier_proof_complete=false`. `payable=false`, `payment_enabled=false`, `order_creation_enabled=false`, `provider_session_enabled=false`. This is NOT a purchase contract, not tax eligibility, not consumer checkout.
- All table UPDATE/DELETE attempts fail by immutable trigger; service can SELECT/INSERT, anon/authenticated cannot see PII or execute any new RPC. RLS & privilege health intentionally returns 0 rows by default.

`lib/commerceCheckoutPreflightV2.ts` normalizes/restricts every request, rejects mixed/blocked/unserved inputs and strictly parses nonpayable response. `lib/commerceCheckoutPreflightV2Server.ts` has **no public route** and requires BOTH `FEYA_COMMERCE_CHECKOUT_PREFLIGHT_V2_ENABLED=true` and verified privacy-controller `FEYA_PRIVACY_CONTROLLER_CONFIRMED=true`. Both are **false until human legal approval**.

Native Postgres and PGlite isolated tests exercise exact immutable shipping receipt, policy hash, private PII storage (synthetic only), duplicate ID conflicts, replay, blocked countries, unapproved/expired quote, head drift, role boundaries and native concurrent writes. The isolated fixture provides a **test-only** dummy policy function; live production uses the real versioned business-truth policy service. This package does not auto-update existing policy prices/text.

## Real blockers to first paid order — unchanged and cannot be ignored

1. Owner-approved served countries/rates and real API evidence from outbound Ukrposhta or Nova Post by exact route, country/postcode, method and parcel class; actual package weight/dimensions for bulky items; per-method carrier recheck **at payment-session creation**, not merely when this private preflight was created. Carrier source tables in production currently have 0 observations and 0 mappings.
2. Tax, consumer delivery remedies/withdrawal, EU GPSR manufacturer & EU representative info where applicable, applicable actual contracting seller and privacy-controller disclosure. Current `/terms` and `/privacy` disclose the **prospective** Seller-Online LLC partner, not the user's legal trader identity. See [Issue #100](https://github.com/THEFEYA/feya-commerce/issues/100).
3. Seller Online account/KYC+API v2 credentials, exact actual payment authority and trusted webhook/partial refund/chargeback/idempotency proof before `amount_due` or `payable` can ever be enabled.
4. No buyer PII is to be inserted from the live UI until privacy controller and retention/legal basis are confirmed and the guarded public checkout is deliberately reviewed.

## Next narrow engineering slices

- Owner-reviewed per-parcel class and source freshness gate — no blanket ordinary class for 207 items, and no 209-country import as payable.
- Provider-neutral nonpayable checkout total snapshot v2 deriving actual country-dependent taxes/services/discount, after appropriate legally confirmed authority; then approved Seller Online API v2 order/payment session and replay-safe webhook reconciliation.
- Only AFTER first verified completed guest purchase: carrier event tracking, optional customer login/favourites/coupons/recovery, as in `docs/payments/M2_CUSTOMER_LIFECYCLE_OWNER_ADDITIONS_20261009.md`.

**No action required from owner for installing this infrastructure.** External credentials, legal facts and approval of exact live carrier services remain future specific owner/provider gates.
