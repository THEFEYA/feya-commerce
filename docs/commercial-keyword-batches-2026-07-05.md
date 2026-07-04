# Commercial keyword batches — 2026-07-05

Current task: add purchase-intent keywords to FEYA SEO workflow using Google Ads metrics.

## Workflow

1. Prepare small seed batch.
2. Run it in Google Ads Keyword Planner.
3. Export keyword stats CSV.
4. Import metrics into a safe add-only Supabase layer.
5. Review terms and mark usable terms for SEO core.
6. Use approved commercial terms in meta, FAQ, CTA, shipping and production sections.

## Market settings

Use English and United States first. Later repeat for United Kingdom, Canada, and Australia.

## First uploaded CSV files

- Keyword Forecasts 2026-07-05 at 00_13_24.csv
- Keyword Stats 2026-07-05 at 00_16_06.csv

The stats file is the useful one for SEO keyword metrics. The forecast file is not the main import source for organic SEO scoring.

## Current finding

Long exact phrases may have no signal, but Google expands them into useful related terms with metrics. Therefore we should not create every possible manual combination. We should use controlled seed batches and import the resulting metric-backed suggestions.

## First useful terms observed

- festival outfits
- rave outfits
- rave clothes
- festival clothes
- rave outfits women
- festival outfits women
- mens festival outfits
- where to buy rave clothes
- where to buy rave outfits
- custom rave outfit
- fast shipping rave clothes
- festival clothes fast delivery
- buy burning man outfits

## Next batch names

- commercial_v1_a_broad_outfit_us_en
- commercial_v1_b_product_parts_us_en
- commercial_v1_c_custom_shipping_us_en
- commercial_v1_d_style_persona_us_en

## Next implementation

Create Supabase add-only import layer for commercial keyword metrics and then load the first stats CSV.
