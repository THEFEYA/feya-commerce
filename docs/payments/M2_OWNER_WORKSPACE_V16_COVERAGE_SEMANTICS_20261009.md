# M2 — saved owner workspace v16, country coverage vs default rate

Date: 2026-10-09. Read-only Supabase `ysnizcgzhdwdfdkjkhud` snapshot:
- Immutable saved `thefeya` workspace revision 16, saved 2026-10-09 **12:13:19Z** (14:13 Spain), SHA256 `b197e356503004629dd45e46c78a150d33fd4e9ba84b37ea1d8419349eb69e7b`.
- 207/207 unique product-level manufacturing assignments, no override of production profile distribution (8 ×1–3, 147 ×3–5, 36 ×5–7, 16 ×7–10, 0 ×10–14), all normal production and dispatch calendars weekdays 1–5.
- Exactly one EUR shipping profile `Standart/Express` with ID `7e06e1c4-a60e-403c-9610-c645156d43af` and single default rule ID `2b6f2bc4-7eb1-47e9-bc0b-7736bebcff03`, Standard EUR 1900 cents, 10–14 business days and **owner-saved Express EUR 3500 cents, 6–9 business days**. Both calendars Mon–Fri. No zone rule yet, no default shipping ID, `served_countries=[]`, max parcel capacity NULL, workshop time zone/cutoff NULL. No approved delivery rates or persisted shipping quotes.
- New admin button must adopt this exact profile **with the same stable IDs and the saved 6–9 Express transit**, add approved AU/MX/NZ +2000 cents draft rule, and set global default shipping inheritance without changing any of the 207 manufacturing assignments. It must never silently create a duplicate Standard/Express profile or invent other shipping destinations.

## Owner clarification: blank destination coverage

Owner intentionally left the countries field empty, expecting the **base rate** to automatically apply to all regions. The engineering distinction is critical:
- `default` shipping **rate rule** means "this price for every *supported* destination unless a specific zone/country/postal override exists".
- `served_countries=[]` is an empty **allowlist**, **not** a magic wildcard. Current `ruleFor` and `deliveryApprovalReadiness` fail closed if no country is served.
- Automatically adding every code in `DELIVERY_COUNTRIES` would include countries/territories with suspended or unavailable carrier service, and would be inappropriate before verified Seller Online #403264 route coverage. Do not do it as a shortcut to approve rates.
- The carrier/service coverage must become a **versioned explicit, ideally provider-derived and periodically refreshed list**, independent from base EUR 19/35 + remote zone EUR 20. Countries not verified should have a safe unavailable / request quote state at checkout; the customer may still see the catalog.
- No need for owner to assign a rate to each product or enumerate 249 ISO codes. A single inherited price profile is already the correct design. Carrier-verified serviceability may later expand the country allowlist automatically after review, with audit evidence.

## Relevant evidence / scope

- Ukrposhta official international service provides access to over 230 countries, **but** separately lists destinations where receiving shipments is suspended as of 2026-05-12: https://e-export.ukrposhta.ua/spysok-krayin-v-yaki-ne-zdijsnyuyetsya-dostavka-stanom-na-15-08-2025/ . Express EMS coverage is narrower than universal: https://www.ukrposhta.ua/ua/vidpravlennya-ems .
- Seller Online also lists destination restrictions: https://seller-online.com/help/obmezhennya-po-vidpravci/ . Seller Online operates multiple carrier/warehouse routes: https://seller-online.com/shipping-partners/ . Carrier availability cannot be assumed from a generic default tariff, or from an ISO country dropdown.
- **Not a claim** that any current Ukraine-origin route, Seller Online mode or Express 6–9 delivery promise is already verified. Those are release blockers for international checkout. If any method unavailable for a chosen destination, fail closed; no fallback to a fake rate.

## Continuation, MASTER M2

1. Keep saved manufacturing 207/207 and their working-day ranges immutable.
2. Owner account can save one reviewed draft revision containing global default shipping ID and explicitly approved AU/MX/NZ remote amount without affecting any other profiles. No public publication in this UI package.
3. Separately resolve current exact delivery service coverage and country/parcel model. No direct SQL impersonation of owner to fabricate an approval; only actor-bound save from authenticated owner session.
4. Resume checkout/order intent successor [Issue #81](https://github.com/THEFEYA/feya-commerce/issues/81) after confirmation of carrier availability and real tax/merchant model; internal strict destination precondition PR #85 already merged. Customer Standard/Express shipping is a single cart choice, dynamically recalculating exact shipping and arrival from slowest product production. Browser amounts untrusted. Extra per-additional-distinct-listing +5 fee remains **HOLD on explicit currency/packaging authority** (owner called USD 5 while established EUR merchandise; no silent conversion).
5. Seller Online ticket #403264 and payment/provider signature/replay, merchant legal and GA4 consent remain separate gates. Public Search v12 and frozen public visuals unchanged.
