# M2 carrier method evidence — immutable private Supabase store

Date: 2026-10-09. Narrow successor to [PR #92](https://github.com/THEFEYA/feya-commerce/pull/92) and [Issue #91](https://github.com/THEFEYA/feya-commerce/issues/91). Active Search v12, public brand design and Product Truth unchanged.

## Goal and architecture

Owner confirms: delivery allowed wherever **Ukrposhta OR Nova Post actually serves exports from Ukraine**, with Russia, Belarus and currently banned/suspended countries blocked. Standard/Express are TheFEYA buyer-level commercial choices: their mapping to a real carrier service requires an explicit owner-approved revision, not heuristics from a generic country list or "EMS is always Express".

**PR #90** provides 209 documentary candidates but NOT current service. **PR #92** verifies per-route/method/parcel evidence with conservative 24-hour freshness. This package persists future verified observations privately, ahead of an authenticated API ingestion rollout.

### Private schema

`supabase/migrations/20261009160000_carrier_method_evidence_private_v1.sql`:

- `feya_commerce_carrier_service_mapping_reviews_v1`: immutable reviewer-linked revision per actual provider service, buyer-visible Standard/Express and ordinary/oversize parcel class. Requires an Auth user and affirmative business review. No reviews are auto-seeded into production.
- `feya_commerce_carrier_method_observations_v1`: immutable timestamped capture (request ID + SHA256 of sanitized carrier response, origin UA, ISO country, optional postal-prefix, method and parcel class, mapping foreign key, available/unavailable, source-adapter version). Prevents duplicate request IDs; enforces maximum 24 hours and rejects already-stale/future observations.
- Both have RLS enabled and grant `SELECT,INSERT` **only** to service role. No anon/authenticated table or RPC access. UPDATE and DELETE rejected via immutable triggers. Never stores API tokens or customer full postal address.
- `feya_commerce_carrier_method_context_v1(country,postal,method,parcel)`: service-only, bounded private reader. Returns proof inputs + authoritative PostgreSQL timestamp; global banned countries return no observations; an evidence flood (over 200) fails closed, never returns a permissive partial set.
- `feya_commerce_carrier_method_health_v1()`: confirms RLS, role grants and immutable triggers, counts mappings and observations. Does NOT claim actual API connections or enable rates/payment.

`lib/commerceCarrierMethodEvidenceStorage.ts` validates exact request fields (browser cannot supply price or availability), invokes the private reader and feeds the current DB timestamp to the pure carrier-proof evaluator from PR #92. Missing evidence => `not_verified`, contradictory/stale => `unavailable`, valid current positive from one provider => `available` for **internal reporting only**. Every response remains `payable=false` with payment/provider flags false.

## Provider documentation and next finite steps

[Ukrposhta official international API documentation 2026-03-09](https://dev.ukrposhta.ua/uploads/International_documentation_09032026.pdf) requires bearer and user tokens obtained through the provider/contract; section 9 has `/countries/delivery-availability` which returns country, actual product/transport and `available`. The API docs explicitly warn that the document may change and expose the latest documentation endpoint. Do not copy tokens to chat or log token-bearing GET URLs.

[Nova Post integration guide](https://api-portal.novapost.com/novaposhta-docs/integration-guide/integration-guide.md) states an active business/contract relationship and authorized representative are required before API key generation; [endpoint instructions](https://api-portal-stage.novapost.com/en/api-nova-post/start/endpoints/) recommend a fixed official Ukraine→World endpoint. There are currently no authenticated live provider responses available to this code; **do not claim any of the 209 reference countries have verified live service**.

### Release gates / remaining work

1. Validate exact-head native PostgreSQL, PGlite, RLS, immutable inserts, PostgREST/browser, TypeScript/build and Search v12 CI before merging this additive schema. Install production migration only after CI is fully green, with zero mappings/observations, RLS private and public payment OFF.
2. Later add bounded real API adapters and proof capture through vetted credentials stored in Vercel secrets. The owner must authorize service-method mappings in the protected administration — do not forge business approval from a Boolean field alone.
3. Harden owner approval and immutable shipping-quote v2 transaction against stale provider source/snapshot. A private lookup alone is **not** a payment-level atomic guard. Check parcel dimensions/postal exceptions and country availability at quote creation AND future Seller Online provider-session creation.
4. [Issue #81](https://github.com/THEFEYA/feya-commerce/issues/81) remains the paid-checkout critical path: exact address/order snapshot, accepted policies, tax, EUR 5 per additional distinct listing and merchant responsibilities. Do not turn this carrier evidence table into a public rate/checkout API.

Business values remain €19 Standard / €35 Express, +€20 per applicable parcel for AU/MX/NZ, and separate handling €5 for each additional distinct canonical listing; 207 saved product manufacture profiles, weekdays Mon–Fri, owner Express 6–9 business days. The saved owner shipping workspace revision 16 is NOT owner-approved for public checkout.
