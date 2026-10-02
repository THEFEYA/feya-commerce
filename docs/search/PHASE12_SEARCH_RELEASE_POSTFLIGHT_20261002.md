# Phase 12 — Search Release Final Postflight — 2026-10-02

Canonical coordination source: **TheFEYA Master Storefront, Search & Performance Architecture v1.0**, Phase 12.

Status: **SEARCH RELEASE ACTIVE / TECHNICAL POSTFLIGHT PASS**

This is a dated append-only checkpoint. It supersedes the operational status sections of
`PHASE12_SEARCH_RELEASE_READINESS_20261001.md`; the earlier document remains historical evidence
and is not rewritten as though its pre-activation blockers never existed.

## 1. Exact active Search Release

- release code: `organic-wave-a-20260926`
- release version: `12`
- release id: `2dc86d7c-6269-5327-9154-6b5178931254`
- approved immutable release hash: `05d79c4ddc07da7e7fc60045f6ad39fabea40cb16f702bcfb6ea3b154d4bcd0b`
- release application SHA: `7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7`
- release status: `ACTIVE`
- ACTIVE Search Release count: **1**
- activation execution request: `53b603f3-479c-4117-9faa-aa7b962b2ca9`
- activation receipt: `SUCCEEDED`
- payment enabled by activation: **false**
- order creation enabled by activation: **false**

Human Owner approved the exact v12 id/hash/SHA tuple in chat before activation.
The approval was bound to the execution request hash; activation was executed only after K01–K20 had
zero FAIL rows.

## 2. Final Phase 12 release corpus

Exact sitemap/index corpus: **18 URLs**.

1. `/`
2. `/collections`
3. `/collections/shoulder-armor`
4. `/collections/festival-outfits`
5. `/collections/rave-outfits`
6. `/collections/burning-man-outfits`
7. `/collections/performance-costumes`
8. `/collections/bodysuits`
9. `/collections/costume-masks`
10. `/collections/costume-headpieces`
11. `/collections/festival-skirts`
12. `/collections/costume-belts`
13. `/about`
14. `/size-guide`
15. `/care`
16. `/shipping`
17. `/returns`
18. `/contact`

Noindex dependencies remain outside the sitemap:

- all 207 PDPs;
- `/shop`;
- `/cart`;
- `/account`;
- query/filter states.

Retired owner URLs remain redirects and are not release members:

- `/collections/burning-man-looks` -> `/collections/burning-man-outfits`
- `/collections/stage-outfits` -> `/collections/performance-costumes`

## 3. Environment and runtime cutover

Production-only launch controls are now configured:

- `FEYA_SEARCH_INDEXING_ENABLED=true`
- `FEYA_CANONICAL_ORIGIN_CONFIRMED=true`
- `NEXT_PUBLIC_SITE_URL=https://thefeya.com/`

Preview/development are not granted the production launch switch.

The environment cutover exposed a real Next.js Cache Components problem: release-aware metadata was
being evaluated in a build/static context even though ACTIVE Search Release is mutable governance.
The failed redeploy was not promoted.

Postflight fix:

- `releaseRobotsForPath()` resolves release state after `connection()`;
- collection release-bound metadata resolves at request time;
- the visible collection payload remains cacheable;
- a null runtime marker in the root layout supplies the dynamic boundary required by Next.js;
- visual storefront composition remains frozen.

Final application commit for this runtime fix:

`8b85ab66b8f6784b0a0eb2d9e39cfb75515a3b67`

Production deployment:

`dpl_EsEfPu35SnBcmFW1ZG99G26SyppK = READY`

The matching main CI completed **18/18 SUCCESS**.

## 4. Live canonical-origin postflight

On the final production deployment:

- all 18 Wave A URLs return HTTP 200;
- all 18 emit `robots=index, follow`;
- all 18 emit the exact intended self-canonical;
- `robots.txt` is HTTP 200, allows public crawl, blocks `/admin/` and `/api/internal/`, and advertises `https://thefeya.com/sitemap.xml`;
- `sitemap.xml` is HTTP 200 and contains exactly the 18 active release URLs;
- representative PDP remains `noindex, follow, nocache` with self-canonical;
- `/shop?piece=Skirt` remains `noindex` and canonicalizes to `/shop`;
- `www.thefeya.com` redirects to the canonical apex host;
- no Product Truth, checkout, payment or order-creation mutation was introduced by Search Release activation.

## 5. Search Console activation

Verified property:

`sc-domain:thefeya.com`

Permission observed by the connected account:

`siteOwner`

The live sitemap was re-submitted after activation:

`https://thefeya.com/sitemap.xml`

Submission accepted by Google Search Console at:

`2026-10-01T23:51:01.502Z`

Immediate state is correctly **pending download**. Historical warning/error counts are not treated as
current post-launch verdicts until Google downloads the newly submitted sitemap.

The exact 18 release URLs were added to the GSC indexing tracker:

- tracker id: `e983074f-2440-4fe6-b71c-b30265016929`
- tracked URLs: 18
- initial tracker state: 18 pending

A launch-baseline URL Inspection was also captured for all 18 URLs. It reflects Google's historical
pre-launch crawl state: several old URLs were last seen with `noindex`, while the new collection
owners were unknown to Google. This is expected immediately after the switch and is **not** evidence
that the live pages still emit noindex; live origin verification above is authoritative for current HTML.

## 6. Merchant Center boundary

Connected Merchant Center account:

- display name: `FEYA`
- Merchant Center id: `5322859215`

Current observed state:

- products: **0**
- account issue: `missing-ad-words-link` / no Google Ads account linked
- connected HYPD Google Ads accounts `2333697098` and `1687683400` currently show no Merchant Center links.

Therefore Phase 12's **search** release is complete, but no Merchant product/feed activation is claimed.
Merchant activation remains a separate commerce-readiness lane. It must not be faked by publishing an
empty feed or by bypassing current checkout/payment/legal-identity gates.

## 7. Phase 12 closure

Phase 12 acceptance is complete for the Search Release:

- exact owner-approved corpus: PASS;
- ACTIVE release is the only sitemap authority: PASS;
- canonical-origin anonymous crawl/postflight: PASS;
- Search Console Domain property: PASS;
- sitemap submission after activation: PASS (Google processing pending);
- visual freeze: preserved;
- checkout/payment/order creation: unchanged/off.

The next canonical phase is **Phase 13 — Post-launch learning loop**.

