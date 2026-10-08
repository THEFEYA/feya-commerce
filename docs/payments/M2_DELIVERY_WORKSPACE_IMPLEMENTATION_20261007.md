# TheFEYA — M2 draft delivery workspace

Continuation of MASTER v1.2, PR #70 and the owner's shipping clarification of 2026-10-07. Search Phase 12 stays closed. Public visuals, Product Truth, active offers and policies are unchanged.

## Implemented

The existing Company admin adds **Система → Доставка и изготовление**, `/admin/company/delivery`:

- Named shipping profiles, Standard/Express, explicit EUR/USD currency, served-country allowlists, country/zone/postal-prefix exceptions and disabled methods.
- Production profiles, including the owner's 1–3 / 3–5 / 5–7 / 7–10 examples. New profiles leave day basis, calendars and quantity capacity unset until supplied.
- Product and exact `configuration_price_id` assignments. Configuration → product → default precedence resolves shipping and production independently. Assignments do not mutate product content, DNA, prices or SEO.
- Explicit parcel rules: one parcel charged at the highest applicable rate, or separate parcels by profile with declared capacity. Neither rule is a universal default.
- Protected server preview of current offer currency, cost and production/dispatch/arrival civil-date windows. It uses the saved revision and server time; unsaved or stale settings cannot masquerade as the calculated version.
- Private immutable workspace revisions, SHA-256 evidence, verified owner actor, compare-and-swap and request-id retries. Renaming retains profile IDs; replaying an old success does not rewind the head.

Results say `draft_only=true`, `payable=false`, `payment_enabled=false`. There is **no publish/activate action** in this package. The $19/$35 button creates an unassigned USD owner draft, not an approved EUR tariff. The migration seeds no example settings.

## Storage and access

Migration `20261007211548_commerce_delivery_workspace_draft_v1.sql` was named with Supabase CLI 2.117.0.

| Object | Purpose |
| --- | --- |
| `feya_commerce_delivery_workspace_versions_v1` | Immutable draft and actor/request/revision/hash evidence |
| `feya_commerce_delivery_workspace_head_v1` | One mutable draft pointer, not an active rate head |
| `feya_commerce_delivery_workspace_health_v1()` | RLS, privileges, RPC access and immutable-history check |
| `feya_commerce_read_delivery_workspace_v1()` | Protected current revision; initially revision 0, no draft |
| `feya_commerce_delivery_catalog_v1()` | Offer-backed product/configuration IDs and authoritative currencies |
| `feya_commerce_save_delivery_workspace_v1(uuid,bigint,jsonb,uuid)` | Service-only atomic draft save using verified owner actor |

Tables have RLS and no anon/authenticated grants. Service role can SELECT but cannot directly INSERT/UPDATE/DELETE; writes use the bounded draft RPC. SECURITY DEFINER functions have empty search paths and explicit service-only execution grants. Actor IDs are retained with immutable revisions. Indexes cover head/version and actor references.

The API reuses owner allowlist/step-up authentication, private/no-store headers, same-origin POST checks, bounded request reading and strict validation. It accepts no browser actor, approval, clock or public payment capability. Its endpoint is in the exact owner step-up set; unrelated preview mutations stay blocked. The admin page serializes no privileged data before API authentication. No credentials reach client components.

`FEYA_DELIVERY_WORKSPACE_DRAFT_ENABLED` is a separate server-only, default-off scope. Draft access requires verified owner authentication and the existing allowlist; it never enables `FEYA_OWNER_ACTIONS_ENABLED`, price actions, approved shipping rates or payments. Runtime acceptance runs this draft scope with general owner actions explicitly disabled, and proves unrelated price actions remain locked. The first real-browser run correctly denied an anonymous RPC with PostgreSQL `42501` / HTTP 401; its test is corrected to distinguish unauthenticated 401 from authenticated 403 rather than misclassifying correct denial as a failure.

Production preflight found `/admin/company/system` and an existing owner API return 503 while admin authentication is disabled. The Vercel environment-list connector returned 403. Its mapped CLI metadata-only fallback (CLI 62.7.0, exact production project/team) found no existing credentials; its attempted login flow was stopped without signing in. Migration and deployment alone therefore cannot be reported as a usable production owner workspace until protected access is verified. Existing owner identities are not guessed and the general owner-actions switch is not enabled for this feature.

## Preview rules and limits

- Default rates apply only to explicitly served ISO countries.
- Longest postal prefix → country → zone → default. Equal-specificity matches reject. A disabled method in the selected rule never falls back to a cheaper rate.
- Countries with postal exceptions require postal input before a country/default fallback can be evaluated.
- Missing rates, currency mismatch, missing day basis/calendars/time zone/cutoff, excess quantity, missing profiles and pending required custom specifications stop calculation with a specific reason.
- Production capacity is checked across all lines sharing a profile. Durations are not multiplied or shortened speculatively.
- One parcel waits for all production lines and takes conservative arrival bounds across applicable transit rules. Separate-profile parcels charge once per capacity-sized parcel; a partial last parcel has the same declared rate. The admin explains this; the owner must confirm live applicability later.
- Dates are civil dates in the studio scheduling time zone. They begin at server now for a scenario, not a confirmed production slot, destination-local timestamp or event-date guarantee.
- This is shipping-only preview, without merchandise grand total, taxes/duties, services/discounts, PII, payment session or order creation. Public checkout requires approved successor authority. The old GLOBAL shipping v1 receipt is not reused for country/profile calculations.

## Verification and deployment receipts

Local acceptance: 422/422 search tests; focused DB suite 8 passing and one native concurrency case reserved for PostgreSQL CI; TypeScript, scoped Next flat ESLint (zero errors/warnings), full build, admin boundary, 45-file Product OS visual freeze and owner UI contract pass.

CI extends the existing PostgreSQL 17 matrix with `delivery-workspace` and the existing isolated Supabase runtime with authenticated save/rename/assignment/preview, origin/actor/public-RPC denial, retries/concurrency and desktop/mobile screenshots. No separate pipeline is introduced. Local Chromium download was unavailable; the first CI run also stalled during the browser download. CI uses the runner's installed Chrome through Playwright's supported `chrome` channel, retaining bounded bundled-Chromium installation if Chrome is absent. It records the actual channel/version; all Auth/PostgREST/browser scenarios still run. The implementation PR records these receipts after completion.

Browser verification caught implicit select labels containing option text and mobile intrinsic grid/table widths exceeding the viewport. Selects now have names matching visible labels; zero-minimum grid tracks, bounded children and an internally scrolling assignment table contain long configuration text. The new workspace declares readable notice/hint colors for the existing dark owner shell and 16px mobile inputs. These changes are confined to this new private module. Screenshots wait for fonts, start at the top and disable animations; a failed width assertion preserves element-bound diagnostics and the mobile screenshot.

Production apply is additive and initially empty: revision 0, zero workspace versions, no active rates, all public/payment gates false. Apply result, scoped advisors, exact deployment SHA and anonymous API denial are recorded in the PR. Migration presence in Git alone does not prove production apply.

## Next finite continuation

8 October continuation: [exact saved-version approval](M2_DELIVERY_APPROVAL_IMPLEMENTATION_20261008.md) adds mechanical completeness checks and separately gated immutable Human Owner approval. It seeds no settings and does not publish public cart rates or payments. Production owner authentication remains a real external access blocker; the 8 October Vercel environment-list request returned 403 again. The following public-quote/checkout work still requires its versioned successor.

1. Review currency, served countries, parcel behavior, production capacity/day basis/calendar/cutoff. These are business facts, not inferred from example prices.
2. Implement approval/publication of exact immutable versions and a destination/basket-bound successor quote. Add country-first read-only cart estimates before full contacts and policy acceptance.
3. Bind exact shipping receipts into intent/snapshot successors, revalidating current offers, destination, saved versions and expiry. Taxes/services/discounts need separate authoritative lines.
4. Confirm Seller Online mode/role/credentials and transaction disclosures, then prove sandbox payment and signed, replay-safe paid-order results.
5. Production GA4 stream and consented analytics remain a separate line requiring actual privacy-controller facts. Do not substitute the old Shopify stream.

Gift services, minimal coupons, opted-in CRM/recovery and referrals stay in the owner's execution plan; they are not falsely marked implemented. Full affiliate payouts/recovery/priority automation follow basic paid-order/capacity proof. Private preparation does not justify raising the former 75–80% full launch estimate or repeating the closed search launch.
