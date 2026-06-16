# SEO Change Set Storage Contract v1

Date: 2026-06-14  
Status: ready for Supabase migration review

## Purpose

Approved SEO drafts must not be written directly into product/source/import data. They should first become pending change sets with before/after values, source event references, status, and review history.

This contract defines the storage layer between `/admin/seo-apply` and any future controlled SEO content view.

## Current flow

- `/admin/seo-lab/[slug]` creates rule-based draft suggestions.
- `/admin/seo-approval` records approval events.
- `/admin/seo-export` collects approved drafts.
- `/admin/seo-apply` shows before/after previews.
- Future storage step creates pending change sets.

## New table

Recommended table:

`public.feya_commerce_seo_change_sets`

One row equals one proposed field-level SEO change.

## Allowed target fields v1

- `seo_title`
- `meta_description`
- `h1`
- `primary_image_alt`
- `collection_hint`
- `description_outline`

No price, payment, shipping, inventory, media URL, sitemap, feed, or indexation flags are allowed in v1.

## Status lifecycle

- `pending`
- `approved`
- `rejected`
- `applied`
- `superseded`

## Required columns

- `change_set_id`
- `product_slug`
- `canonical_product_id`
- `source_event_id`
- `source_route`
- `target_field`
- `current_value`
- `proposed_value`
- `reason`
- `rule_pack_version`
- `template_pack_version`
- `status`
- `created_at`
- `reviewed_at`
- `applied_at`

## Safety rules

The table is internal-only. It must not be readable by anonymous users or browser clients. Public storefront should only consume applied/approved SEO values through a separate safe view later.

This contract does not create public SEO output, sitemap output, feed output, or indexation flags.

## Future admin views

- pending change set queue;
- approved but not applied queue;
- applied history;
- rejected/superseded history;
- per-product SEO change timeline.

## Next implementation step

Create SQL migration draft for the table and internal admin view. Then build a read-only `/admin/seo-change-sets` page that can display stored rows after the SQL is applied.
