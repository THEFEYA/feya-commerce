# M2 — service-only approved shipping quote v2, immutable and expiring

Checkpoint: 2026-10-08. Based on MASTER commerce and owner-confirmed new EUR 19/35 + explicit remote-zone +20 [decision](M2_OWNER_CONFIRMED_EUR_SHIPPING_20261008.md). Follow-up to [PR #75](https://github.com/THEFEYA/feya-commerce/pull/75) and [Issue #77](https://github.com/THEFEYA/feya-commerce/issues/77).

**Engineering, not public launch.** The shipping v2 server wrapper is default OFF and has no public API route. This package does NOT create an actual owner delivery approval, publish tariffs, modify Product Truth/visual/Search v12, create a payment, provider session, tax, service, or order.

## Exact authority chain

1. Browser-shaped request contains only `request_id, quote_receipt_ids, ISO country, normalized postal code, Standard/Express method`. No client amount, currency, quantity, expiration, production readiness or date.
2. Service-only lookup allows same-request replay by a canonical normalized request hash. Exact existing successful receipt is returned even after underlying approved settings change; an attempted substitution with the same request ID conflicts. **Replayed old/expired quotes are never payable**.
3. Service-only resolver `resolveApprovedDelivery` obtains exact approved saved delivery workspace and current immutable merchandise receipts within one database snapshot, calculates profile/parcel/production estimates on the server, and returns `persisted=false; payable=false`.
4. New v2 writer RPC stores only after an atomic in-transaction **recheck**. It serializes same-key writers via advisory lock; takes the shared owner-approved settings lock also used by owner draft-save/approval CAS and row-locks the selected active offer heads. It calls the existing current-approval/merchandise resolver again. Owner-approval version, workspace version/hash, catalog hash, product prices and method/country must still match; missing/expired product quotes fail closed.
5. Database generates immutable storage ID, created timestamp and **15-minute expiry** (internal provisional engineering TTL; no consumer promise). Parcel sums/unit totals and EUR rates/currency are checked again. Persisted v2 response is `payable=false`, `payment_enabled=false`, `provider_session_enabled=false`, `public_rates_enabled=false`. Original timestamps/amounts cannot be rewritten.
6. Future checkout must re-evaluate shipping quote expiry, exact address, merchandise snapshot, tax, discounts, services, policy acceptance and provider transaction identity *again* before a payment session. **Persisted does not mean purchasable.**

## Isolation

- Additive table `feya_commerce_approved_shipping_quote_receipts_v2` with RLS enabled, no anon/authenticated table privileges.
- Service-role-only lookup/write/health RPCs. No arbitrary public web write path or permissions.
- Private country/postal and hashes stay in service-only records, never in GA4 or public event payloads.
- The existing legacy `GLOBAL` shipping v1 and unpersisted approved resolution v1 are untouched.

## Validation (before merge)

- Exact head search tests, TypeScript, full Next build, native PostgreSQL delivery tests (including concurrent same-key receipt replay and offer/approval drift), Supabase Auth/PostgREST browser tests, active Search v12 production crawler.
- No production migration before tested head is accepted; install only reviewed additive SQL. After installation with **zero approved owner profiles** the service must still fail closed, with zero v2 receipts and no public rates.
- Corrected limits or access issues require new exact-head CI run. Do not cite earlier green runs from other commits.

## Remaining human gates

Owner must approve exact served-country list, remote-country/postal exceptions, quantity/parcel limits, cutoff, holidays, bulky-product specific profiles, and consistent EUR delivery profiles in the protected owner workspace. Real Seller Online mode/currency/tax/returns and checkout remain separate dependencies; do not invent them.
