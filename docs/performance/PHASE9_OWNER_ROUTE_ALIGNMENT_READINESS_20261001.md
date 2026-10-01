# Phase 9 — Search Owner Route Alignment Readiness — 2026-10-01

Canonical source: **TheFEYA Storefront, Search & Performance Architecture v1.0**, Phase 9.

This checkpoint records the non-destructive work that can be completed before the two owner URL decisions. It does **not** activate indexing and it does **not** rename any public route.

## Hosted Supabase read-only verification

All ten current commercial owner routes exist in `feya_commerce_seo_pages_v1`, remain `indexation_intent = noindex`, `portfolio_status = hold`, `lifecycle_state = planned`, and have **0 ACTIVE Search Release references**.

| Current owner route | Page ID | Latest membership snapshot | Expected / confirmed eligible | Page version | Content hash |
| --- | --- | --- | ---: | ---: | --- |
| `/collections/shoulder-armor` | `5a7b76bf-36a0-516a-88f4-44f9a10ed410` | `c5859f9f-50c8-5753-b528-bac2c22b1bac` | 80 / 80 | 2 | `558fc0b59bf5559fdcc8c347a0d12ec6e54efb463ad0deb2b4578118923f8679` |
| `/collections/bodysuits` | `9dc10a3f-c4fb-5fec-95d1-5e348305d739` | `ee4d8ca4-d4b9-5ed2-a872-6de63a984d84` | 30 / 30 | 2 | `1c66721aade2e52aaff30b9f0ae5eda1ee2e30ba64960ffe0cf635d20b3c4ae8` |
| `/collections/costume-masks` | `c67a177b-7712-5376-bf08-c4875399e692` | `f9467392-7160-59e7-bab8-6230635d390c` | 11 / 11 | 2 | `b0959c6e430fee7fd888825443ef3d3e3a29ad1720b59d5f1ddb758e64ce0a61` |
| `/collections/costume-headpieces` | `cbd940dd-ab5a-58d7-8d4a-cd39e05baed0` | `c40c1e2c-812f-58c0-a3c0-52a484791984` | 34 / 34 | 2 | `ec7bc1fe6f62ca27432ef5ceafe74008d2cb06e62546e2b2b3dc3e2026021b52` |
| `/collections/costume-belts` | `d2e5e62a-36ba-5ebd-a7e4-2ac61d73ddab` | `a0274d22-a133-5885-a3e3-472026e73aaf` | 13 / 13 | 2 | `d46377b3a64bd999a575284228c2ecc863fca734018fda945ade392fad26c713` |
| `/collections/festival-outfits` | `fa12f1a6-ede1-5ae3-9219-6b8ce8e82e66` | `bd28a2c1-e334-581a-9e56-4dc400fb71f5` | 111 / 111 | 2 | `a34dc5ab2274560c93160d8e5ac8edfab3faa5a0f82725be12910dac6687b0e2` |
| `/collections/rave-outfits` | `f027543c-d8f8-545a-895b-62e27b66b015` | `b229a14f-03a6-506d-82d4-1a6665335288` | 40 / 40 | 2 | `f295b0e16c963206edfc278649e56ceff7afe0856d6a448094a5884a355f5a67` |
| `/collections/burning-man-looks` | `fd5b7f21-f66d-5616-a33c-3d0c6974ad96` | `432064a3-7985-5e33-9205-9804650ef0c4` | 45 / 45 | 2 | `f77486b2e268752cd9b21cfc306400916e1e3c359574babf3b93795cf62b94de` |
| `/collections/stage-outfits` | `8c40a74a-0a49-513a-832a-66bf0cb1b1c2` | `db51050c-56f8-5fa6-99b5-e06a538d58da` | 96 / 96 | 2 | `72099f5ad8319133af754a948143a1d22aca0df2ca8b99e21ac97c1681de26f8` |
| `/collections/festival-skirts` | `e13692a0-5f96-5dca-9f48-cc5aa6e21d33` | `94331a5a-2fb0-5989-bacf-1936d639fb19` | 56 / 56 | 2 | `34d3628d9dd1b6eb1a4c6f9bc8380ff14e4e915ae3807899f2ef3719948d3ee8` |

All ten latest membership snapshots use `selection_v1` and source revision `feya-review-207-20260924|approved-seo-pack-current|phase-d-20260926`.

The hosted release table currently has **no ACTIVE release**; the recorded `organic-wave-a-20260926` attempts are `GATE_FAILED`. Therefore this phase must remain fail-closed for indexation.

## Owner decision gate

The master recommends two pre-index route changes, but explicitly reserves them for owner approval:

1. `/collections/burning-man-looks` → `/collections/burning-man-outfits`
2. `/collections/stage-outfits` → `/collections/performance-costumes`

Until explicit approval:

- current canonical paths stay unchanged;
- internal links stay on the current paths;
- no 308 redirect is installed;
- no URL-history row is written;
- Search Release remains inactive.

## Prepared execution contract after approval

When approved, the two renames must be one governed change that updates the canonical page route, internal links, breadcrumbs, Page Portfolio, URL history and permanent 308 redirects together. The existing `seo_page_id`, membership snapshot ownership and content evidence must remain attached to the same logical owner rather than creating a duplicate owner page.
