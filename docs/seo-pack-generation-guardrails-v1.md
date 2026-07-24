# FEYA SEO Pack Generation Guardrails v1

Date: 2026-07-23

Purpose: prevent SEO package generation from becoming free-form AI text. The generator must use product facts, saved Listing Master decision, validated keyword data, and QA rules.

## Input contract

A product SEO pack must be generated only from:

1. Canonical product data
   - canonical_product_id
   - product_slug
   - title/H1/source title
   - material
   - color
   - operator section
   - source Etsy/import category
   - world/category label
   - primary image and media context

2. Product DNA / focus from Listing Master decision
   - component
   - material/color
   - event/context
   - style/visual world
   - persona/image
   - audience/buyer angle
   - keyword strategy: demand / opportunity / niche

3. Selected keyword snapshot
   - keyword
   - keyword_norm
   - bank_bucket / page type
   - score from keyword bank
   - average monthly searches when available
   - competition / competition_index when available
   - match score and match reasons

4. Component mapping
   - parent components
   - child components
   - component review risk
   - what is included / not included must not be invented

## Output pack

Generate and store/review these blocks:

- SEO title
- H1
- meta description
- slug suggestion if needed
- short product intro
- full product description
- bullets / why it works
- confirmed What’s Included data from storefront Product Truth (never AI-generated)
- materials and care block
- sizing/fit/comfort notes
- shipping/production/returns snippets
- FAQ
- image ALT text
- image filename suggestions
- Product / ProductGroup / Offer structured-data fields
- internal link suggestions
- related product suggestions
- cannibalization warnings

## Writing rules

- No fake materials, fake comfort claims, fake availability, or fake included pieces.
- Do not use keywords if they contradict the product DNA.
- Do not overuse one primary keyword.
- Avoid keyword stuffing.
- Avoid boilerplate AI language such as: "elevate your look", "step into", generic luxury phrases, empty festival clichés.
- Avoid long dash style in product text.
- Keep text human, clear, buyer-useful, and product-specific.
- Product page text must explain what the product is, where it fits, what is included, how it is worn, and what visual role it plays.

## Keyword placement rules

- Primary keyword: SEO title, H1 or first intro sentence, meta, and one natural body occurrence.
- Secondary keywords: body, bullets, FAQ, and image ALT when visually true.
- Image keywords: only when the image actually shows that feature.
- Commercial intent words like buy, price, order, shop, for sale are ranking signals and may be used only where natural, not forced into every block.
- Collection keywords should not be forced into product descriptions when they are better for landing pages.

## QA checks before approval

Blockers:

- No selected product
- No saved Listing Master decision
- No useful keywords
- Component mapping risk with unclear included pieces
- Product facts missing for material/color/component
- Keyword/product mismatch

Warnings:

- Too many broad collection keywords
- No validated Google Ads metric in selected keywords
- Too many high-competition keywords
- Missing image alt opportunity
- Repeated phrase / template duplication risk
- Thin text risk
- Cannibalization risk with similar product

## Lifecycle

Listing Master owns only:

- not_saved
- decision_saved / draft

SEO pack layer owns:

- brief_ready
- content_generated
- qa_needs_review
- content_approved
- published_to_storefront
- superseded

Never silently overwrite old decisions or old generated packs. New versions should supersede older versions so future analytics can compare which focus/text worked better.

## Current enforcement

- Real OpenAI generation is two-state: `READY_FULL` or `BLOCKED`. A partial composition may be reviewed by an operator, but it is not a safe writing brief.
- Generation is blocked before the model call unless canonical Product Truth contains exact confirmed components, source configuration evidence, and no unresolved component facts or review blockers.
- A multi-piece product must stay a multi-piece page entity. Manual focus can guide event, persona, audience, style and supporting terms, but it cannot turn a set into a single-component product.
- Word-order permutations in the same page bucket represent one search intent and consume only one keyword role.
- The storefront-owned right PDP panel and What’s Included rendering are never written or paraphrased by OpenAI.
