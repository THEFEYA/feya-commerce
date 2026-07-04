# Listing Master Status Model v1

Date: 2026-07-04

Purpose: keep the Listing Master workflow simple and avoid mixing keyword decisions with SEO content publishing.

## Core rule

Listing Master is responsible for product focus and keyword decision only.
It should not own the full content publishing lifecycle.

## Product focus source

For each product the system should auto-propose focus from safe product data:

- Etsy/imported title and product text
- product type
- material and color
- world/category label
- parent and child components
- primary image context when available
- approved keyword bank matches

The operator can override the focus manually.
Manual changes must be saved in the decision table for future analytics.

## Listing Master statuses

Use only two main operator statuses here:

1. `not_saved`
   - Russian UI: `не сохранено`
   - Meaning: the product has no saved focus/keyword decision yet.
   - Operator action: review auto-focus, adjust if needed, save decision.

2. `decision_saved`
   - Database value currently used: `draft`
   - Russian UI: `черновик сохранён`
   - Meaning: focus, strategy, and selected keyword snapshot were saved.
   - This is already ready for the next step: SEO brief/content generation.

## Do not show as separate Listing Master statuses

Avoid separate UI statuses inside Listing Master for:

- `ready_for_generation`
- `approved`
- `applied`

Reason: they belong to later workflow layers, not to keyword decision selection.

## Later SEO content lifecycle

A separate SEO content/pack layer can have its own statuses:

1. `brief_ready` — SEO brief created from saved Listing Master decision.
2. `content_generated` — SEO pack/text draft exists.
3. `content_approved` — operator approved text and media SEO.
4. `published_to_storefront` — content applied to product page/indexable site layer.
5. `superseded` — replaced by a newer decision/content version.

## Operator categories

Do not use `Costume Set` as the Listing Master product category.
It is a source/import label, not an operator filter.

Use operator sections from the Supabase Product Focus view:

- Festival outfits
- Burning Man costumes
- Stage & show costumes
- Fashion tops & corsets
- Performance dresses
- Mirror clothing
- Stage bodysuits
- Dance costumes
- Headpieces
- Masks
- Harnesses
- Accessories / small pieces
- Other products

`source_category_label` should preserve the original imported category.
`category_label` or `operator_section_label` should be used for operator filtering.

## Next GitHub UI tasks

1. Replace category chips with compact dropdown filters.
2. Add product status filter with only:
   - all
   - not saved
   - decision saved
3. Rename decision badge from `черновик решения` to `черновик сохранён`.
4. Remove confusing preset cards from the right panel.
5. Add clear next-step CTA after saving:
   - `Дальше: SEO-задание`

## Analytics rule

Never overwrite history silently.
A newer saved decision can supersede an older one, but old decisions should remain available for later comparison against Google Search Console / Analytics performance.
