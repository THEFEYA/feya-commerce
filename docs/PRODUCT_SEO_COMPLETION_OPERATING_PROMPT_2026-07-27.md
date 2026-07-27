# FEYA Product SEO Completion — Operating Prompt

Date: 2026-07-27  
Scope: complete Product Page SEO Packs before landing-page generation  
Mode: evidence-first worker with fail-closed gates

## Mission

Continue the existing FEYA Commerce implementation until product-card SEO
generation is safe, reproducible, useful to buyers, reviewable by a human, and
ready for a controlled preview.

Do not build a second system. Inspect the current GitHub branch, Supabase
contracts, and Vercel preview before deciding that a capability is missing.
Prefer a small correction to the existing path over a parallel abstraction.

The business sequence is fixed:

```text
safe Product Page SEO Packs
→ human review and approval
→ landing pages for event/style/persona/component intents
→ launch
→ analytics and advertising feedback
```

Landing-page generation is explicitly out of the current implementation scope.

## Decision order

For every decision, use this order:

1. Buyer usefulness and factual truth.
2. Current sellable offer and canonical product identity.
3. Search intent and verified keyword evidence.
4. Natural English and conversion clarity.
5. Technical indexability, structured data, internal linking and performance.
6. Reusability, auditability and operational speed.

Search volume never overrides product truth. An image never proves included
components. A legacy source label never overrides the current selector.

## Authority hierarchy

### Sellable offer

The exact current storefront v4 `configurations` payload is the authority for
what a buyer can select now.

Resolve it through one contract:

```text
storefront_sellable_offer_v1
```

The resolver must:

- preserve current public labels;
- separate atomic options from aggregate options;
- map an aggregate only from explicit current member codes or from a closed,
  unambiguous current selector;
- produce a deterministic signature;
- return `HOLD` if labels, codes, or aggregate members are unresolved;
- never import components from Etsy history, title text, keywords, images, or
  stale Product Truth.

### Product Truth

Canonical Product Truth supplies semantic identity, material/color facts,
mapping provenance, non-components, unresolved evidence and review blockers.
It may validate prose but cannot add a sellable component absent from a ready
current sellable offer.

### Legacy Etsy/import evidence

Keep raw labels, variations, descriptions and price rows as provenance. Use
them to diagnose disagreement, never to silently repair current offer truth.

### Visual evidence

Use product images for visible color, finish, silhouette, styling context and
image-specific ALT. Do not infer sellable contents, material behavior, comfort,
fit, durability, reflective properties, or hidden construction from appearance.

### Keyword evidence

Use the approved Keyword Bank with its metric source, locale, freshness,
volume, competition and role. Treat metrics as prioritization evidence, not
truth. Treat a search query as intent, not necessarily grammatical copy.

## Product workflow

Run this loop for one product or a controlled batch:

1. Read the exact current storefront v4 product.
2. Read canonical Product Truth and its blockers.
3. Resolve and sign the current sellable offer.
4. Reconcile saved component focus against current atomic components.
5. Re-audit the saved keyword shortlist and roles against the current product.
6. Invalidate the decision when option or keyword signatures changed.
7. Require a natural whole-product Primary for a multi-component PDP.
8. Require explicit human confirmation of the current focus and keyword roles.
9. Call OpenAI only after every hard gate passes.
10. Generate only SEO fields, image ALT candidates and the four left PDP
    description blocks.
11. Run deterministic structural, commercial, keyword-placement,
    product-specificity, similarity and factual QA.
12. Permit at most two constrained editorial passes after the writer. Each may
    rewrite language but cannot change facts, roles, options, saved focus or
    fixed storefront copy. Select a rewrite only when deterministic QA proves
    a strict improvement and no new Product Truth blocker appears.
13. Show an exact storefront preview.
14. Save a new versioned review artifact; never overwrite history silently.
15. Keep Apply and Publish disabled until explicit human approval.

## Pre-generation blockers

No OpenAI call is allowed when any applicable blocker exists:

```text
option_truth_mismatch
aggregate_option_used_as_component
included_item_not_found_in_current_options
aggregate_members_unknown
visual_detail_promoted_to_sellable_component
keyword_contains_unsupported_component
primary_scope_mismatch
primary_is_unnatural_query_fragment
no_valid_pdp_primary
stale_option_snapshot
keyword_roles_changed_after_reaudit
manual_focus_contains_unsupported_component
composition_missing_canonical_product_truth
composition_missing_confirmed_components
composition_has_unresolved_facts
composition_has_review_blockers
composition_missing_source_configuration_evidence
keyword_selection_not_human_confirmed
```

Return the precise blocker and the next operator action. Never “work around”
missing truth with more prompt wording.

## What’s Included contract

What’s Included is code-owned deterministic output placed after About this
piece. OpenAI must never generate, translate, summarize, or repair it.

For the regression product `d42b9d73-1327-49fa-bfab-9a732b133772`:

```text
Skirt option      → Skirt
Shoulders option  → Shoulders
Full Set option   → Shoulders + Skirt
```

The accompanying sentence is:

```text
The shoulders and skirt are available separately or together.
```

If the aggregate cannot be mapped from current data, hide the block and return
`HOLD`.

## Keyword and copy policy

- Start from the buyer job and whole product, not from material or database
  anatomy.
- A multi-component product needs a natural outfit, costume, ensemble, attire,
  or otherwise genuine whole-product query as Primary.
- `Full Set` alone is selector language, not a customer search entity.
- Component queries may remain Secondary only when the component is currently
  sold and the phrase does not misrepresent the complete page entity.
- Use commercial modifiers such as buy, order, shop, price or online only when
  the approved query and sentence make them natural. Do not force them into
  every field.
- Inflect and reorder keyword words for idiomatic English. Do not preserve an
  unnatural query fragment merely for exact matching.
- Do not optimize to a fixed keyword percentage or “water” score.
- Keep the exact Primary phrase to no more than four uses across the generated
  pack: SEO title, H1, meta description and one useful body passage. Keep the
  concept dominant through idiomatic inflection and natural whole-product
  references, not a keyword-density target, synonym chains or repeated intent.
- Collection-level intents belong to future landing pages and should not be
  stuffed into a PDP.

Generated customer copy must:

- be English en-US;
- be specific, concise and useful to a buyer;
- explain the supported product benefit before construction detail;
- keep About this piece, Why you’ll love it, Ideal for, and Designed for
  self-expression functionally distinct;
- avoid robotic image-analysis language, empty luxury/festival clichés,
  unverifiable promises and repetitive templates;
- use TheFEYA at most once in visible generated PDP copy and not in SEO title,
  H1 or meta description.

## Image and ALT policy

For each public image:

- keep a stable image identity and role;
- describe the sold visible product first;
- add color, finish, angle or setting only when visible and useful;
- omit model clothing, props and accessories not confirmed as sold;
- never add buy/order/price language to ALT;
- create a review signal for low resolution, duplication, missing role,
  misleading crop, unsupported content or weak product visibility;
- keep filename, ALT, media role and Product Truth attached to the same image
  version.

Image sitemap and structured product media can be added in the technical SEO
phase, but inaccurate ALT must never be mass-generated for speed.

## Google and AI-discovery principles

Use current official search guidance as the standard:

- create people-first, accurate, original content with a clear purpose;
- use generative AI as an aid, with accuracy, quality and relevance controls;
- make products crawlable through normal links and coherent site structure;
- maintain stable canonical URLs and intentional canonical tags;
- provide valid Product/ProductGroup/Offer structured data that matches visible
  content and, when enabled, a consistent Merchant Center feed;
- keep sitemap, canonical, public content and applied database version in one
  world;
- protect Core Web Vitals and avoid unnecessary client-side work.

No implementation can guarantee first position in Google. The controllable
goal is the strongest truthful, crawlable, differentiated and conversion-useful
page, followed by measurement and iteration.

Do not rely on hidden AI text, keyword stuffing, doorway pages, mass-produced
near-duplicates, or an `llms.txt` file as a substitute for accessible product
facts and structured data.

## State and versioning

Every saved SEO artifact must retain:

- canonical product id and source listing id;
- sellable-offer signature;
- Product Truth/mapping version;
- manual focus;
- selected keyword rows, roles, metrics and selection signature;
- prompt/contract version and model metadata;
- generated output;
- deterministic QA results;
- image inputs and ALT review state;
- reviewer, timestamps and lifecycle status;
- superseded version relationship when changed.

When options, mappings, media, keywords or validation rules materially change,
mark the earlier decision stale and require a new review. Never maintain
different public, sitemap, structured-data and admin realities.

## Regression acceptance

Before merging:

- unit tests prove current selector precedence over stale Etsy evidence;
- Full Set maps only to current atomic options;
- an unknown aggregate fails closed;
- stale option signatures invalidate old decisions;
- unsupported manual component focus is removed and requires review;
- false `Bracelets`, `Harness Top`, and `Top` keywords are rejected for the
  regression product;
- no component-only or unnatural Primary authorizes a multi-component PDP;
- Product Truth, keyword, output, similarity and preview gates remain intact;
- `npm run test:seo`, `npm run typecheck`, and `npm run build` pass;
- a Vercel Preview is inspected;
- no real product is applied or published.

## Completion condition for this phase

This phase is complete only when a representative controlled set of products
can move through:

```text
current options
→ Product Truth
→ reviewed focus and keywords
→ generation
→ deterministic QA
→ exact preview
→ versioned save
→ explicit human approval
```

without invented components, stale decisions, robotic text, keyword-scope
errors, or parallel data worlds.
