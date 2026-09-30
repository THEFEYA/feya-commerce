# TheFEYA Storefront Performance Baseline Pack — pre-upgrade

Status: CAPTURED / PRE-INDEX / NO PRODUCTION RUM CLAIM  
Captured source run: GitHub Actions `36640765067`  
Runtime artifact: `metric-runtime-evidence` / artifact `11065849551`  
Source commit: `562dd7e19921ba2af948203fa40624fc9a818e7e`  
Framework baseline: Next.js **15.5.26**  
Vercel compute region: **dub1**  
Supabase region: **eu-west-1**

## Purpose

This is the Phase 1 baseline required by the master plan. It records the last pre-Next-16 runtime/build evidence already captured in CI. It does not rerun or reinterpret the storefront, and it does not claim production field Core Web Vitals.

## Visual/runtime evidence already captured

The CI artifact contains frozen screenshots for:

- `closed-review-shop-1440.png`
- `closed-review-shop-390.png`
- `closed-review-pdp-1440.png`
- `closed-review-pdp-390.png`
- `approved-content-1440.png`
- `approved-content-390.png`

The same run verified:

- 207 crawlable products in the closed review corpus;
- 11 server-pagination pages;
- hydrated and JavaScript-disabled pagination/filter flows;
- exact approved copy on all 207 release PDPs;
- keyboard coverage for PDP gallery/configuration/modal;
- preview/indexation remained fail-closed.

## Build baseline

From the captured Next.js 15.5.26 build:

- production compile: **15.4 s**
- shared First Load JS: **103 kB**
- homepage: **140 kB First Load JS**
- `/shop`: **146 kB First Load JS**
- representative `/shop/[slug]`: **154 kB First Load JS**
- `/collections/[slug]`: **146 kB First Load JS**
- static support pages such as `/about`, `/shipping`, `/returns`: about **117 kB First Load JS**

These are build-output values, not transferred-byte or field-user metrics.

## Runtime asset regression baseline

The release-lab browser guard captured:

| Route | Script bytes | Style bytes | Script resources | Style resources |
| --- | ---: | ---: | ---: | ---: |
| `/shop` | 151,794 B | 31,073 B | 16 | 2 |
| representative PDP | 160,345 B | 31,073 B | 18 | 2 |

The CI budget itself is intentionally loose and is only a regression guard. It is not a Google performance requirement.

## Data architecture baseline

Before the slim read-model work, the public Shop path still had the documented heavy pattern:

- request-time rendering;
- product fetch up to 500 rows;
- media fetched separately by slug chunks;
- application merge;
- full StorefrontProduct objects passed into client filtering.

The later additive card read-model work must be compared against this baseline rather than against the 243-row raw candidate surface.

## What is deliberately NOT claimed

This pre-index environment does not have representative production traffic, so this baseline does **not** claim:

- p75 LCP/INP/CLS;
- production RUM;
- production TTFB;
- live CDN image delivery quality;
- production cache-hit ratios.

Those become launch/post-launch measurements. The master explicitly forbids treating synthetic CI as field CWV.

## Baseline gate

Phase 1 evidence is now persisted without repeating the already-successful CI run.

The next accepted migration gate remains:

1. Next 16.3.x compatibility with zero intended visual/functional regression;
2. additive public read-model parity;
3. runtime swap only after parity;
4. invalidation contract before persistent caching.
