# Collection crawlability — 6 Nov 2026

Issue #145 continues the owner's full-catalogue discovery plan. Published collection pages previously showed only the first20 cards in crawlable anchors; the embedded Show20more control was a JavaScript-only button. `/shop` already has crawlable pagination from PR226.

## Change

The existing Shop client and query/filter contract now support a governed collection base path. The first-page control keeps its approved `btn-ghost` appearance and zero-network20-more interaction. Its actual href points to the next20 products in **the same collection**. Modified clicks and JavaScript-disabled navigation can follow that href normally. Direct page2+ requests render the correct bounded slice and Previous20/Show20more links with the current filters.

The route still reads the existing immutable page version + matching membership from the persistent collection cache. URL state resolves inside the existing Suspense boundary; no new client fetch, database model or membership heuristic. Root collection content/metadata and Search release remain governed by the same authority. Query states have self-canonicals and are absent from the active release, so remain `noindex,follow` and outside the sitemap. Malformed/out-of-range page states fail closed. Tracking survives normalization redirects but is excluded from canonicals and pagination links.

On query pages the CollectionPage ItemList matches the filtered page slice and position offset. The unfiltered root keeps its original full immutable ItemList. No product description, price, image, audience or collection membership is edited.

## Baseline and verification

`membership-baseline.json` captures the public original production state on main89db7fce17a6e362486f4a0d38c2abda81607d90 / dpl_7L7fCHS5cWWXXcmhsQ5uGv1UimNp. Ten approved collections contain516 memberships /193 distinct products. Each initial card order was checked against its full published ItemList. The other14 products remain reachable via full `/shop` pagination; this change does not invent collection membership for them.

```sh
python scripts/search/verify-collection-pagination.py --origin https://PREVIEW_HOST --baseline docs/search/collection-pagination-20261106/membership-baseline.json --deployment EXACT_PREVIEW_ID --output /tmp/collection-preview-qa.json
python scripts/search/verify-collection-pagination.py --origin https://thefeya.com --baseline docs/search/collection-pagination-20261106/membership-baseline.json --deployment EXACT_PRODUCTION_ID --root-index --output /tmp/collection-production-qa.json
```

The read-only raw-HTML crawler follows real sequential anchors, verifies every card's order/membership without omissions or duplicates, checks canonicals/robots/previous links/termination, and records response hashes. It does not execute page scripts, click Google review forms or claim Google indexing. Also verify page1 load-more in the browser and a filtered direct URL before release.

Local validation: typecheck, production build and all826 Search tests passed, including collection-path/filter round trips, unsafe destination rejection, tracking normalization and release/cache contract checks. Exact-head CI and preview/production crawl receipts are recorded in issue145; a passing local test is not a production release receipt.

## Visual freeze and rollback

All existing class hooks, labels, first-page card count and layout are preserved. Only the ShopClient implementation hash is updated in the freeze manifest. `PUBLIC_STOREFRONT_VISUAL_FREEZE_V1.md` explicitly permits internal-link crawlability, routing and indexation work while preserving appearance. Shared Shop defaults and embedded discovery hubs without a governed collection path retain their existing behavior. No opportunistic visual refactor.

Rollback is a revert of this scoped commit; no database migration or source-data rollback is needed. Merchant source and the191-product feed are unaffected.

Primary guidance: [Google pagination and incremental loading](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading); existing FEYA Search Architecture §13 requires crawlable, self-canonical pagination.
