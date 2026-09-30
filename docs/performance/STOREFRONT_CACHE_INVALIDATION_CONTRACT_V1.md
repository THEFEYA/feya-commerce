# TheFEYA Storefront Cache Invalidation Contract v1

Status: IMPLEMENTED / CACHE STILL DISABLED  
Date: 2026-09-30  
Next.js baseline: 16.3.7

## Purpose

This phase creates the invalidation mechanism before any long-lived storefront cache is enabled.

The storefront remains dynamic and uncached. The purpose of this contract is to prove that future cached catalog, collection, product and supporting-page data can be expired deterministically after a write.

## Official Next.js behavior used

- Route Handlers use `revalidateTag(tag, 'max')` for stale-while-revalidate invalidation.
- Authenticated owner Server Actions use `updateTag(tag)` for immediate read-your-own-writes behavior.
- `revalidatePath()` is used with tags when a concrete route path also needs invalidation.
- Cache tags are bounded below the 256-character Next.js limit.
- No single-argument deprecated `revalidateTag(tag)` form is used.

## FEYA tag grammar

Global tags:

- `site`
- `home`
- `catalog`
- `collections`

Entity tags:

- `product:{canonical_product_id}`
- `collection:{slug}`
- `page:{slug}`
- `policy:{name}`

Product slugs are invalidated as paths instead of cache-tag identities. This avoids very long product URL slugs becoming cache tags and makes canonical product UUID the stable product cache identity.

## Event contract

Supported events:

- product_changed
- product_media_changed
- product_stock_changed
- product_slug_changed
- product_unpublished
- collection_membership_changed
- collection_content_changed
- landing_page_changed
- policy_changed
- home_content_changed
- global_content_changed

The caller does not submit arbitrary tags. It submits a bounded event scope; server code derives the allowed tags and paths.

## External / webhook invalidation

Endpoint:

`POST /api/internal/storefront-revalidate`

Authentication:

`FEYA_STOREFRONT_REVALIDATION_TOKEN`

The token is separate from the broader FEYA internal API token. The route accepts Bearer auth or `x-feya-storefront-revalidation-token`.

Every request also requires an `Idempotency-Key`.

Processing order:

1. authenticate;
2. validate and derive the invalidation plan;
3. check idempotency;
4. write an `accepted` audit row;
5. call `revalidateTag(tag, 'max')`;
6. call `revalidatePath(path)`;
7. mark the audit row `delivered`;
8. on failure, mark the row `failed`.

A delivered idempotency key is replayed without issuing the invalidation twice.

## Owner mutation invalidation

`invalidateStorefrontAfterOwnerMutation()` is a Server Action.

It requires the real FEYA admin authentication/allowlist before executing. It uses `updateTag()`, not webhook-style `revalidateTag()`, so the next request waits for fresh data and the owner sees their own committed change.

## Audit ledger

Table:

`feya_storefront_cache_invalidations_v1`

It records:

- invalidation ID
- idempotency key
- event/entity
- derived tags
- derived paths
- source type/reference
- delivery mode
- accepted/delivered/failed status
- requested/delivered timestamps
- safe error code

The table is not readable by anon/authenticated roles. Only `service_role` receives SELECT/INSERT/UPDATE.

## Important: caching is still off

This phase does **not** add `'use cache'`, `cacheTag()`, ISR, or persistent data caching.

The current Shop remains `force-dynamic` with `revalidate=0` while this invalidation machinery is reviewed and tested.

The next cache phase may assign these tags to cached readers only after:

1. this contract passes CI;
2. the dedicated revalidation secret is configured in the target environment;
3. a synthetic invalidation round-trip is proven against the real Route Handler;
4. the audit ledger records accepted → delivered correctly and idempotent replay does not duplicate rows;
5. product, media, stock, slug, unpublish, membership and content mutation scopes all have deterministic tag/path plans;
6. the storefront read model/runtime parity gate is green.
