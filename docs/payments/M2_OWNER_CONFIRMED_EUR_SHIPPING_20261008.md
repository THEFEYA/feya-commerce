# TheFEYA — owner-confirmed EUR shipping prices and release guard

Date: 2026-10-08. This is the most recent **shipping currency and base price decision** in MASTER commerce M2. It supersedes the older USD `$19 / $35` examples **only on currency/amount**, not existing validated production/transit day calculations, product truth, SEO, payment, or release gates.

## Confirmed by Human Owner

| Buyer-facing candidate | EUR per applicable parcel | Scope |
| --- | ---: | --- |
| Standard shipping | €19 | Default for approved served destinations, ordinary/light parcel |
| Express shipping | €35 | Same approved served scope |
| Remote-zone increment | +€20 | **Only** explicitly approved countries, territories or postal exceptions |
| Remote-zone Standard | €39 | One Standard parcel if the €20 remote rule applies |
| Remote-zone Express | €55 | One Express parcel if the €20 remote rule applies |

**These are intentional commercial prices in EUR, not a foreign-exchange conversion of USD examples.** Merchandise current quote currency is EUR. All rates, order totals, versioned receipts and public display must use EUR minor units: 1900, 3500, +2000, 3900 and 5500 respectively.

Never silently apply an extra €20 to every product in the same parcel, add the fee at both product and parcel levels, classify every island as remote, or assume that all globally selectable country codes are actually served. A prospective AU/MX/NZ zone suggested by published selected Ukrposhta small-packet prices remains **HOLD pending exact route/service confirmation and Human Owner approval**; SA is not automatically remote. Carrier/warehouse path, actual chargeable weight and package dimensions decide whether a proposed premium is reasonable.

A large-format/oversize product may be manually bound by the owner to a separate shipping profile; **do not auto-label it based on product title, category, costume DNA or photography alone**. Specific quantity/packing/combination policy for mixed items remains an owner gate. The currently supported delivery profiles are standard and express methods on a profile; an oversize profile is an exception, not a third customer-facing delivery method.

## Owner-approved first remote-country zone — 2026-10-08

The Human Owner explicitly confirmed **AU Australia, MX Mexico and NZ New Zealand** as the *first* remote surcharge zone: Standard €39 / Express €55, consisting of base EUR 19/35 +20 per applicable parcel. **SA Saudi Arabia remains on the ordinary base rate if/when included among served destinations.**

This is a **commercial remote-price decision** only, not evidence that a carrier serves every postcode or service method. Exact territorial exclusions, parcel dimensions, service-country allowlist and calendar promises must be validated before the saved owner draft is approved. The new admin button adds the zone only to an EUR draft; it does not publish rates or enable a customer quote. All other allowed destinations use the approved normal profile by default unless given a separate, explicit override.

## Day calculations (owner policy, draft only)

- Workshop production, dispatch and published delivery working-day calendars use Monday–Friday; Saturday/Sunday excluded for the conservative initial model. Holiday dates must be explicit, not fabricated.
- Production profiles selectable for owners: 1–3, 3–5, 7–10 and 10–14 business days. An optional 5–7 profile may exist; there is no automatic reassignment of products.
- Transit windows **after dispatch** remain Standard 10–14 business days and Express 7–10 business days.
- `scheduling_time_zone` is the workshop's physical scheduling timezone; `Europe/Kyiv` is a valid one-click suggestion if the manufacturing clock operates in Ukraine, not a claim about the purchaser's residence. A real cutoff time must be supplied by the owner.
- Work starts only after required specifications/measurements are complete. Delivery ranges are estimates, not guaranteed arrival for an event.
- If Seller Online uses forwarding legs (e.g. Ukraine → US warehouse → recipient), every leg must be reflected before making delivery date promises.

## Deployment and publication boundary

1. Current admin can save versioned **DRAFT** settings only. New action `addOwnerConfirmedEurDraft` supplies a **manual, on-click** EUR 19/35 template with Mon–Fri transit calendars and verified day ranges. It does not auto-save, publish, choose served countries, choose a parcel capacity, set cutoff, define public order intent, or enable checkout.
2. Approval remains an independent explicit owner action on the exact saved version, after every served country/zone, shipping/production limit, calendar, cutoff, default profile and product assignment is reviewed.
3. Even owner approval is **not** publication. Public buyer quote/rates/payment/provider flags remain OFF until a separate, reviewed M2 release with immutable quote expiry and atomic basket/authority revalidation and provider integration.
4. Preserve product prices, Product Truth, active Search v12, public visual, existing legacy GLOBAL shipping v1, and noindex checkout utility policies.
5. Currency used in the generated visitor quote must match exact active merchandise quote currency; missing or incompatible price/rate fails closed. No money amount from browser, no silent FX, no guessed country or parcel size.

## Outstanding narrow Human Owner checks

- Exact **served-country allowlist** and explicit remote-country/territory/postal exceptions. Countries are entered in profile administration, not inferred from all ISO options.
- Workshop cutoff for production clock, holidays, production profile maximum order units, reasonable parcel capacity/packing assumption and mixed-cart parcel aggregation.
- Bulky product shortlist selected by its actual photos, approximate box dimensions and carriers; no broad automatic category assignment.
- Seller Online #403264 contractual carrier/checkout scope and address/tax disclosures.

## Engineering successor

[M2 persisted quote issue #77](https://github.com/THEFEYA/feya-commerce/issues/77): exact version of owner-approved workspace + current immutable merchandise receipts + destination/method/parcel/calendar amount + server-dated expiry + idempotency; fail stale before storage and before future provider session. Guest checkout, discounts, tax and services follow separate bounded steps. Priority manufacture / gift services / recovery remain OFF before reviewed implementation.
