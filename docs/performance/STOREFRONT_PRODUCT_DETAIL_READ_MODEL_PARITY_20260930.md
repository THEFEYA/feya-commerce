# TheFEYA Product Detail Read Model v1 — additive checkpoint

Status: ADDITIVE / PARITY VERIFIED / NOT YET WIRED TO PDP RUNTIME  
Date: 2026-09-30  
Approved corpus: `feya-review-207-20260924`

## Purpose

This closes the product-detail half of Phase 3 in the master migration sequence.

The existing PDP currently performs a storefront product read and a second media read/merge. The new server-only detail projection combines those public sources into one exact-corpus row per approved product, while keeping the existing approved SEO-copy reader and visual renderer unchanged.

## Contract

- exact 207 approved products only;
- exact pinned draft revision and product URL path must still match;
- product hold/unpublish fails closed;
- live product slug must still equal the sealed slug;
- media gallery is merged from the existing fast public media source;
- configurations remain present for the frozen PDP selector;
- no admin history or internal cost data is added;
- anon/authenticated have no SELECT;
- service role is the only reader;
- no persistent Next.js cache is enabled;
- `app/shop/[slug]/page.tsx` is intentionally not switched in this PR.

## Parity result

The applied Supabase projection was compared against the exact current PDP database source shape: approved binding → live v4 product row → fast media merge.

Result:

- approved rows: **207**
- detail rows: **207**
- missing rows: **0**
- raw product/media payload differences: **0**
- empty media galleries: **0**
- empty configuration arrays: **0**

The loader applies the same owner-reviewed storefront correction function used by the current PDP after the merge, so this phase changes no correction semantics.

## Next gate

Run FEYA CI for this additive branch. After it is green, Phase 3 is complete and the existing Phase 4 runtime-swap branch can be rebased onto this product-detail read-model checkpoint before any further cache work.
