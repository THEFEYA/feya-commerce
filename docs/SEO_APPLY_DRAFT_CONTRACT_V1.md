# SEO Apply Draft Contract v1

Date: 2026-06-14  
Status: active planning contract

## Purpose

SEO Export Queue collects approved SEO draft suggestions. This contract defines the next safe layer before any approved draft can be written to public product SEO fields, sitemap, feeds or structured data.

This is intentionally not an auto-publish system.

## Pipeline

1. SEO draft is generated from product facts and current rule/template logic.
2. Draft appears in `/admin/seo-lab/[slug]`.
3. Draft is approved in `/admin/seo-approval`.
4. Approved draft appears in `/admin/seo-export`.
5. Future Apply Draft layer creates a pending change set.
6. Admin reviews before/after values.
7. Admin explicitly approves the change set.
8. System writes to a controlled SEO content table, not raw source imports.
9. Change log is recorded.
10. Indexation/sitemap/feed status can be recalculated.

## Hard rules

The Apply Draft layer must not:

- mutate raw Etsy/Shopify/import source data;
- overwrite product facts;
- publish automatically;
- add pages to sitemap automatically;
- enable public indexation automatically;
- generate fake discounts or unverified claims;
- change price, payment, inventory, shipping or production state;
- write to browser-exposed clients using service role keys.

## Required fields for every pending SEO change

- change_id;
- product_slug;
- canonical_product_id;
- source_event_id;
- source_route;
- target_field;
- current_value;
- proposed_value;
- proposed_by;
- reason;
- rule_pack_version;
- template_pack_version;
- status: pending, approved, rejected, applied, superseded;
- created_at;
- reviewed_at;
- applied_at.

## Target fields

Allowed target fields for the first phase:

- seo_title;
- meta_description;
- h1;
- primary_image_alt;
- collection_hint;
- description_outline.

Not allowed in the first phase:

- price;
- compare_at_price;
- product media URL;
- checkout/payment data;
- inventory;
- shipping promises;
- public sitemap flag;
- public feed flag;
- indexation flag.

## Apply safety

A pending change set can be generated automatically from approved drafts, but applying it must require explicit admin action.

Before applying, UI must show:

- current value;
- proposed value;
- source approval event;
- scoring context;
- affected route;
- whether media SEO is ready;
- whether product is blocked by any launch/indexation rule.

## Storage recommendation

Create a future table:

`public.feya_commerce_seo_change_sets`

This table should be separate from v4 storefront view and raw imports.

Public storefront should read approved/applied SEO content only through a safe view.

## Event names

Future event types:

- seo_change_set_created;
- seo_change_set_approved;
- seo_change_set_rejected;
- seo_change_set_applied;
- seo_change_set_superseded.

These should be added only after the database contract is created.

## Current implementation status

Implemented:

- `/admin/seo-lab/[slug]` draft suggestions;
- `/admin/seo-approval` approval queue;
- `/admin/seo-export` approved draft export queue;
- approval event link to `/admin/indexation`.

Not implemented yet:

- SEO change set table;
- apply mutation API;
- public SEO field override view;
- sitemap/feed/indexation recalculation from applied SEO fields.

## Next build step

Create read-only Apply Draft planning helper and admin screen that converts approved exports into pending change set previews without writing anything.
