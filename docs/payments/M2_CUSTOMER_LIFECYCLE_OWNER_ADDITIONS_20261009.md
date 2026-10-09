# TheFEYA M2 → customer accounts, order tracking & loyalty (2026-10-09 owner addendum)

This addendum captures the Owner's 9 October new product ideas **without expanding the M2 first-paid-order critical path** or re-opening the Search v12 / frozen storefront. Status is accepted *planning*, not a claim of code or vendor integration. Canonical detail: [M2 cart/delivery/services](M2_CART_DELIVERY_SERVICES_EXECUTION_PLAN_20261007.md). The live project remains Next.js/Vercel/Supabase with the existing FEYA Product OS and Growth OS.

## Sequencing is non-negotiable

**First-sale mandatory:** actual approved carrier Standard/Express serviceability and parcel constraints; one protected country/postal/address/offer/policy snapshot; server-authored merchandise, delivery and EUR €5 per extra DISTINCT listing charge; verified destination-specific taxes/mandatory fees; established contracting trader and Seller-Online LLC role/KYC; real API v2 provider payment+webhook+refund/chargeback, positive paid receipt; guest purchase. No invented delivery ETA, country coverage or payment provider state.

**First-paid-order follow-up (P1): order visibility without requiring registration.**
1. After payment truth, create a customer-visible *opaque order reference* independent of shipping label/tracking code. A secure email magic link or scoped receipt token allows guests to see ONLY their own order and support contact (no universal lookup by sequential order ID).
2. Stable order timeline: order confirmed/paid → preparation/production → quality review → shipped → carrier transit → delivered or delivery exception. Each transition must cite a real source, timestamp, actor and immutable evidence; 'dispatched' is recorded only after actual carrier acceptance/label confirmation, not after 'label requested'.
3. Track actual carrier (Ukrposhta→downstream carrier such as USPS, or Nova Post) from contract-sanctioned authenticated API/webhook; persist normalized signed/deduplicated events and tracking URL. Show latest verified event and *last checked* time, link to official carrier tracking as fallback. **No guessed dates, invented scan statuses, persistent raw provider tokens or unrestricted address lookups**.
4. Operational email for legitimate shipment/order status is distinct from marketing consent. Handle long delays, customs, unsuccessful delivery and refund disputes according to applicable law and exact support history.

**Customer account (P2, explicitly optional):**
- Reuse Supabase Auth infrastructure for a *separately scoped customer identity*; never reuse admin allowlists / RLS bypasses / delivery owner roles. Default guest checkout stays available without account or marketing opt-in.
- Post-purchase invitation to save access by email/magic link or other secure authentication; link prior guest orders only through proven verified email/order ownership. Customer can view orders/tracking, optionally manage addresses, save favourites, and see eligible offers. No display of other customers' data. Graceful deletion/erasure and account recovery; immutable tax/order records kept where legally necessary.
- Wishlist is private or safely local until opt-in; product/configuration ID truth remains canonical, it cannot silently reserve stock or imply a price guarantee.

**Promotions & cross-sell (P3):**
- Optional small 'Have a promo code?' disclosure, verified per-cart server redemption, campaign ID, expiry/usage/country/customer eligibility and margin caps. Welcome one-time account coupon only after validated commercial economics and legal/marketing campaign settings; do not require registration to buy.
- Product suggestions, 'complete the look' and selected gift services must reference exact compatible component/product IDs and individual eligibility. Never infer included items from styled photos. Any added item/service triggers new shipping parcel/weight/dates/tax/policy snapshot; no client-side addition to the payable total.
- Optional newsletters, news/coupons and back-in-stock messaging require a clear **separate unchecked** opt-in and consent-purpose/time/text-version ledger, unsubscribe, suppression and no PII sent to GA4/LLMs. Do not treat order email as newsletter permission.
- Creators/referrals/recovery emails from the existing M2 plan remain **after verified paid-order attribution**, anti-fraud, refund/chargeback reversal and revenue/margin measurement. Do not embed a heavyweight affiliate SDK on every storefront page.

**On-page promotions (P4, only after measured traffic/consent):**
- Prefer a quiet inline subscription opportunity or site-wide minimal announcement first; avoid intrusive arrival popups, full-screen discount overlays, aggressive countdowns or repeat prompts. If later testing a compact modal, enforce session frequency cap, mobile accessibility, easy dismiss/reduced motion, no default checked marketing, proper attribution and statistically credible purchase/margin outcomes.
- None of the proposed banners or customer's account changes the current visual freeze without scoped Human Owner permission and regression screenshots.

## Key engineering contracts to implement later

`order_lifecycle_event_v1` (signed source, dedup key, status, observed_at, source/provider, proof hash), `customer_order_access_v1` (opaque ownership claim, time-bound scope), `customer_wishlist_v1` (customer/product/config IDs only), `marketing_consent_ledger_v1` (channel, purpose, version, time, withdrawal), `promotion_redemption_v1` (server CAS, expiry, non-stackability), `carrier_tracking_adapter_v1` (latest checked, exact scan events). These are intended contracts, not deployed tables or authorization.

## Evidence and release gates

Baseline = no current custom-site paid orders. A green CI on private shipping API or a free-account signup cannot be counted as launch readiness. First completed Seller Online paid order is the promotion point. Then activate tracking/customer receipts, inspect customer problems, and add favourites/promotions based on real checkout and retention observations. Use Growth OS evidence→diagnosis→proposal→validation→scoped change→measured outcome; do not create new analytics/admin dashboards merely to track these.

The final product target is an elegant, quick one-page-style guest order flow with optional post-purchase account, trustworthy current status and no marketing noise. This is NOT a dependency for first organic indexing, Google Ads API Basic verification, or the minimum live checkout.
