# Phase 12 — Search Release Readiness — 2026-10-01

Canonical source: **TheFEYA Storefront, Search & Performance Architecture v1.0**, Phase 12.

This checkpoint covers readiness, owner-decision implementation and materialization of the current immutable Wave A v11. It does **not** prepare or activate Search Release indexing.

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
## 6. Current immutable Wave A v11

After the canonical production origin was repaired, the strict production crawl passed, and the PDP runtime bottleneck was removed with the governed 207-product detail snapshot, a new immutable release snapshot was materialized.

Hosted v11:

- code: `organic-wave-a-20260926`
- version: `11`
- release id: `a76e38e8-1545-5bd9-a82e-558bf5a8f42f`
- release hash: `a8f0469a57ce54f2b563dd43f80e7c6df7080b3c02b58d5d74563231c6145967`
- production application git SHA: `97437ccb5aedc314bf98ddcf5850422876a28b46`
- release status: `GATE_FAILED`
- FEYA validation: `36912038552 = SUCCESS`
- Vercel production deployment: `dpl_HSAskAJ4g66ibwaJcuPEwA6xEFLJ = READY`
- strict production crawl job: `110536787495 = SUCCESS`
- crawl evidence artifact: `11187326919`
- total release items: 228
- index candidates: 18
- noindex dependencies: 210
- product noindex dependencies: 207
- ACTIVE Search Release count: 0

The v11 corpus is an exact scope continuation of v10. The owner-approved canonical routes remain:

- `/collections/burning-man-outfits`
- `/collections/performance-costumes`

The retired routes are not present in the v11 item set.

Strict production crawl result on the canonical origin:

- 18/18 Wave A index candidates passed the pre-activation canonical/noindex contract;
- 24/24 deterministic PDP HTTP sample passed, backed by the exact 207-PDP noindex manifest;
- 2/2 retired owner redirects passed;
- 3/3 utility noindex routes passed;
- filter noindex state passed;
- errors: 0.

The request-time PDP timeout found during the first crawl was not hidden or waived. It was fixed by materializing the exact approved 207-product PDP payload once and retaining live fail-closed approval/path/hold checks through lightweight indexed joins. The migration is tracked as `phase12_pdp_detail_snapshot_v1`.

Current gate summary:

- PASS: 15
- EXCLUDED_APPROVED: 3
- FAIL: 2
- failed gates: `K19`, `K20`

The release remains intentionally non-active.

### 6.1 Historical v10 release

v10 remains historical and must not be activated:

- version: 10
- release id: `b35147c7-2be1-5de7-87a4-36ea92d2d2f5`
- hash: `5c110b89aa6cd6a22cc7eca23fc78ad71f305e1e66810ec92aa6dbf0e83f39df`
- historical application git SHA: `51f4973a516bcd1205d123681f66dc2ff2d44bfb`
- status: `GATE_FAILED`

v11 supersedes v10 because production serving/crawl evidence and the application SHA changed after v10 was materialized.

## 7. Current FAIL gates

### K19 — Search Console Domain property

Fresh GSC Wizard check on 2026-10-01 still lists only:

`https://thefeya.com/`

A direct registration attempt for:

`sc-domain:thefeya.com`

returns that the Domain property does not yet exist in the connected Google Search Console account.

Required:

1. add `thefeya.com` as a **Domain** property in Google Search Console;
2. complete Google's DNS TXT verification;
3. after Google shows it as verified, connect/register `sc-domain:thefeya.com` in GSC Wizard.

K19 stays FAIL until that property is verified and readable.

### K20 — exact v11 release-hash owner approval

The Human Owner approved the corpus and route/taxonomy decisions, but the exact newly materialized immutable v11 release hash has not yet been explicitly approved.

Exact approval target:

- release id: `a76e38e8-1545-5bd9-a82e-558bf5a8f42f`
- release version: `11`
- release hash: `a8f0469a57ce54f2b563dd43f80e7c6df7080b3c02b58d5d74563231c6145967`
- production application git SHA: `97437ccb5aedc314bf98ddcf5850422876a28b46`
- index candidate count: 18
- noindex dependency count: 210

K20 must remain FAIL until the Human Owner explicitly approves this exact v11 id/hash/SHA tuple.

## 8. Activation boundary

`feya_search_prepare_release_activation_v1` is **not a dry-run**.

It:

- requires exact release id/hash/git SHA;
- requires exactly 20 gates and zero FAIL;
- creates an `ACTIVATE_SEARCH_RELEASE` execution request;
- changes release state to `APPROVAL_REQUIRED`.

Therefore:

- do not call prepare/execute activation while K19/K20 remain FAIL;
- do not submit sitemap or activate Merchant/Search Console release before the technical gate;
- preserve ACTIVE release count = 0.

## 9. Remaining Phase 12 work

The technical production-origin and anonymous-crawl gates are closed. Remaining work is now limited to the two Human/external gates:

1. verify/connect `sc-domain:thefeya.com` so K19 can pass;
2. obtain explicit Human Owner approval of the exact v11 release id/hash/SHA so K20 can pass;
3. after all 20 gates are PASS / EXCLUDED_APPROVED, call the governed prepare/approval/execute activation flow;
4. only after activation, verify sitemap/robots against the exact ACTIVE release and perform Search Console submission/postflight;
5. Merchant activation remains after the technical Search Release gate and does not bypass the checkout/payment boundary.

No Search Release has been activated. ACTIVE release count remains 0.
