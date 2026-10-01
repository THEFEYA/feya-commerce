# Phase 11 — SEO Content & Structured Data Readiness — 2026-10-01

Canonical source: **TheFEYA Storefront, Search & Performance Architecture v1.0**, Phase 11.

Phase 11 is intentionally minimal because most governed content work was already completed in the Search Architecture phases. This checkpoint records what is already closed and the remaining structured-data correction.

## 1. Collection content / ownership

Hosted Supabase read-only verification on 2026-10-01 confirmed all ten current commercial collection owners use their latest immutable page version **v2** with:

- `content_status = CQA_PASS`;
- `release_status = HOLD`;
- the declared `primary_cluster` owned by the same page as primary/intended ownership;
- no same primary cluster owned by another current commercial owner.

Verified routes:

- `/collections/shoulder-armor`
- `/collections/bodysuits`
- `/collections/costume-masks`
- `/collections/costume-headpieces`
- `/collections/costume-belts`
- `/collections/festival-outfits`
- `/collections/rave-outfits`
- `/collections/burning-man-looks`
- `/collections/stage-outfits`
- `/collections/festival-skirts`

No new collection copy is generated in Phase 11.

## 2. Homepage and trust/support content

Hosted foundational page versions are already present and CQA-passed for:

- `/`
- `/about`
- `/shipping`
- `/returns`
- `/contact`
- `/size-guide`
- `/care`

Each current public implementation already has canonical metadata, an H1 and release-aware robots handling. These pages remain HOLD/noindex until Search Release where applicable.

## 3. Collection structured data

The governed collection route already emits:

- `BreadcrumbList`;
- `CollectionPage`;
- nested `ItemList` for the immutable collection membership.

It deliberately does **not** emit fake single-product `Product` / `Offer` markup.

## 4. PDP structured-data decision

Before this Phase 11 correction, the PDP emitted `Offer` whenever a display price existed outside the approved-copy review mode. That condition was weaker than the actual commerce authority.

Hosted commerce evidence on 2026-10-01:

- 207 current offer heads;
- 207 current offer revisions with `status = active`;
- 856 active offer variant items;
- currency: EUR;
- internal quote/promotion contracts still state `order_creation_enabled = false`, `payment_enabled = false`, and `indexing_enabled = false`.

Google Search Central merchant-listing guidance states that merchant-listing product markup is for pages where users can buy the product. Google product-variant guidance also expects a distinct crawlable URL capable of preselecting each represented variant.

Current TheFEYA PDPs do not yet expose public crawlable variant-selection URLs and public order/payment activation remains disabled.

Therefore Phase 11 uses the truthful pre-commerce representation:

- `Product` for the current PDP;
- `BreadcrumbList` for Home → Shop → Product;
- **no `Offer` yet**;
- **no `ProductGroup` / `hasVariant` yet**.

`Offer` / `ProductGroup` become eligible only after the public purchase path and distinct variant URL contract are implemented and validated. This is a deferred commerce/search-release dependency, not missing Phase 11 copy.

Official references checked 2026-10-01:

- Google Search Central — Merchant listing structured data:
  https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Google Search Central — Product variant structured data:
  https://developers.google.com/search/docs/appearance/structured-data/product-variants

## 5. Phase 11 acceptance contract

Phase 11 is complete when:

1. current collection and foundational page CQA evidence remains unchanged;
2. no collection targets another owner’s primary cluster;
3. PDP server HTML emits `Product` + `BreadcrumbList`;
4. PDP pre-commerce HTML emits no premature `Offer` or `ProductGroup`;
5. collection HTML remains list-focused;
6. visual storefront output is unchanged;
7. full FEYA validation and Vercel deployment are green.

No Search Release, sitemap activation, checkout/payment activation, URL rename or indexation change belongs to this phase.
