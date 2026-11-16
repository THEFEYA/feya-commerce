# Reviewed gallery photo ALT text — 13 Nov 2026

Owner request (13 Nov 2026): sign every product photo, not only the primary one, using the existing Etsy photographs, and track the Google Images effect.

## What ships
- `lib/storefrontReviewedGalleryImageAltCatalog.ts`: 1,207 rows → 1,559 product/photo bindings, 1,198 distinct non-primary gallery photos, 205 products (2 products have no gallery beyond the primary photo).
- `lib/storefrontReviewedGalleryImageAlts.ts`: applies a caption only for the exact canonical product + pinned slug + approved draft + primary photo + exact gallery photo URL; the primary photo stays owned by the primary binding (#246); videos, order, URLs and files are untouched.
- PDP reader: `applyReviewedGalleryImageAlts(applyReviewedPrimaryImageAlt(...))`.
- PDP thumbnails: `alt=""` → `alt={g.alt || ''}` (buttons keep their `aria-label`); freeze + client JSX baseline hashes updated for this single attribute.
- `/sitemap.xml`: each product URL lists its primary photo first, then its reviewed current gallery photos in gallery order. One bounded, cached, media-only query reads the existing approved projection; the static ALT catalog is intersected with current media membership. No PDP fan-out, full product/configuration payload, schema migration or PLP/client-prop change.

## Caption sources and QA
- 972 photos: handoff media-review drafts, QA-fixed — no `metal`/`metallic` (→ "silver-tone"), "over a … base layer" phrases removed (19), feather wording → "fluffy pale trim" except listings 1810732577 / 4332119985 / 1881683502, trailing periods stripped, 5 over-length captions shortened, per-product overrides kept.
- 216 photos without a draft + 11 photos whose draft duplicated another photo: written from visual review of each photograph (contact sheets g_01…g_19).
- 10 photos that are another product's primary photo reuse that product's reviewed primary ALT.
- Tests: `tests/search/reviewedGalleryImageAlts.test.ts` (counts, 40–125 chars, banned words, one caption ↔ one photo, binding/no-transfer, sitemap order, wiring).

## Measure
GSC → Performance → Search type: Image (impressions/clicks for `/shop/*`), baseline before deploy vs 14/28 days after; URL Inspection on 5 PDPs to confirm the rendered HTML carries the gallery ALTs.

## Continuation QA — 16 Nov 2026

- Compared the entire manifest with a fresh read of `FEYA's Project` (`ysnizcgzhdwdfdkjkhud`) and `feya_storefront_product_details_v1`: 207 products, 1,766 image placements, 1,371 distinct photos; all 1,559 non-primary product/photo bindings present, zero missing/orphan bindings, zero primary/draft/slug drift. The 207 source draft IDs and approved content hashes also match the handoff facts.
- Visually reviewed the remaining contact sheets 045–055 (I1101–I1371), cross-checked flagged accessory mentions against the approved sellable-offer signatures, and corrected 31 photo captions / 35 product-photo bindings. Corrections include mannequin versus flat lay, standing versus seated, front versus rear, visible colors, forehead band versus visor, and headpieces absent from the relevant offer. No change to the 207 primary captions.
- `gallery-image-alt-qa-20261116.json` records the corrections and full-manifest comparison. It is an audit receipt, not evidence of Google indexing.
- Added draft/primary replacement guards and current gallery intersection: a new draft requires renewed review; removed/replaced photos cannot remain in image XML because a static caption exists. The server-only media cache uses the existing site/catalog invalidation tags.
- Local validation: 874 search tests + 475 SEO tests pass; production build, admin boundary, Product OS freeze and owner UI checks pass. Deployment and live verification are recorded separately in issue #145.
- Rollback: revert this PR's merge commit. PRs #245/#246 and the active Search v13 release remain independent. This change adds descriptive ALT/discovery metadata; it does not establish indexing, rankings, traffic or sales.
