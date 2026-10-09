# M2 — reviewed Ukrposhta international API observation ingestion

**Date:** 2026-10-09. **Scope:** [M2 Issue #91](https://github.com/THEFEYA/feya-commerce/issues/91) after PR #94 official default-OFF HTTP adapter and PR #93 private immutable evidence tables. Part of the closed-gate path to [Issue #81](https://github.com/THEFEYA/feya-commerce/issues/81), **not** a customer checkout, published shipping service, paid order or broad country activation.

## What this code slice implements

1. `lib/commerceUkrposhtaVerifiedCapture.ts` accepts ONLY a backend-issued UUID request, a pre-existing owner-reviewed immutable mapping revision, exact `country`, actual `SMALL_BAG|PARCEL|EMS` and `AVIA|GROUND`. It invokes the existing PR #94 trusted Ukrposhta probe. Provider 401/403/429, absent credentials, malformed provider response, future/stale or changed country/product/transport do not write evidence. Source digest and short expiry are verified; no raw response, tokens, URLs, customer postal addresses, amounts or browser-provided availability go to storage.
2. `lib/commerceUkrposhtaVerifiedCaptureServer.ts` is explicitly `server-only`. BOTH `FEYA_UKRPOSHTA_AVAILABILITY_ENABLED` and NEW `FEYA_UKRPOSHTA_EVIDENCE_CAPTURE_ENABLED` are required; the new switch is FALSE by default. No `/api` route or scheduled job, client credentials or production toggle is introduced.
3. Additive SQL migration `20261009201000_ukrposhta_verified_source_ingestion_v1.sql` creates a **service-role-only** RPC `feya_commerce_record_ukrposhta_availability_v1(jsonb)`. It independently:
   - validates exact source schema, source digest, adapter version and database-clock freshness (capture within 5m and max 60m TTL);
   - hard-denies RU/BY/KP and currently suspended routes, and domestic UA which needs a separate model;
   - requires a PRE-EXISTING immutable owner-review row for the **exact** carrier code `PARCEL_AVIA`, `EMS_GROUND`, etc., and the row's buyer method/parcel class. **It does NOT infer EMS=Express or invent a mapping or reviewer**;
   - writes into PR #93 private immutable observations with no postal claim beyond country-wide scope, and returns a nonpayable receipt with replay indication;
   - deduplicates concurrent repeats on `source_request_id`; changes to an already-used ID conflict and cannot overwrite history.
4. Typescript pure tests and existing native PostgreSQL/PGlite suite gain source authenticity, stored-time, carrier mapping, RLS, blocked-country, idempotency and race checks. Every new return keeps `payable=false`, `payment_enabled=false`, `provider_session_enabled=false`.

## Important evidence limitations

An authenticated Ukrposhta country/product/transport result is **not** proof of an individual parcel's dimensions, prohibited contents, exact postcode or pickup contract. A country-level positive may become an internal carrier-method observation only after owner review of the mapping; it must not directly turn on public Standard/Express, fee, estimated delivery date, shipping `v2` quote or Seller Online payment. The next shipping-v2/checkout changes must confirm current source proof, approved destination, owner workspace revision, parcel geometry and expiry **atomically at paid-session creation**, not from this helper alone.

Existing owner delivery settings remain revision 16 at the last verified read, with 207/207 manufacturing assignments, draft EUR 19 Standard and EUR 35 Express, plus AU/MX/NZ candidate +20/parcel and EUR 5 per extra distinct listing. Zero approved delivery versions, rate heads and carrier observations as of this packet's preflight. Do not copy the 209 documentary candidate codes into `served_countries`. The owner needs a protected UI to approve actual carrier method mappings; this package does not create an approval on their behalf.

## Next, in dependency order

1. Exact-head 19/19 CI (TypeScript, build, Postgres, Supabase/browser and active Search v12 crawl), then production migration and a read-only zero-evidence/RLS postflight. Do not merge or deploy if the source-pin or current 18-URL Search release tests fail.
2. Obtain genuine authorized Ukrposhta carrier credentials privately through the provider and Vercel Production secret settings; no secrets via ChatGPT/GitHub. Only then run a bounded current source probe under a review-approved service mapping. Nova Post authenticated outbound source connector remains separate and requires its provider contract/API.
3. Finish owner-approved method/parcel/postal coverage and shipping quote v2 atomic route proof, destination-bound order intent + packaging/tax/services/policy binding (Issue #81).
4. Seller Online custom-site onboarding and API v2 keys/contract/legal checkout proof, paid webhook/replay tests, Merchant and GA4 after their independent release gates.

**Frozen:** Public design, Product Truth, Search Release v12 first 18 owners, 207 PDP noindex, prices/configurations and public Terms/Privacy/Contact/Footer. This package adds no visual component or public content change.
