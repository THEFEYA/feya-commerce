# Googlebot head metadata fix — evidence, 13 November 2026

Status: **reviewable change, not released**. Scope: one `next.config.ts` option plus one source-contract test. No PDP text, price, variant, image, feed, robots policy, sitemap membership or canonical URL value changes.

## Defect

Next.js 16.3.8 classifies the bare `Googlebot` user agent as a JS-executing "DOM bot" (`is-bot.ts`: `/Googlebot(?!-)|Googlebot$/i`) and serves it **streaming metadata**: `<title>`, meta description, meta robots and `rel=canonical` are appended to `<body>` after the head is flushed. `Google-InspectionTool` matches the default html-limited list (`Google-[\w-]+`) and receives blocking metadata in `<head>`; this is why Live Test and `tests/runtime/phase12-production-origin-crawl.mjs` (which uses that UA) looked correct.

Google: "The rel="canonical" link element is only accepted if it appears in the `<head>` section of the HTML" (Consolidate duplicate URLs, last updated 2026-07-10).

## Evidence (read-only, 13 Nov 2026)

| Source | Observation |
| --- | --- |
| GSC URL Inspection, indexed PDP 4456102467 | Last crawl 5 Nov 2026 14:03:06, Googlebot smartphone. **User-declared canonical: None.** |
| Same, "View crawled page" HTML (Google's stored copy) | `</head>` ends at char 1,501; `<title>` at 196,516; meta robots at 196,783; `rel=canonical` at 196,829 — all in `<body>`. |
| Live HTML, Chrome UA, PDP 4488185754 + Merchant landing parameters | 200, `index, follow`, canonical to clean PDP — but at char 147,137 while `</head>` ends at 1,566. After hydration the tags stay in `<body>`. |
| All 207 sitemap PDPs, Chrome UA, 13 Nov | 207 × HTTP 200, 207 × `index, follow`, 207 × self-canonical (all body-placed). |
| GSC crawl stats sample (500 newest HTTP-200 examples, 3–12 Nov) | 439 (88%) were Merchant feed URLs with `utm_*`/`configuration` parameters, 21 clean PDP URLs, 3 collections. Without a recognised canonical these parameter URLs cannot be consolidated by the declared canonical. |

## Change

`htmlLimitedBots` = Next 16.3.8 default html-limited list **plus `Googlebot`** (overriding replaces the default, so every default alternative is kept and asserted by `tests/seo/googlebotHeadMetadata.test.ts`). Ordinary browsers still receive streaming metadata, so visitor rendering is unchanged. Googlebot gets the same blocking-metadata path that Google-InspectionTool already receives in Production.

## Verification plan

1. CI + `node --experimental-strip-types --test tests/seo/googlebotHeadMetadata.test.ts` (3/3 pass locally on Node 22.23.4; full build/typecheck not run locally — no installed dependencies).
2. Preview/Production postflight with a real Googlebot smartphone UA: canonical, robots, title and description index < `</head>` index on Home, one collection and 3 PDPs; Chrome UA response unchanged.
3. Google-known: after Googlebot recrawl, URL Inspection of 4456102467 / 4488185754 shows **User-declared canonical = the clean PDP URL**. Do not attribute ranking/traffic change to this fix before that recrawl.

Rollback: remove the `htmlLimitedBots` line (restores Next default behaviour).
