# FEYA Technical SEO Search Launch Gate v1

Status: implementation foundation active
Owner domain: TSEO
Architecture: FEYA Growth OS v1.0 CANONICAL

## 1. Purpose

Prevent a preview/staging catalog from becoming indexable merely because a route exists.

Search launch requires both:

1. global launch permission;
2. page-level portfolio eligibility.

Neither is sufficient alone.

## 2. Global launch switch

Environment:

FEYA_SEARCH_INDEXING_ENABLED=false

Default is false.

When false:
- global public metadata emits noindex/nofollow;
- sitemap returns no product URLs;
- Product structured data is not emitted;
- admin remains noindex.

## 3. Page-level indexation gate

A PDP is indexable only when all are true:

- FEYA_SEARCH_INDEXING_ENABLED=true;
- storefront_candidate_flag=true;
- SEO Portfolio row exists;
- portfolio_status=active;
- indexation_intent=indexable.

Current bootstrap state:

243 product pages have indexation_intent=candidate.

Therefore current product pages remain noindex even if the global flag is accidentally enabled.

## 4. robots.txt behavior

robots.ts:
- allows public crawling;
- disallows /admin/;
- disallows /api/internal/;
- publishes sitemap URL only when global indexing is enabled.

Reason:

The pre-launch exclusion mechanism is page-level noindex, not a full robots.txt block, so a crawler can observe the noindex directive.

## 5. Sitemap behavior

When global indexing is disabled:

sitemap = empty.

When enabled:

- homepage is included;
- portfolio pages are included only when:
  - indexation_intent=indexable
  - portfolio_status=active

Candidate pages are excluded.

A sitemap is a discovery/canonicalization signal, not proof of indexation.

## 6. PDP canonical metadata

PDP canonical is generated from:

NEXT_PUBLIC_SITE_URL + /shop/{product_slug}

Default documented target:

https://zofeya.com

Production must explicitly confirm NEXT_PUBLIC_SITE_URL before Launch Readiness PASS.

Canonical is a preference signal, not a guarantee of Google-selected canonical.

## 7. PDP search metadata

PDP metadata uses existing approved/read-only storefront data:

- seo_title / H1 / card title
- meta_description
- primary image
- primary image alt
- canonical URL

Open Graph and Twitter metadata use the same product truth surfaces.

## 8. Structured data gate

Environment:

FEYA_STRUCTURED_DATA_ENABLED=false

Default is false.

Product JSON-LD is emitted only when:
- structured-data feature flag is true;
- page is independently indexable;
- no fallback price is being used;
- one unambiguous price exists;
- currency exists;
- primary image exists.

Current implementation intentionally skips Product JSON-LD for price-range/configuration products.

It does not misuse AggregateOffer as a shortcut for product variants/configurations.

ProductGroup/variant markup remains deferred until the real customer-facing variant URL/model is defined.

## 9. Admin search policy

/admin has its own layout with:

noindex
nofollow
nocache

This is independent of admin authentication.

## 10. Launch Readiness before switching indexing on

Minimum checks:

- production domain confirmed;
- HTTPS/host canonicalization confirmed;
- NEXT_PUBLIC_SITE_URL correct;
- admin/internal routes protected;
- Product Truth/content approved;
- Product Portfolio indexation decisions reviewed;
- candidate pages explicitly promoted where appropriate;
- sitemap output reviewed;
- canonical output reviewed;
- robots output reviewed;
- structured data validated where enabled;
- no staging/demo host discoverability problem;
- GA4/GSC instrumentation ready enough for post-launch observation.

## 11. Important non-goals

This implementation does not:
- auto-index all products;
- turn Product DNA axes into landing pages;
- guarantee Google indexing;
- emit ProductGroup markup without a real variant model;
- publish fallback prices as structured data;
- create fake availability;
- create search metadata from AI guesses.

## 12. Current status

Technical foundation exists.

Search launch remains OFF by default.

TSEO production launch is not considered complete until the Launch Readiness Gate is explicitly passed.
