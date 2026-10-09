# M2 — one cart-wide shipping method for the approved product catalog

**Additional owner confirmation 2026-10-09:** [Versioned EUR €5 additional-distinct-listing handling and Ukrposhta/Nova Poshta coverage](M2_CARRIER_EUR_HANDLING_POLICY_20261009.md). €5 is charged once per additional canonical listing in an order, NOT per configuration/item/parcel, and is still nonpayable until checkout/tax binding. The actual saved workspace is now revision 16 and owner Express transit 6–9 business days; earlier rev15 and 7–10 transit here are historical checkpoints.\n\n
2026-10-09 Human Owner confirmation after saved revision 15.

## Verified saved state (read-only Supabase)

- Owner delivery workspace version **15**, 9 October 2026 10:58:29Z; **207** whole-product production assignments for **207** distinct approved product IDs; **no product without production profile**, and **0 exact variant manufacturing assignments**.
- Production distribution: 1–3 business days **8**, 3–5 **147**, 5–7 **36**, 7–10 **16**, 10–14 **0**. All production profiles and dispatch calendar have ISO weekdays **1–5** and `business_days`.
- Owner approval versions **0**, persisted shipping quote v2 receipts **0**.
- Saved shipping profile `Standart` EUR is an incomplete draft: one default rule, no amount or transit, served countries empty, no parcel capacity, no `default_shipping_profile_id` and **0 custom per-product shipping overrides**.
- The UI's hundreds of 'Доставка … не выбран профиль' messages are missing default shipping coverage, **NOT missing production assignments**.

## Business decision

1. A **single normal shipping profile** is inherited by all 207 products, irrespective of their manufacturing complexity. There are **two cart-level shipping methods**, Standard (€19, 10–14 business days *after dispatch*) and Express (€35, 7–10 business days *after dispatch*). They are not selectable product variants, do not alter Product Truth, and are not individual manufacturing tiers.
2. Owner-approved shipping zone: AU/MX/NZ +€20 **per eligible parcel** (Standard €39 / Express €55). SA receives the standard rate *if it is in the verified served-country list*. Do not infer serviceability from the ISO list; never assume all island destinations are remote.
3. At checkout the customer selects country/postal and ONE `shipping_method` for the order. Server resolves exact saved merchandise receipts + per-product manufacturing profile + parcel aggregation/limits + approved shipping profile and rules. It returns method-specific **amount and non-guaranteed arrival window**. Method/address/basket changes require recalculation and new immutable quote. Do not trust client prices or dates.
4. For products dispatched together, readiness date reflects the **latest completing product** (from per-product production min/max), then adds dispatch and selected transit business days. Do not sum all manufacture days; don't ignore Saturday/Sunday. Parcel splits/oversize cases need real box policy and separately approved profile.
5. Priority manufacturing / weekend work is a separate future optional paid service, not today's 'Express shipping'. No altered paid capacity or date promises without a separate service contract.

## Scope of current admin implementation

- Owner-only **one-click** draft action on `/admin/company/delivery` prepares/saves the general EUR shipping profile for all products through existing actor-bound CAS API. If version 15's one empty `Standart` placeholder is the only profile, **reuse its stable IDs** instead of creating a duplicate. Prices/countries are explicit, no SKU-by-SKU rates.
- New owner approval readiness display groups repeated errors rather than emitting 200 identical product labels. **No change to server-side issue count or eligibility.**
- Preserves the 207 production assignments, their profile IDs, all Product Truth/SEO prices, oversized variant shipping overrides, public Search v12 and existing public visual. No paid checkout switch or provider session.
- Does not automatically set unverified `served_countries` outside AU/MX/NZ, max units per parcel, workshop cutoff or owner approval. These are separate gates before public shipping rates.

## Next M2 step

Source receipts: [PR #80 shipping v2](https://github.com/THEFEYA/feya-commerce/pull/80) and [PR #85 destination precondition](https://github.com/THEFEYA/feya-commerce/pull/85). Continue [Issue #81](https://github.com/THEFEYA/feya-commerce/issues/81) with the **private immutable** cart intent + full structured destination, versioned policy acknowledgement, tax/service/discount authority and checkout snapshot; consumer cart price/date selector behind the actual approved-rate release gate. Seller Online #403264 and legal provider/merchant obligations remain unresolved.

No known real orders, rate approvals or marketing measurement are represented by this admin draft.
