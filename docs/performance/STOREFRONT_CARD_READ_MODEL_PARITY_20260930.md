# TheFEYA Storefront Card Read Model v1 — parity checkpoint

Status: ADDITIVE / VERIFIED / NOT YET WIRED TO RUNTIME  
Captured: 2026-09-30  
Approved corpus: `feya-review-207-20260924`  
Facet snapshot: `feya-n7-20260928-v3`

## What was created

A server-only exact-corpus binding table and a slim storefront card view:

- `feya_storefront_approved_product_bindings_v1`
- `feya_storefront_product_cards_v1`

The binding was generated from the sealed owner-approved closed-review manifest rather than from the broader live storefront candidate view.

## Corpus reconciliation

- raw storefront v4 rows: **243**
- sealed source rows: **208**
- suppressed duplicate: **1**
- approved visible products: **207**
- read-model rows: **207**
- duplicate product IDs: **0**
- missing primary images: **0**
- missing card titles: **0**
- missing display prices: **0**
- facet contract mismatches: **0**

The 36 raw rows outside the approved release remain outside this read model.

## Exact card-field parity

The new view was compared product-by-product against all 207 sealed manifest entries.

Zero differences were found for:

- product slug
- approved card title / H1
- SEO title
- meta description
- product type
- material
- color
- currency
- primary image URL and alt
- secondary and hover image URLs
- video URL / flag
- media count
- min/max price
- category label
- world label
- canonical color label
- color options

## Price parity defect found and corrected

The first projection exposed a real edge case: three products contain duplicate `Full Set` configuration labels at different prices.

The existing storefront helper deduplicates identical labels by keeping the higher-priced row before selecting the full set. The first SQL projection selected the lower sort-order row instead.

Affected products were detected before runtime wiring. A second migration now reproduces the existing storefront semantics:

1. normalize configuration labels;
2. deduplicate each label by highest price;
3. prefer the full-set candidate;
4. otherwise use the highest remaining configuration;
5. then fall back to existing full-set / max / min product prices.

Post-fix result: **207 / 207 price parity, 0 differences**.

## Payload reduction at the database row level

For the same approved 207 products:

| Surface | Avg row size | Total row size |
| --- | ---: | ---: |
| existing v4 approved rows | 5,770 B | 1,194,478 B |
| new slim card v1 | 1,564 B | 323,700 B |

This is roughly a **72.9% reduction** in database row payload before HTTP/React serialization.

The view intentionally excludes the two largest card-unnecessary payloads:

- `media_gallery`
- `configurations`

It keeps only the primary/secondary/hover/video card media plus a scalar card display price.

## Security boundary

The binding table and card view are not granted to `anon` or `authenticated`.

Only `service_role` receives SELECT. The future storefront loader remains server-only.

## What has NOT changed

- no public route reads from this view yet;
- no persistent Next.js cache is enabled yet;
- no Product DNA or taxonomy changes;
- no visual markup changes;
- no Search Release activation;
- no indexation change;
- no checkout/payment change.

## Next step

Prove the cache invalidation contract, then wire the read model behind the frozen storefront and measure the before/after response and navigation behavior.
