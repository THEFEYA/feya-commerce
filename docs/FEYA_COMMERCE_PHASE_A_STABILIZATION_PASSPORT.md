# FEYA Commerce — Phase A Stabilization Passport

Date: 2026-06-16
Branch: `rebuild/emergent-template-port-v2`
Status: Phase A stabilization closed; Phase B build may start.

## Product direction

FEYA Commerce is not a literal Shopify clone and not an Etsy export viewer.

The target architecture is:

`canonical product -> variants/options -> components -> bundles/looks -> SEO landing/category pages -> public storefront`.

Etsy and Shopify imports are source-aware inputs. They are not the core product model.

The admin panel is a data-quality cockpit. The public storefront must be SEO-ready, image-ready, merchant/feed-ready and AI-readable.

## Brand positioning rule

TheFEYA should not be positioned as a custom atelier from scratch.

Correct positioning:

- original handmade designs;
- adjustable/custom sizing where supported;
- selected color/detail adjustments;
- made-to-order only for existing designs;
- no invented materials, delivery guarantees, sizes, discounts or components.

## Confirmed Supabase contracts

Main admin catalog source:

- `feya_commerce_v_step6_product_catalog_overview`
- scope: all canonical admin products
- observed product count: 334

Main storefront candidate source:

- `feya_commerce_v_step7_storefront_products_api_v4`
- scope: public/storefront candidates only
- observed candidate count: 243

Product detail fallback chain:

1. storefront product by `product_slug`;
2. builder detail by `canonical_product_id`;
3. catalog overview fallback by `canonical_product_id`.

Known absent object:

- `public.feya_commerce_v4_admin_products` does not exist and must not be used.

## Phase A completed work

Stabilized routes:

- `/admin/products`
- `/admin/products/[slug]`
- `/admin/indexation`
- `/admin/seo-lab`
- `/admin/seo-lab/[slug]`
- `/admin/media-seo`
- `/admin/media-seo/[slug]`
- `/admin/seo-approval`
- `/admin/content`
- `/admin/collections`
- `/admin/launch`
- `/admin/seo-export`
- `/admin/seo-apply`
- `/admin/seo-change-sets`
- `/admin/seo-applied-values`
- `/admin/seo-storefront-preview`
- `/admin/seo-gate`
- `/admin/review`
- `/admin/review/labels`
- `/admin/review/prices`
- `/admin/review/components`
- `/admin/media`
- `/shop`

Stabilization rules applied:

- admin/read views use `dynamic = 'force-dynamic'` and `revalidate = 0`;
- stale `revalidate = 300` removed from stabilized routes;
- stale `limit(250)` removed from stabilized routes;
- legacy/nonexistent admin view removed;
- admin list source separated from storefront candidate source;
- API write boundaries checked for review/change-set flows;
- SEO apply workflow writes change-set rows, not public product data;
- review buttons write review events, not product/storefront records.

## Known remaining caveats

- `/api/admin/review-events` GET still has `select('*')`; update attempts were blocked by tool payload safety. POST path is still allowlisted and writes only review events.
- Many admin files still use `// @ts-nocheck`; cleanup is technical debt, not a Phase B blocker.
- Catalog fallback detail lacks full media/configuration JSON. A future lightweight detail view/RPC should replace the fallback.
- `storefront.ts` still has a very rare fallback product title path. Phase B should replace generic fallback labels with brand-safe labels everywhere.

## Phase B build target

Phase B must move from stabilization to building public storefront/SEO foundation.

Priority order:

1. Public storefront routing foundation
   - `/`
   - `/collections`
   - `/collections/[slug]`
   - `/shop`
   - `/shop/[slug]`

2. SEO/structured data foundation
   - canonical URLs;
   - robots/sitemap;
   - Product/ProductGroup JSON-LD;
   - Open Graph/Twitter metadata;
   - image alt/title roles;
   - noindex rules for admin/internal pages.

3. Product page foundation
   - source-aware product title;
   - public H1/meta/title;
   - gallery with primary/hover/media roles;
   - variant/options display;
   - components/full set distinction;
   - handmade and limited customization positioning.

4. Collection/category foundation
   - category pages by canonical product grouping;
   - event/world pages where data supports them;
   - no fake landing pages without product backing.

5. Admin-to-public bridge
   - SEO preview -> change set -> approved values -> public metadata contract;
   - media readiness -> image sitemap eligibility;
   - product readiness -> publish/public candidate logic.

## Do not do next

- Do not keep doing broad audits without a concrete build target.
- Do not rebuild Shopify feature-for-feature before the catalog/storefront foundation works.
- Do not merge Etsy listings directly into public products without canonical product mapping.
- Do not present TheFEYA as custom atelier from scratch.

## Next action

Start Phase B with public SEO/storefront foundation.

First implementation candidate:

- inspect current public `app/page.tsx`, `app/shop/page.tsx`, `app/shop/[slug]/page.tsx`, metadata helpers and sitemap/robots files;
- then implement or fix the smallest public SEO foundation slice that can ship green in CI.
