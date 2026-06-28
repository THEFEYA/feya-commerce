# SEO Keyword Source and Agent Plan — 2026-06-28

This document defines where TheFEYA SEO keywords come from, which sources are allowed for metrics, and which agent nodes are needed before production SEO generation.

## Current truth

The system is not allowed to invent search volume, competition, CPC, trend, or demand with OpenAI. OpenAI can normalize, classify, expand seed phrases, write drafts, and run QA, but it is not a metric source.

## Keyword sources

| Source | Status | Role | Not allowed for |
|---|---|---|---|
| Product DNA seed | Active | Generates product-specific seed phrases from components, color, material, event, persona, and long-tail patterns. | Search volume, competition, CPC, market demand |
| Old Etsy passports / brand memory | Active | Provides clusters, brand fit, snippets, title rules, anti-duplicate memory, and TheFEYA tone. | Fresh Google demand or competition |
| CSV / manual Keyword Planner bridge | Manual bridge | Practical bridge until Google Ads API is ready. Operator exports keywords, fills real metrics, imports CSV back. | Full automation or auto approval |
| Google Ads API / Keyword Planner | Planned | Main official source for keyword ideas and historical metrics. Backend-only adapter required. | SEO text generation or brand fit decisions |
| DataForSEO Google Ads Keywords Data | Planned optional fallback | Paid fallback for batch search volume, keyword ideas, CPC, and Google Ads-like metrics if Google Ads access is delayed. | Free official source or human QA replacement |
| Google Trends | Planned seasonal layer | Trend direction, regional interest, and seasonality. | Absolute monthly search volume, competition, CPC |
| Google Search Console | Future after launch | Real impressions, clicks, CTR, and average position after pages are indexed. | Pre-launch market demand |
| OpenAI | Not allowed for metrics | Product normalization, intent classification, draft writing, humanizer QA, rewrite suggestions. | Search volume, competition, CPC, real demand |

## Agent pipeline

1. Product DNA Normalizer — reads product row and brand memory; outputs product facts, semantic buckets, and blockers.
2. Keyword Research Agent — creates seed phrases and prepares CSV/API request packages.
3. Metric Ingestion Agent — validates source, date, region, language, avg monthly searches, competition, bid fields, trend fields.
4. Keyword Scoring Agent — assigns keyword roles: primary, secondary, supporting, long-tail, hold, reject.
5. SEO Strategy Agent — chooses unique angle and spreads similar products by component, event, material, persona, or long-tail.
6. Human SEO Writer Agent — creates SEO Pack only from confirmed product facts, selected angle, and approved keyword portfolio.
7. Humanizer / QA Agent — checks wateriness, AI cliches, repeated intros, keyword stuffing, product truth, internal duplication, and uniqueness signals.
8. Operator Approval Gate — blocks saving or publishing until a human approves.

## Manual MVP workflow

1. Open `/admin/seo-engine/studio`.
2. Search and select a real product.
3. Review Product DNA and generated seed phrases.
4. Export CSV metric template.
5. Fill metrics from Google Keyword Planner manually or another trusted source.
6. Import/paste CSV into validation and scoring preview.
7. Choose a product angle.
8. Review SEO draft preview.
9. Do not publish yet. Final save requires backend generator, QA gate, and approval table.

## Current readiness

Ready for manual exploration:
- product selection in Studio;
- semantic seed review;
- CSV metric template and validation preview;
- scoring preview;
- angle selection and draft preview for selected product.

Not ready for production generation:
- Google Ads API adapter is not connected;
- DataForSEO adapter is not connected;
- OpenAI backend generation endpoint is not connected to the approval workflow;
- humanizer/QA gate is not persisted;
- SEO drafts are not saved to a production table;
- no automatic publishing should happen.
