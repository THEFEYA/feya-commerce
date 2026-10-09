# M2 — Ukrposhta international availability HTTP adapter, default OFF

Date: 2026-10-09. Successor to [PR #93](https://github.com/THEFEYA/feya-commerce/pull/93) and [Issue #91](https://github.com/THEFEYA/feya-commerce/issues/91). This is the first **actual server-side carrier HTTP adapter implementation**, not a claim of a successful live provider call.

## Grounding in official documentation

[Ukrposhta international API, revision 9 March 2026](https://dev.ukrposhta.ua/uploads/International_documentation_09032026.pdf), pages 4 and 87:
- Official base: `https://www.ukrposhta.ua/ecom/0.0.1`
- Authorized by the carrier-provided `Authorization: Bearer <bearer>` header and user token (carrier requires a contract / manager-issued credentials).
- Section 9: `GET /countries/delivery-availability?country={ISO}&product={EMS|PARCEL|SMALL_BAG}&type={AVIA|GROUND}&token={user_token}`.
- Response must bind the exact country, actual package type, transport type and boolean `available`. Service availability for `EMS` is not a universal guarantee, and `EMS` is **not automatically mapped** to buyer `Express`.
- The official document warns it may change; refreshing the source is a separate maintenance responsibility.

## Internal implementation

`lib/commerceUkrposhtaAvailabilityAdapter.ts`:
- fixed official https origin/path (cannot be replaced by browser input or arbitrary HTTP host), country/product/transport allowlisted;
- never contacts the carrier for RU, BY, KP or suspended destinations;
- bearer and user token required; absent/invalid keys yield `not_configured` without network request;
- `GET` without cache or redirects, 8-second abort, no retries or timeout loops, no raw response/error/tokens in logs;
- 200 JSON only, exact response fields and values, 4 KiB max response, bad/changed response => `unknown` (fail closed);
- outputs **sanitized source SHA256, captured/expires 60 minutes**, and `available|unavailable|unknown|not_configured` — all `payable=false`, mapping not approved, Standard/Express not verified, payment/provider OFF.
- token appears as a query parameter **because the official provider requires it**; code never returns/logs token-bearing URL. Provider-side HTTP access logs are outside TheFEYA's control and must be handled under carrier contract.

`lib/commerceUkrposhtaAvailabilityServer.ts`:
- `import 'server-only'`, feature flag `FEYA_UKRPOSHTA_AVAILABILITY_ENABLED=false` by default;
- reads `FEYA_UKRPOSHTA_AUTH_BEARER` and `FEYA_UKRPOSHTA_USER_TOKEN` ONLY from server-side Vercel Secrets;
- **not exposed on any /api route**, and not called by public checkout.

Unit tests use mock fetch and fake tokens to validate official GET params, provider 200 boolean response, no token leakage, disabled/no credentials, blocked countries, response tampering, network errors, latency bound and no buyer payment claims. No production key is used or requested from the user.

## Next dependencies

1. Confirm Ukrposhta international contract and carrier-issued credentials. Store only in Vercel encrypted Production env, never via chat/GitHub. Do not turn the flag ON until verified provider test and separate release review. The current connected Vercel environment-variable list action returned `403` (no metadata permission); this requires valid Vercel access later.
2. Build validated mapping-review flow for actual cargo service `SMALL_BAG/PARCEL/EMS` and transport to TheFEYA Standard/Express and parcel classes. Owner confirmation before publishing. API response alone is **not sufficient proof of a deliverable order**.
3. Ingest source digest and mapping into private immutable carrier observation DB from PR #93 (with idempotent request), recheck at shipping-v2 quote creation and future provider-session transaction. No automatic 209-country allowlist by merely testing general routes.
4. Nova Post authenticated Ukraine→World adapter remains pending its own contract/API key; [official integration guide](https://api-portal.novapost.com/novaposhta-docs/integration-guide/integration-guide.md) requires business agreement and an authorized representative. Do not conflate Nova Post's import-to-Ukraine API with outbound deliveries.
5. [Issue #81](https://github.com/THEFEYA/feya-commerce/issues/81) remains the commercial path: versioned address/quote, business policies, €5 per extra canonical listing, taxes/services, Seller Online merchant/proceeds/refund/webhook, then test checkout. ACTIVE Search v12, product prices/SEO and approved visual unchanged.

**No production rate approval, carrier live verification, public payment switch, product shipment promise or API secrets were created by this PR.**
