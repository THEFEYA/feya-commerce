# Phase 12 — Search Release Readiness — 2026-10-01

Canonical source: **TheFEYA Storefront, Search & Performance Architecture v1.0**, Phase 12.

This checkpoint is readiness + owner-decision implementation only. It does **not** prepare or activate a Search Release.

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

## 5. Last historical release

Latest previously materialized release:

- code: `organic-wave-a-20260926`
- version: 9
- release id: `e6f3b105-b23b-5623-93ae-9e5ba36ac5c3`
- hash: `26cfb3598d009633c3cf44095a4c46ddc97ea961f25b142dad682ed69815fc7b`
- status: `GATE_FAILED`
- historical git SHA: `3bde4097e7b1d038f34ab44d39b38675c96333da`
- historical index candidates: 18
- historical noindex dependencies: 210
- index activation authorized: false

Do not reactivate v9. It contains retired owner URLs and predates Phases 8–11 plus the owner-approved rename migration.

## 6. Historical FAIL gates that still matter

The v9 release had 16 PASS / EXCLUDED_APPROVED gates and four FAIL gates.

### K02 — canonical production origin

Historical state: canonical origin was not serving current feya-commerce.

Fresh 2026-10-01 public check still returns HTTP 502 for `https://thefeya.com/`.

User reports the domain has been configured in Vercel, but current public behavior is the release authority. K02 remains FAIL until the canonical host serves the current storefront correctly.

Required:
- verify `thefeya.com` project assignment/DNS;
- verify `www.thefeya.com` redirect/canonical behavior;
- confirm canonical origin returns the current storefront.

### K14 — anonymous production crawl

Blocked by K02. After canonical domain resolution:
- crawl the exact Wave A corpus anonymously on the production origin;
- verify 200/308/404/canonical/robots state;
- verify old owner routes 308 to the new canonical routes;
- verify no query/filter/private URLs enter the index corpus.

### K19 — Search Console Domain property

Fresh GSC Wizard check on 2026-10-01 still lists only:

`https://thefeya.com/`

The required Domain property `sc-domain:thefeya.com` is not connected.

Required:
- create/verify `sc-domain:thefeya.com` in Google Search Console via DNS;
- then register/connect it in GSC Wizard.

Current tools can register an already verified Domain property but cannot perform DNS verification.

### K20 — exact release-hash owner approval

The user has approved the **corpus decisions**, but a new immutable release id/hash does not exist yet.

K20 remains fail-closed until:
1. a new release is materialized against the final validated Phase 12 git SHA;
2. fresh K01–K20 evidence is attached;
3. the exact release id/hash/path list is shown to the owner;
4. the owner approves that exact immutable release.

## 7. Activation boundary

`feya_search_prepare_release_activation_v1` is **not a dry-run**.

It:
- requires exact release id/hash/git SHA;
- requires exactly 20 gates and zero FAIL;
- creates an `ACTIVATE_SEARCH_RELEASE` execution request;
- changes release state to `APPROVAL_REQUIRED`.

Therefore:
- do not call prepare/execute activation while K02/K14/K19 remain FAIL;
- do not submit sitemap or activate Merchant/Search Console release before the technical gate;
- preserve ACTIVE release count = 0.

## 8. Next engineering steps

Allowed before activation:

1. finish CI/Vercel validation of the owner-approved rename change-set;
2. resolve canonical domain serving/DNS assignment;
3. connect verified GSC Domain property;
4. materialize a **new** immutable 18-page Wave A release pinned to the final validated Phase 12 git SHA and current page versions;
5. rebuild K01–K20 from fresh evidence;
6. run anonymous canonical-origin crawl;
7. present exact release id/hash/path list for final K20 owner approval;
8. only then run the governed preparation/execution activation flow.

No Search Release has been activated by this branch.
