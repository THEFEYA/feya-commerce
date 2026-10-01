# Phase 12 — Search Release Readiness — 2026-10-01

Canonical source: **TheFEYA Storefront, Search & Performance Architecture v1.0**, Phase 12.

This checkpoint is deliberately **readiness-only**. It does not create, prepare, approve or activate a Search Release.

## 1. Phase 12 MASTER contract

Phase 12 requires:

1. owner approval of the exact Wave A corpus;
2. sitemap generated only from the ACTIVE Search Release;
3. anonymous crawl validation of 200/404/redirect/canonical/noindex state;
4. Search Console / Merchant activation only after the technical gate.

The current storefront already implements item 2: `app/sitemap.ts` reads only ACTIVE release items whose role is `INDEX_CANDIDATE` and intended state is `index`; `app/robots.ts` advertises the sitemap only when an ACTIVE release exists.

## 2. Last materialized organic release

Latest hosted release inspected on 2026-10-01:

- release code: `organic-wave-a-20260926`
- release version: `9`
- release id: `e6f3b105-b23b-5623-93ae-9e5ba36ac5c3`
- release hash: `26cfb3598d009633c3cf44095a4c46ddc97ea961f25b142dad682ed69815fc7b`
- release status: `GATE_FAILED`
- historical git SHA: `3bde4097e7b1d038f34ab44d39b38675c96333da`
- index candidates: 18
- noindex dependencies: 210
- index activation authorized: false

This release is stale evidence only. It must not be reactivated because the application, route, performance and structured-data contracts have changed through Phases 8–11.

## 3. Existing 18-page Wave A corpus in v9

Current-route snapshot:

1. `/`
2. `/collections`
3. `/collections/shoulder-armor`
4. `/collections/festival-outfits`
5. `/collections/rave-outfits`
6. `/collections/burning-man-looks`
7. `/collections/stage-outfits`
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

The MASTER-preferred corpus replaces only:

- `/collections/burning-man-looks` -> `/collections/burning-man-outfits`
- `/collections/stage-outfits` -> `/collections/performance-costumes`

Those replacements remain OWNER DECISION and have not been implemented.

`/shop` is not in the existing 18-page release. The MASTER treats launch indexability of `/shop` as a separate OWNER DECISION after the filter/direct-load controls are validated.

207 PDPs remain Wave B / noindex dependencies and are not Wave A index candidates.

## 4. Historical v9 release gates

20 release gates were materialized for v9.

PASS / EXCLUDED_APPROVED: 16.

FAIL:

### K02 — canonical production origin

Historical state: `https://thefeya.com` was not bound to the current feya-commerce Vercel storefront.

Fresh 2026-10-01 public check: `https://thefeya.com/` still returns HTTP 502.

Required before release:
- bind `thefeya.com` to the current feya-commerce Vercel project;
- bind/redirect `www.thefeya.com` consistently;
- confirm canonical origin returns the current storefront.

### K14 — anonymous production crawl

Historical state: blocked because the canonical origin returned 502.

This gate cannot pass until K02 is fixed. After domain binding, rerun the anonymous exact-corpus crawl against the canonical production origin, not a protected preview URL.

### K19 — Search Console Domain property

Historical state: only URL-prefix property `https://thefeya.com/` was connected.

Fresh GSC Wizard check on 2026-10-01 still returns only:
- `https://thefeya.com/`

Required:
- create/verify `sc-domain:thefeya.com` through Search Console / DNS;
- connect/activate that Domain property in GSC Wizard;
- then re-run the release gate.

### K20 — exact owner approval

Historical state: no Human Owner approval for the exact v9 release hash.

This remains fail-closed by design.

## 5. Existing activation boundary

Hosted function `feya_search_prepare_release_activation_v1` is **not a dry-run**.

It:
- requires an exact release id, release hash and git SHA;
- requires exactly 20 gates with zero FAIL;
- creates an `ACTIVATE_SEARCH_RELEASE` execution request;
- changes the release state to `APPROVAL_REQUIRED`;
- does not activate the release itself.

Therefore it must not be called during readiness work and must not be called before the exact release corpus/hash is owner-approved and every release gate is PASS / EXCLUDED_APPROVED.

## 6. OWNER DECISIONS that block exact Wave A

These are unresolved and cannot be inferred by engineering:

1. Approve or reject both pre-index URL renames:
   - Burning Man;
   - Performance.
2. Decide whether `/shop` joins Wave A at launch.
3. Confirm whether **Costume Headpieces** remains in Wave A; it passed the stored gates but had the lowest measured demand of the ten commercial owners.
4. Resolve the public **Maleficent** persona label before indexing:
   - current public navigation still exposes `/shop?persona=Maleficent`;
   - MASTER recommends either explicit owner retention or replacement with a neutral generic archetype.
5. Approve the final exact Wave A corpus and immutable release hash after the technical gates are rebuilt.

The PDP Wave B CQA/index trigger is a later owner decision and does not need to be invented in order to keep PDPs as Wave A noindex dependencies.

Showgirl, Corsets and the remaining HOLD owner candidates are outside Wave A and do not block this release.

## 7. Technical work allowed before activation

After the owner decisions above are resolved, engineering may:

1. atomically implement approved owner URL renames if any;
2. bind the canonical domain and verify 200/redirect/canonical behavior;
3. verify the GSC Domain property;
4. generate a **new** immutable Wave A release pinned to the latest validated application git SHA and current page versions;
5. materialize the 20 release gates from fresh evidence;
6. perform anonymous canonical-origin crawl;
7. verify sitemap exactly equals ACTIVE-candidate intent before activation;
8. present the exact release id/hash/path list to the owner;
9. only after explicit approval, use the existing preparation/execution governance flow.

## 8. Current stop condition

Do not:
- reuse or activate v9;
- call prepare/execute activation RPCs;
- submit sitemap to Search Console;
- enable Merchant activation;
- change owner URLs;
- index `/shop`;
- rename Maleficent taxonomy;
- remove Costume Headpieces from Wave A

until the relevant owner decision and technical gate are satisfied.
