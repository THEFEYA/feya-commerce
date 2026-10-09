# M2 — защищённое подтверждение профилей упаковки владельцем

**Continuation after PR #104 / Issue #91, 2026-10-09.** Scope: owner-facing admin feature and immutable parcel-envelope attestation for the ACTIVE, specifically approved delivery workspace revision. This is not a new SEO or public storefront design workstream.

## Why this slice is necessary

PR #104 installed the exact shipping-v2 parcel source lookup, but zero real parcel reviews and zero owner-reviewed service mappings exist. In the original schema, creating a review would otherwise require a privileged SQL insert. We must not ask the owner to edit database rows or manually enter 209 possible destination countries. The existing owner company delivery dashboard should show accurate readiness and allow future owner attestation under the same limited, authenticated step-up route, without making shipping payable.

## Implementation

- Private, default-OFF `/api/admin/company/carrier-review` GET/POST. Runs via the existing protected `requireOwnerActionActor('delivery_workspace_draft')`, owner allowlist, same-origin POST, JSON-only 3 KB request cap, and independently disabled `FEYA_COMMERCE_CARRIER_OWNER_REVIEW_ENABLED=false`. The exact path is added to the *narrow* owner step-up allowlist; the global owner-actions switch is not widened.
- Service-only `feya_commerce_owner_carrier_review_context_v1()` returns saved draft revision, current approved version if any, each exact approved shipping profile and its current immutable review. No buyer address, authorization headers, API keys, full product catalog, country wildcard, public tariff or merchant identity leaks. If approval is absent it explicitly says `awaiting_delivery_approval` rather than inventing a default shipping profile.
- Service-only `feya_commerce_confirm_owner_parcel_review_v1(payload,actor_id)` takes the authenticated server actor ID, current approved immutable version, exact shipping profile, selected class, physically measured packed max weight/dimensions, and a short measurement reference. The owner confirms the physical measurement explicitly (unchecked by default). No browser-supplied actor, tariff, country, Express guarantee or provider status is accepted.
- PostgreSQL advisory transaction lock is shared with existing delivery approval writes, preventing a review of a version that changed during the request. Profile capacity must exactly match the saved current approved profile; request ID is the immutable record ID and exact replays do not duplicate records. A different review for the same approved profile/version is rejected; a later reviewed envelope needs a fresh approved version, not a secret UPDATE.
- PostgreSQL computes a SHA256 **digest of the owner measurement attestation** and binds that to real owner auth and approved source revision. This digest is *not* asserted to be a photo/document hash or an independent carrier measurement; it does not prove route availability.
- The new owner panel is placed **under** the existing `/admin/company/delivery` editor (not a new top-level nav, no public visual changes). It shows how many carrier mapping reviews and authentic API observations are on file. If the shipping profile has not been approved, it asks for that step first; if approved, it shows the actual measured package form and immutable reviewed result. No default weight, dimensions or parcel class is assumed. Mobile labels, numeric constraints, keyboard submit and explicit checkbox are included.

## Separate external proof still required

Owner packing measurement does **not** prove that Ukrposhta/Nova Post will accept that parcel internationally. Country/product/transport sources, postal route validation, physical weight+dimensions within provider service, current cost/availability and legal import/export restrictions must be checked through authorized carrier contracts/API keys. Standard/Express mapping must itself have a separate source-backed owner review. Without these, public checkout remains OFF and the 209 documentary destinations are NOT approved.

## Deployment / tests

- New additive migration `20261009224500_commerce_carrier_owner_review_v1.sql`. No destructive changes, no auto-created reviews, no SQL service keys for browsers.
- Unit tests for strict schema, owner actor binding, fail-closed counterfeit source/payment values and route feature flag/CSRF checks.
- Native PostgreSQL 17/PGlite tests extend the actual M2 workspace fixture: no approval → empty context, current approved version → immutable measured review, exact replay + actor mismatch, current owner revision / profile capacity checks, RLS rejects browser users, concurrency-safe retries.
- Release requires **exact PR head FEYA 19/19** including live Auth/browser and ACTIVE Search Release v12 crawler. Only after green, apply migration, verify production 0 owner reviews, 0 live carrier source observations, role grants and Vercel Production READY. The user does not need to confirm synthetic QA data; tests are isolated.
- Keep `FEYA_COMMERCE_CARRIER_OWNER_REVIEW_ENABLED=false` in production until real owner access/auth readiness is confirmed. Enabling this admin review does **not** enable checkout or shipping prices.

## Main MASTER queue, unchanged

1. Issue #91: actual outbound Ukrposhta/Nova Post contract/keys, owner-reviewed FEYA Standard/Express mapping, authoritative parcel/postcode pricing and live proof. No fake success.
2. Issue #81 and #100: contracting seller, EU GPSR, shipping/withdrawal consumer rights, local taxes/customs, Seller Online API v2 approval/keys, verified paid order webhooks/refunds, single guest checkout.
3. Google Ads API Basic access is independently approved by owner screenshot; first-party safe historical metrics smoke test is still separate (HYPD account access alone does not prove FEYA OAuth tokens are configured).
4. Post-first-sale only: carrier events/customer tracking, account/wishlist, promotions, voluntary marketing/CRM.

No re-open of Search v12/Phase 12, Product Truth or frozen public visual.
