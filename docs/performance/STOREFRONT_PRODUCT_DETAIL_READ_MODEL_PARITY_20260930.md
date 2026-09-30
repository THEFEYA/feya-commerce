# TheFEYA Product Detail Read Model v1 — additive checkpoint

Status: ADDITIVE / NOT YET WIRED TO PDP RUNTIME  
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

## Next gate

Compare the new detail projection against the current PDP product + media merge for all 207 products. Only after zero parity defects may the PDP runtime use it.
