# Phase 13 — Post-launch Baseline — 2026-10-02

Canonical coordination source: **TheFEYA Master Storefront, Search & Performance Architecture v1.0**, Phase 13.

Status: **BASELINE OPEN / DO NOT OPTIMIZE FROM ZERO-DAY DATA**

Loop:

`measure -> diagnose -> improve / consolidate / expand`

## 1. Search measurement baseline

Search Release v12 is active with exactly 18 indexable URLs.

Google Search Console:

- Domain property: `sc-domain:thefeya.com`
- exact 18 launch URLs are tracked;
- launch-day URL Inspection baseline captured for all 18;
- sitemap re-submitted and downloaded successfully by Google;
- current GSC performance on the new launch corpus is effectively zero-day data.

Current sitemap processing result:

- last submitted: `2026-10-01T23:51:01.502Z`
- last downloaded: `2026-10-02T00:24:55.721Z`
- submitted URLs: 18
- indexed URLs reported by sitemap report: 0
- warnings: 0
- errors: 0

The 18 launch URLs were rechecked in the indexing tracker after the sitemap download. All remain not indexed on launch morning. Several new collection owners are now reported as `Discovered - currently not indexed`; older foundational pages still show historical pre-launch `noindex` crawl evidence dated 2026-09-27. This is expected zero-day propagation and must not trigger copy/ownership changes.

Do not change query ownership, titles, H1s, collection copy, internal-link ownership, membership or
HOLD status from this baseline alone.

## 2. GA4 measurement readiness

The code-side measurement contract exists and is release-aware.

Live measurement context on `/` currently resolves:

- production environment: true
- active release id: `2dc86d7c-6269-5327-9154-6b5178931254`
- page id and page version id: present
- `measurement_enabled=false`
- `ga4_measurement_id=null`

The production measurement gate requires:

- `FEYA_ANALYTICS_ENABLED=true`
- `FEYA_ANALYTICS_PRIVACY_READY=true`
- valid `FEYA_GA4_MEASUREMENT_ID=G-...`
- public legal identity ready
- user consent before GA4 client events are sent.

These gates must remain fail-closed until legal/privacy identity is correct.

Accessible historical GA4 properties currently include:

- `properties/394585031` — Feya-Portupeya.com.ua - GA4
- `properties/394613305` — Etsy shop property
- `properties/424292347` — FEYA (Shopify)

The Shopify-era GA4 property is linked to Google Ads customer `2689466396`, but it must not be
silently assumed to be the correct new-storefront web stream. The new storefront's Measurement ID
must be verified explicitly before enabling production analytics.

## 3. Privacy/legal-identity blocker

The production `/privacy` route currently fails closed as 404/noindex because the public legal
identity gate is not satisfied.

The application requires explicit trusted values for:

- `FEYA_PUBLIC_LEGAL_IDENTITY_CONFIRMED=true`
- `FEYA_PUBLIC_LEGAL_NAME`
- `FEYA_PUBLIC_LEGAL_ADDRESS_LINE1`
- `FEYA_PUBLIC_LEGAL_ADDRESS_CITY`
- `FEYA_PUBLIC_LEGAL_ADDRESS_POSTAL_CODE`
- `FEYA_PUBLIC_LEGAL_ADDRESS_COUNTRY`
- optional address line 2 / region.

Public contact email is already fixed in code as:

`manager.feya@gmail.com`

Do **not** substitute Seller Online LLC's Pennsylvania service address as TheFEYA's own legal seller
identity unless the actual contracting / merchant-of-record relationship explicitly makes that legally correct.
The stored project history treats Seller Online as a planned payments/seller service and separately notes that
its address is not automatically TheFEYA's legal identity.

Until this is resolved:

- keep GA4 production collection disabled;
- keep the privacy/consent gate fail-closed;
- do not claim Merchant/checkout readiness.

## 4. Merchant / commerce baseline

Merchant Center `5322859215` currently contains zero products and reports no Google Ads link.

No product feed activation or Shopping readiness is inferred from Search Release completion.

Before Merchant launch, independently verify:

- legal seller / merchant-of-record identity;
- public privacy/terms surface;
- checkout/payment readiness for the actual purchase model;
- Merchant Center product source/feed;
- Merchant Center <-> intended Google Ads link;
- product approval diagnostics after products exist.

## 5. Evidence rules for Phase 13 decisions

No page is promoted, consolidated or rewritten merely because it exists in Product DNA.

Use post-launch evidence to change only when supported by:

- GSC query/page data;
- GA4 session/ecommerce data once production measurement is legally enabled;
- commerce outcomes;
- current Product Truth;
- immutable Search Release / change history.

Preserve the visual freeze and one-intent-one-owner discipline.

## 6. Immediate next work

Autonomous:

1. monitor the submitted sitemap and the 18-URL indexing tracker;
2. establish the exact legal/privacy identity source without guessing;
3. resolve the correct GA4 Measurement ID / web stream for the new storefront;
4. only then enable consented production analytics;
5. inspect Merchant/Ads linkage only after seller/payment/feed readiness is real.

Human Owner is needed only for facts that cannot be safely derived from trusted project records:
the actual contracting legal seller identity/address, or an explicit decision that another entity is the
merchant of record.



## 7. Current human/external blockers after autonomous checks

### Public legal seller identity

Prior project records and past owner conversations do **not** contain an approved public legal seller
name/address for the new storefront.

Known facts must not be conflated:

- TheFEYA is the brand/studio.
- Seller Online LLC is a planned US payment/reseller service; its Pennsylvania service address is not
  automatically TheFEYA's public legal seller address.
- public contact email is `manager.feya@gmail.com`.

Therefore the privacy/legal identity gate must remain fail-closed until the Human Owner supplies or
explicitly approves the actual contracting seller / merchant-of-record identity and address.

### GA4 web stream

Accessible GA4 properties include the historical Shopify property, but no trusted source currently exposes
the new storefront's correct `G-...` Measurement ID.

Do not reuse the historical Shopify stream by assumption.

### Merchant / Ads link

Merchant Center `5322859215` still has zero products and reports no Google Ads link.

The account `1687683400` is explicitly a Keyword Planner research account and must not be used for
production ads.

The other connected Google Ads account `2333697098` is not linked to Merchant Center in the observed
state. Production Merchant linking must be deliberate and must not be inferred solely from the account name.


## 8. Legal/privacy correction adopted

The project no longer blocks the public Privacy / Terms routes solely because the owner's former sole-proprietor
registration is inactive.

Current split:

- Privacy / Terms: public, truthful, noindex trust/OAuth surfaces;
- GA4: still disabled until the actual privacy-controller identity and correct production web stream are verified;
- Seller Online: separate commerce role gate; not presented as active until payment + role confirmation are both true;
- Merchant Center: still held until real checkout/business identity/feed readiness exists.

Canonical rationale:
`docs/search/MASTER_AMENDMENT_LEGAL_PRIVACY_COMMERCE_20261002.md`.
