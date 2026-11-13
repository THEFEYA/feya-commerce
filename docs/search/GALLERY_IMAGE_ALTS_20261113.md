# Reviewed gallery photo ALT text — 13 Nov 2026

Owner request (13 Nov 2026): sign every product photo, not only the primary one, using the existing Etsy photographs, and track the Google Images effect.

## What ships
- `lib/storefrontReviewedGalleryImageAltCatalog.ts`: 1,207 rows → 1,559 product/photo bindings, 1,198 distinct non-primary gallery photos, 205 products (2 products have no gallery beyond the primary photo).
- `lib/storefrontReviewedGalleryImageAlts.ts`: applies a caption only for the exact canonical product + pinned slug + exact photo URL; the primary photo stays owned by the primary binding (#246); videos, order, URLs and files are untouched.
- PDP reader: `applyReviewedGalleryImageAlts(applyReviewedPrimaryImageAlt(...))`.
- PDP thumbnails: `alt=""` → `alt={g.alt || ''}` (buttons keep their `aria-label`); freeze + client JSX baseline hashes updated for this single attribute.
- `/sitemap.xml`: each product URL lists its primary photo first, then its reviewed gallery photos (static catalog, no PDP fan-out).

## Caption sources and QA
- 972 photos: handoff media-review drafts, QA-fixed — no `metal`/`metallic` (→ "silver-tone"), "over a … base layer" phrases removed (19), feather wording → "fluffy pale trim" except listings 1810732577 / 4332119985 / 1881683502, trailing periods stripped, 5 over-length captions shortened, per-product overrides kept.
- 216 photos without a draft + 11 photos whose draft duplicated another photo: written from visual review of each photograph (contact sheets g_01…g_19).
- 10 photos that are another product's primary photo reuse that product's reviewed primary ALT.
- Tests: `tests/search/reviewedGalleryImageAlts.test.ts` (counts, 40–125 chars, banned words, one caption ↔ one photo, binding/no-transfer, sitemap order, wiring).

## Measure
GSC → Performance → Search type: Image (impressions/clicks for `/shop/*`), baseline before deploy vs 14/28 days after; URL Inspection on 5 PDPs to confirm the rendered HTML carries the gallery ALTs.
