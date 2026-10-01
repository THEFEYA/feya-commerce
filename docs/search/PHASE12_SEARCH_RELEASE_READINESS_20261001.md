# Phase 12 — Search Release Readiness — 2026-10-01

Canonical source: **TheFEYA Storefront, Search & Performance Architecture v1.0**, Phase 12.

This checkpoint covers readiness, owner-decision implementation and materialization of a fresh immutable Wave A v10. It does **not** prepare or activate Search Release indexing.

## 1. Phase 12 MASTER contract

Phase 12 requires:

1. owner approval of the exact Wave A corpus;
2. sitemap generated only from the ACTIVE Search Release;
3. anonymous crawl validation of 200/404/redirect/canonical/noindex state;
4. Search Console / Merchant activation only after the technical gate.

The storefront already enforces item 2:
- `app/sitemap.ts` reads only ACTIVE release `INDEX_CANDIDATE/index` items;
- `app/robots.ts` advertises the sitemap only when an ACTIVE release exists.

## 2. Owner decisions resolved on 2026-10-01

Human Owner decisions:

- APPROVED: `/collections/burning-man-looks` -> `/collections/burning-man-outfits`;
- APPROVED: `/collections/stage-outfits` -> `/collections/performance-costumes`;
- KEEP: Costume Headpieces in Wave A;
- KEEP: public `Maleficent` persona label;
- delegated `/shop` launch indexability to engineering judgment.

Engineering decision for `/shop` after live governance check:

- keep `/shop` crawlable but **noindex** in first Wave A;
- reason: the canonical `/shop` page exists and Phase 7 filtering/direct-load controls are complete, but hosted Search Portfolio currently has **no immutable page_version and no primary query ownership for /shop**;
- do not fabricate a search owner/content version merely to place the broad catalog page in the sitemap;
- reconsider /shop indexing after post-launch evidence or a separately governed Search Portfolio decision.

Therefore first Wave A remains **18 index candidates**, with the two approved canonical route replacements and no /shop index candidate.

## 3. Owner-approved route rename implementation

Hosted migration applied successfully:

`phase12_owner_route_renames_v1`
repository file:
`supabase/migrations/20261001143000_phase12_owner_route_renames_v1.sql`

The migration is fail-closed and required:
- ACTIVE Search Release count = 0;
- exact two source page identities/candidate codes;
- no target URL collision;
- immutable new page versions instead of mutating existing versions;
- zero stale old-route references in every latest page content version.

Hosted postflight:

- `/collections/burning-man-outfits`
  - seo_page_id `fd5b7f21-f66d-5616-a33c-3d0c6974ad96`
  - canonical `https://thefeya.com/collections/burning-man-outfits`
  - latest page version v3
- `/collections/performance-costumes`
  - seo_page_id `8c40a74a-0a49-513a-832a-66bf0cb1b1c2`
  - canonical `https://thefeya.com/collections/performance-costumes`
  - latest page version v3

URL history now contains:
- closed old Burning Man route + active new route;
- closed old Stage route + active new route;
- `change_reason = OWNER_APPROVED_PREINDEX_ROUTE_RENAME`;
- `source_type = human_owner`.

Latest-content graph:
- old canonical page count: 0;
- stale latest content references to either old URL: 0;
- ACTIVE Search Release count: 0.

Nine of the ten commercial owner pages now have v3 latest content because their own path or related links changed. Rave Outfits remains v2 because its current content contained neither retired URL. The Burning Man editorial guide also received a new immutable version because it linked to the old commercial owner.

Application contract:
- current candidates use `burning-man-outfits` and `performance-costumes`;
- global navigation and discovery hubs link directly to the new canonical URLs;
- visible owner-approved labels are unchanged;
- old URLs have permanent redirects in `next.config.ts`;
- the former pre-approval 404 middleware gate is removed.

## 4. Exact first Wave A corpus after owner decisions

Index candidates:

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

Explicitly not index candidates in Wave A:
- `/shop` — crawlable/noindex dependency;
- all 207 PDPs — Wave B / noindex dependencies;
- query/filter states;
- editorial guide candidates not yet released;
- HOLD owner candidates.

Costume Headpieces stays in the 18-page corpus by owner decision.
Maleficent remains a non-owner shopper filter/persona label by owner decision and does not create an indexable page.

## 5. Foundational exact-binding refresh

Phase 12 refreshed the eight foundational Wave A pages to immutable **v2** because their old Phase G v1 source blobs no longer matched the current Phase 11-validated storefront files.

Hosted migration applied successfully:

`phase12_foundational_page_versions_v2`

Postflight:
- 8/8 latest foundational versions = v2;
- exact current Git blob SHA match = 8/8;
- current title/H1 match = 8/8;
- content hash equals SHA256(content_json::text) = 8/8;
- content status = CQA_PASS;
- release status = HOLD;
- ACTIVE Search Release count remains 0.

This closes the K11 source/version drift before a new release is materialized. Historical foundational v1 rows remain immutable.
## 6. Fresh immutable Wave A v10

After the owner-approved routes, foundational page versions and full Phase 12 CI were green, a new immutable release snapshot was materialized.

Hosted v10:

- code: `organic-wave-a-20260926`
- version: `10`
- release id: `b35147c7-2be1-5de7-87a4-36ea92d2d2f5`
- release hash: `5c110b89aa6cd6a22cc7eca23fc78ad71f305e1e66810ec92aa6dbf0e83f39df`
- git SHA: `51f4973a516bcd1205d123681f66dc2ff2d44bfb`
- release status: `GATE_FAILED`
- FEYA validation: `36868549729 = SUCCESS`
- Vercel deployment: `dpl_Hi5Nszioi84NjDhDBwTNE4573RQi = READY`
- total release items: 228
- index candidates: 18
- noindex dependencies: 210
- product noindex dependencies: 207
- active Search Release count after materialization: 0

Release scope uses the owner-approved canonical routes:

- `/collections/burning-man-outfits`
- `/collections/performance-costumes`

The retired routes are not present in the v10 item set.

Product dependencies bind to the current immutable
`feya_storefront_approved_product_bindings_v1.content_sha256`
for all 207 approved PDPs rather than the now-null legacy draft `proposal_hash`.

Fresh gate summary:

- PASS: 13
- EXCLUDED_APPROVED: 3
- FAIL: 4
- failed gates: `K02`, `K14`, `K19`, `K20`

The release remains intentionally non-active.

### 6.1 Historical v9 release

Previous materialized release:

- version: 9
- release id: `e6f3b105-b23b-5623-93ae-9e5ba36ac5c3`
- hash: `26cfb3598d009633c3cf44095a4c46ddc97ea961f25b142dad682ed69815fc7b`
- historical git SHA: `3bde4097e7b1d038f34ab44d39b38675c96333da`
- status: `GATE_FAILED`

Do not reactivate v9. It contains retired owner URLs and predates Phases 8–11 plus the owner-approved rename migration.

## 7. Current FAIL gates

### K02 — canonical production origin

Fresh 2026-10-01 public behavior still returns HTTP 502 for `https://thefeya.com/`.

User reports the domain has been configured in Vercel, but current public behavior is the release authority. K02 remains FAIL until the canonical host serves the validated storefront correctly.

Required:

- verify `thefeya.com` project assignment/DNS;
- verify `www.thefeya.com` redirect/canonical behavior;
- confirm canonical origin serves the storefront represented by git SHA `51f4973a516bcd1205d123681f66dc2ff2d44bfb`.

### K14 — anonymous production crawl

Blocked by K02.

After canonical domain resolution:

- crawl the exact 18-page Wave A corpus anonymously on the production origin;
- verify 200/308/404/canonical/robots state;
- verify both retired owner routes 308 to the new canonical routes;
- verify `/shop`, all 207 PDPs, filter/query states and private routes remain outside the index corpus.

### K19 — Search Console Domain property

Fresh GSC Wizard check on 2026-10-01 still lists only:

`https://thefeya.com/`

Required Domain property:

`sc-domain:thefeya.com`

The current tools can register an already verified Domain property but cannot perform its DNS verification. K19 stays FAIL until that property is verified in Google Search Console and connected to GSC Wizard.

### K20 — exact release-hash owner approval

The Human Owner approved the corpus and route/taxonomy decisions, but the exact newly materialized immutable release hash has not yet been approved.

Exact approval target:

- release id: `b35147c7-2be1-5de7-87a4-36ea92d2d2f5`
- release version: `10`
- release hash: `5c110b89aa6cd6a22cc7eca23fc78ad71f305e1e66810ec92aa6dbf0e83f39df`
- git SHA: `51f4973a516bcd1205d123681f66dc2ff2d44bfb`
- index candidate count: 18

K20 must remain FAIL until the owner explicitly approves this exact immutable release.

## 8. Activation boundary

`feya_search_prepare_release_activation_v1` is **not a dry-run**.

It:

- requires exact release id/hash/git SHA;
- requires exactly 20 gates and zero FAIL;
- creates an `ACTIVATE_SEARCH_RELEASE` execution request;
- changes release state to `APPROVAL_REQUIRED`.

Therefore:

- do not call prepare/execute activation while K02/K14/K19/K20 remain FAIL;
- do not submit sitemap or activate Merchant/Search Console release before the technical gate;
- preserve ACTIVE release count = 0.

## 9. Remaining Phase 12 work

The release itself now exists. Remaining work is limited to the four fail-closed gates:

1. resolve canonical production origin serving so K02 can pass;
2. run the anonymous production-origin crawl so K14 can pass;
3. verify/connect `sc-domain:thefeya.com` so K19 can pass;
4. obtain explicit Human Owner approval of the exact v10 release id/hash so K20 can pass;
5. after all 20 gates are PASS / EXCLUDED_APPROVED, call the governed prepare/approval/execute activation flow;
6. only after activation, verify sitemap/robots against the exact ACTIVE release and perform Search Console submission/postflight.

No Search Release has been activated by this branch.
