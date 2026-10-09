# M2 — Owner late-day commercial shipping clarification + pre-Seller Online storefront review

**Date:** 2026-10-09 evening (Europe/Madrid). **Priority:** finish a customer-ready guest checkout and honest shipping/merchant disclosures; do not re-open ACTIVE Search v12 / the approved public visual or expand the provider API research cycle.

This is the newest **business intent** for shipping and takes precedence over the previous assumption that every buyer Standard/Express selection must map to distinct paid Ukrposhta/Nova Post shipping products or independently verified parcel classes. It supplements—not erases—[MASTER M2](M2_CART_DELIVERY_SERVICES_EXECUTION_PLAN_20261007.md), [the owner-confirmed EUR rates](M2_CARRIER_EUR_HANDLING_POLICY_20261009.md), the immutable server-calculation modules and Issue #91. Real carrier country legal restrictions still apply. No production pricing or payment flags are switched by a document/preview.

## 1. Human Owner's explicit decisions

1. TheFEYA itself selects the actual shipping carrier, **Nova Post preferred**. Ukrposhta may be used as an appropriate alternative after review. **Do not offer the buyer a carrier selector** or ask them for box size, weight and courier product; these are internal fulfillment details.
2. Buyer chooses one **commercial service tier for the whole bag**:
   - **Standard, €19**: ordinary production/fulfillment queue; owner planning range **10–14 days** (the actual saved workspace rev16 currently implements **10–14 business days after dispatch**).
   - **Express, €35**: higher internal order preparation/dispatch priority; owner planning range **6–9 business days** (saved rev16 implements **6–9 business days after dispatch**).
   These are the brand's retail services, not automatically distinct Nova Post products or Ukrposhta EMS. The SAME Nova Post carrier product may be used for both. Therefore it would be misleading to promise expedited **physical carrier transit** solely because Express was selected. Priority must be implemented as an internal production/dispatch queue fact when the paid order pipeline exists.
3. **Extra listing fee = €5 × (distinct canonical_product_id count – 1)** per order, never per product quantity, option, color/size or physical parcel. This is already implemented in PR #98/#103 and must remain server-authored.
4. **AU/MX/NZ remote +€20 per actually applicable parcel** remains the separate owner-confirmed commercial policy. This is conditional on a verified eligible delivery destination; it is not a statement that every postcode and package class is already serviceable.
5. Production profiles: **207 saved product assignments** have different estimated production timelines; standard vs priority does not rewrite that Product Truth. Buyer should see the estimated final arrival as **manufacturing/preparation + physical transit**, not confuse after-dispatch transit range with order-to-door time.
6. The store wants a practical first-launch launch, not an algorithmic optimization of each destination's ETA before it can sell. Historical Seller Online delivery statistics are optional later evidence, not a first-order release gate.

## 2. Operational vs buyer-facing requirements

| Dimension | Customer experience | Back office / fulfillment |
| --- | --- | --- |
| Standard / Express | One clear choice, €19/€35, honest approximate ranges, priority benefit | Same carrier allowed, priority production queue for Express |
| Item count | Prices/options, plus €5 for each additional distinct listing | Packaging and capacity operationally handled |
| Destination | Country/postal entered once, only validated served countries selectable/payable | Current outbound carrier availability from Ukraine, relevant sanctions/customs exclusions |
| Dimensions | **Never ask buyer** for parcel width/height/weight | Review only exceptionally oversized or restricted items; no 207-product manual measurements as a launch step |
| Delivery estimates | Practical ranges and, later, a responsibly computed date *including production* | Own historical data/actual delivered scan metrics if representative; carrier API ETA optional, never a false guarantee |
| Carrier name | Studio chooses the provider, can disclose carrier after dispatch | Prefer Nova Post; Ukrposhta fallback/choice by owner |
| Payment | Guest checkout, exact charges/taxes/policy and no signup obligation | Seller Online API v2 and real merchant/legal/country/currency/tax/remedy proof before transaction |

**Corrected Issue #91 release boundary:** For normal permitted goods and a common flat commercial service, separate **standard-vs-express postal product mappings, dimensions for all 207 outfits, real-time shipping quotations and geographic delivery-time forecasting are NOT preconditions**. However, **credible current proof the chosen provider can deliver from Ukraine to that buyer's destination** remains mandatory, with a clear exception lane for prohibited/bulky item classes and suspended countries. Source evidence must not fabricate shipping guarantees. The previously built API adapters and exact reviewed parcel tables remain available for operational exceptions, **default OFF**; do not mass-populate/approve them.

**Corrected Issue #81 first-sale boundary:** Price, per-listing +€5, address, policy acceptance, actual seller/trader disclosure, tax/duties, the payment partner relationship and secure Seller Online webhook/replay **are mandatory**. Promotional coupons, product suggestions, account, wishlists, advanced tracking, carrier-specific margin, gift wrapping and loyalty remain after the first verified paid order.

## 3. Grounded checkout UX research

Baymard 2023 research, [Delivery Date not Shipping Speed](https://baymard.com/research-articles/shipping-speed-vs-delivery-date), reports that shoppers care about when the order will arrive and may treat even an estimated arrival date as a firm promise. Recommended adaptation for a complex handmade cross-border atelier: display the owner ranges initially, **clearly differentiate product manufacturing from after-dispatch transit**, and show only a conservatively computed order-to-door estimate once actual production queue/cutoff and destination data support it. Do not use an API that overstates/understates timing as a marketing truth. A range without evidence of a distinct carrier speed is **not** evidence that paying for Express speeds up physical shipment; the real paid benefit is prioritised internal preparation.

## 4. Actions performed without touching Wave A production

A **new, unlisted Vercel Preview-only three-page review experience**:
- `/site-review`: owner's directory of all **10 currently indexed commercial collections**, catalogue and foundational pages, with links to three proposals. Each collection link opens the ACTUAL existing search-owner route with its real catalog membership. No reclassification, new categories or 207 PDP indexing.
- `/checkout-review`: responsive nonpayable visual bag using **approved real catalog cards** when available, an interactive Standard/Express service selector, country illustration, clear one-order €5 per additional distinct listing, AU/MX/NZ surcharge example, no carrier/dimensions fields, no real buyer details, disabled payment and full 'illustrative' warnings. Card display price is **not** current selected configuration quote; we do not reuse it as payment authority.
- `/shipping-review`: accurate *proposed* customer language and the owner’s commercial services without misleading guaranteed timing or requiring a carrier switch. Frozen source for publicly indexed `/shipping` remains unchanged until a distinct governed Phase 13 content version and owner visual review.
- Existing `/contact-review` from PR #99 remains available in Preview and references the already confirmed Seller Online LLC partnership. The current indexed Contact and legal/Footer freeze remain untouched.

All three preview routes are **404 on Vercel Production** and **robots noindex,nofollow** on Preview, with no checkout API, owner credential or Seller Online secret exposure. Their only interaction is client-local nonpersistent sample layout.

## 5. Immediate next shipping/checkout engineering after this bounded release

1. Prepare owner delivery *draft* rev16 for one default EUR ordinary service and a minimally supported destination subset, keeping the 207 existing production assignments; do not require individual parcels/diameters, do not promote 209 documentary countries. Get one exact owner approval only after source coverage and merchant/legal checks; do not silently activate payment.
2. Implement the **production/dispatch priority** as a verifiable paid-order queue field, independent from transport provider, rather than trying to create or sell artificial Ukrposhta EMS. Do not promise fixed production acceleration while capacity is not measured.
3. Complete direct route/service proof for actual outbound **Nova Post preferred** and applicable other carrier, status/availability sourced, with a small conservative destination launch set and blocked countries. Never invent carrier service codes or manufacture delivery estimates.
4. Complete seller/trader/mandatory EU/US legal terms, Seller Online API v2 and tests for one real **guest** checkout. Use privacy-safe tracking after first paid order.
5. Publish the owner-reviewed shipping/contact/cart visuals through separately governed changes, not by overwriting Search v12 historical source blob pointers. Do not activate Merchant, ads campaigns or GA4 purchase metrics before real receipts.

No action from owner is needed merely to build/review this preview. A later owner visual review of its URLs is welcome before public conversion work.
