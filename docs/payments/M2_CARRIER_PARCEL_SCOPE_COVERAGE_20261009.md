# M2 — exact immutable shipping quote → carrier source coverage (Issue #91)

Date 2026-10-09. Finite implementation successor to PRs #80, #92–94, #97 and #103. **Review-only infrastructure**, NOT live Standard/Express, public rates, parcel labels, an ETA guarantee, final parcel-size acceptance, order creation or a seller payment.

## Changes

- New service-only `feya_commerce_shipping_parcel_profile_reviews_v1` immutable review record maps **one exact approved delivery workspace version + one shipping profile ID** to an owner-reviewed physical parcel class (`ordinary|oversize`), maximum **units per package** and recorded maximum package **weight and dimensions**, with a packaging evidence digest/reference and real authenticated owner ID. There are NO default reviews and NO invented package envelopes. Each review cannot be updated or deleted.
- `feya_commerce_shipping_carrier_coverage_v1(uuid)` is a **private STABLE PostgreSQL snapshot** of one actual unexpired `approved_shipping_quote_v2`. It fails closed when the approved owner head has changed, source quote is stale/changed, destination is hard-blocked, package mixes multiple shipping profiles, rule IDs do not match the approved workspace, package class lacks an independent owner review, or quantity exceeds its reviewed packaging cap.
- If a matching parcel class was reviewed, SQL fetches the existing protected `feya_commerce_carrier_method_context_v1` for the *exact* shipping method, destination country/postcode and reviewed class, at the database time. That context contains only immutable source/mapping evidence and never a buyer-facing approval.
- `lib/commerceShippingCarrierCoverage.ts` applies the existing `assessCurrentCarrierMethod` to EACH parcel's verified source rows, with real destination postal-prefix precedence and blocked-carrier routing. Different verified providers use a union; contradictory or stale same-provider proof fails closed. **Every parcel** must be source-positive for the status `country_product_source_positive`, otherwise `incomplete`.
- Even `source_positive_country_only` explicitly remains **nonpayable**, because a country/product/transport API confirmation says nothing by itself about real postal route acceptance, package material, actual physical dimensions/weight, export restrictions, live price, insurance, delivery purchase or courier handoff. `postal_route_provider_verified=false`, `parcel_dimensions_provider_verified=false`, `payment_enabled=false`, `provider_session_enabled=false`, `public_rates_enabled=false`.
- Pure JS response **never exposes postal code or address**, even though server-only SQL must privately evaluate full postcode. No HTTP route or customer form is created. Private wrapper requires separate `FEYA_COMMERCE_CARRIER_COVERAGE_REVIEW_ENABLED=true`, disabled by default.
- No existing owner-approved `Product Truth`, 207 production profiles, visual UI, active SEO v12, existing live checkout, policy terms or tax is mutated. Real production carrier reviews/observations start at zero.

## Constraints exposed rather than disguised

1. Existing shipping-v2 parcel entries carry package profile/rule IDs, item quantity, and delivery estimate, **not actual measured packed dimensions**. A reviewed envelope is a necessary owner fact but still is not proof that a given mixed/oversize shipment is eligible. Mixed-profile parcels return unresolved, not arbitrary `ordinary`.
2. Most current carrier evidence is country/product/transport only. For actual checkout serviceability we also need authenticated outbound **Ukrposhta / Nova Post** provider credentials, carrier-specific postcode/parcel validation and exact reviewed mapping from FEYA buyer Standard/Express to the provider's physical service. Without that, a country-wide yes is never a paid checkout yes.
3. The exact immutable shipping quote v2 and independent owner delivery approval still require producer/business decisions for served-country allowlist, capacity, remote zones, dimensions and carrier evidence. 209 documentary country codes must never be auto-approved. Existing EUR 19/35 + AU/MX/NZ parcel additions remain owner business prices, not proven carrier shipping costs.

## Release gates & subsequent work

- Exact PR commit CI **19/19** including PostgreSQL 17 native and PGlite RLS, class reviews, stale/owner drift, blocked countries, TypeScript/build, active Search v12 crawler and browser auth; additive migration to production Supabase only after green. Roll out with no customer availability or payment.
- Next backend: validated authorization for provider credentials and official source probing, **Nova Post outbound adapter** plus actual physical parcel delivery terms; per-parcel provider route, geometry and pricing proof rechecked **atomically when creating a future paid Seller Online session**, not inferred from this source coverage. Gap is explicit, not silently marked done.
- Seller Online custom-site API v2 onboarding, contracting seller identity, EU product safety/GPSR, tax and receipt/refund/webhook governance remain Issue #81/#100 and must be completed before any live paid checkout.
- After a real paid guest order, customer order tracking and optional account/wishlist/recovery continue per the separately versioned lifecycle backlog. No popups added now.

This explicitly does **not** claim real carrier coverage, availability of a particular buyer method, accepted dimensions, checkout opening, or completion of Issue #91.
