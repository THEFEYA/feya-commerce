# M2 — server-owned cart merchandise + shipping + extra-listing handling breakdown

Checkpoint 2026-10-09. **Issue #81 execution**, after PR #97. This package reuses the current exact merchandise quote receipts and owner-approved delivery resolver; it is **not** a new pricing system, payment integration, public UI, or change to ACTIVE Search v12 / the visual freeze.

## Implementation

- `lib/commerceCartCostBreakdown.ts` accepts only immutable quote receipt IDs, ISO destination country/postal and one cart-wide Standard or Express choice. Money/taxes/discounts, customer PII and fee claims are rejected if provided by browser.
- Calls the existing `feya_commerce_approved_delivery_context_v1` **once**, capturing the same validated DB merchandise context already used by `resolveApprovedDelivery()` for ETA and shipping. No second race-prone merchandise lookup.
- Computes sum of exact server receipt line prices, one approved cart-wide shipping quote estimate, and `€5 × max(0, DISTINCT(canonical_product_id) − 1)` via the existing owner-confirmed `commerceExtraListingHandlingEur.ts` contract. Different sizes/variants/quantities **within one listing** add no handling charge.
- Returns a **pre-tax review estimate**, NOT payable total: `taxes_minor=null`, `discount_minor=null`, `provider_fees_minor=null`, `amount_due_minor=null`, flags payment/public rates/provider all false. The successful estimate still needs actual current carrier serviceability proof and shipping approval. Never write zero tax just to proceed.
- `lib/commerceCartCostBreakdownServer.ts` is a separate server-only, default-off review function (`FEYA_COMMERCE_CART_COST_REVIEW_ENABLED=false`), with no customer-facing route. Retail prices, original offer/configuration truth and currency are read from Supabase, not local storage.

## Quality and next steps

Unit tests cover two distinct listings, multiple quantities in the same listing, one cart-wide Express choice, fail-closed unserved destinations, unauthorized client money/PII, database faults and no premature payable total. Exact-head FEYA validation CI must pass, including Search v12 origin crawl and existing owner visual freeze. No production flags are enabled by merge.

Next dependency: production owner delivery approval + current carrier route/method/parcel evidence (Issue #91), *then* immutable shipping-v2 + structured address + policy + jurisdictionally reviewed tax/discount/service authorities + server atomic checkout snapshot v2. Seller Online account onboarding, API v2 payments/webhooks/refunds are independent gating steps. Optional login/wishlist/referrals/gift services **do not block first valid guest purchase**.

**Source:** owner price decision 2026-10-09, `docs/payments/M2_CARRIER_EUR_HANDLING_POLICY_20261009.md`, `docs/payments/M2_CART_DELIVERY_SERVICES_EXECUTION_PLAN_20261007.md`, Issues #81/#91.
