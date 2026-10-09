# M2 — service-only international carrier method proof (no payment)

Date 2026-10-09. Continuation of [Issue #91](https://github.com/THEFEYA/feya-commerce/issues/91), following [PR #90](https://github.com/THEFEYA/feya-commerce/pull/90) official-document shipping candidates and EUR5 distinct-listing fee. Existing production version 16 has 207/207 approved-by-owner **draft** manufacturing assignments; no actual shipping owner approval or payable order.

## Source discovery: no longer need a manual 200-country spreadsheet

**Ukrposhta 2026 International API**:
- Official [March 9 2026 documentation](https://dev.ukrposhta.ua/uploads/International_documentation_09032026.pdf) section 9:
  - `GET /countries/delivery-availability?country={country_code}&product={package_type}&type={deliveryType}&token={token}` → country, packageType, transportType, available boolean;
  - `GET /countries/delivery-types-availability?country={country_code}&token={token}` → country-supported package types/transport.
- A country appearing in 2025 PDF is NOT proof of EMS or PARCEL availability today; check `available` and actual parcel size/method before customer-facing quote. Token is server-only and must never be logged in a query-string or error message.

**Nova Post 2026 international API**:
- Official API [overview](https://api-portal.novapost.com/uk/about-api/general/index.html) and [endpoints](https://api-portal-stage.novapost.com/en/api-nova-post/start/endpoints/) cover Ukraine→World and support API keys, short-lived authorization JWT, testing endpoint. Exact available service mapping must be implemented from provider documentation, not guessed from their broad worldwide PDF or country selector.

## This finite code slice

`lib/commerceCarrierVerifiedMethod.ts` is a STRICT, PURE internal method-evidence gate requiring an already trusted server/DB record containing:
- actual origin `UA_EXPORT`, ISO country, optional postcode prefix, parcel class (`ordinary` or `oversize`), method Standard/Express, real provider + carrier service code;
- provider API result available/unavailable, immutable capture ID/source SHA, separately owner-approved mapping revision from a TheFEYA commercial method to the actual carrier service;
- observed and expiry timestamps in server time, with a **max 24-hour positive authority age** (conservative engineering candidate). An expired, future, malformed or unapproved record can never make a country payable.
- Global blocked RU/BY/KP and 20 other source-suspended countries cannot be resurrected by an accidental positive API record or stale draft.
- A per-postcode negative from the same carrier overrides its country-wide positive; one unavailable provider does not conceal an actually verified alternate route from the OTHER carrier.
- No fallback to another method/parcel class, no invented country/EMS guarantees, and the pure output itself has `payable=false`.

Unit tests cover two-provider union, method/size specificity, zero evidence, hard bans, stale and contradictory observations, postcodes and actual 2026 Ukrposhta API response parser.

**No secret fetch, carrier HTTP request, database writer, public API route, tax/checkout provider or enabled shipping flags are part of this slice.** It is a precondition/helper, not a completed live carrier connector.

## Next issue deliverables

1. Trusted private Nova Post and Ukrposhta adapters using actual business API credentials stored ONLY in Vercel secrets; no OAuth/key data in chat. Bounded provider retries and safe token handling.
2. Versioned signed carrier availability snapshot stored service-role-only in Supabase, source/TTL hash and owner-review trail. Fresh new record only from true carrier API response, never client JSON or unverified 209-candidate docs. No buyer PII.
3. Lookup reference inside the existing shipping-v2 approved quote transaction and again at checkout provider session. Block if evidence unavailable, method unsupported, quote expired, owner shipping approval/parcel model changed. Customer method labels map to a reviewed actual carrier service.
4. Exact-head CI including native PG permission, concurrency and rollback, browser tenant/owner tests and Search v12 release crawl before public activation.
5. Continue [Issue #81](https://github.com/THEFEYA/feya-commerce/issues/81): immutable private order snapshot + taxes/services/discounts/current policy acceptance + legal/merchant Seller Online #403264. Extra-listing EUR5 enters a payable order only with tax authority, not this method-proof slice.
