# FEYA Commerce — SEO Portfolio Overlap Strategy v1

Status: active decision document.

This document corrects the meaning of the current `similarity/cannibalization` gate for Google SEO.

## Core correction

TheFEYA is no longer optimizing only for Etsy marketplace distribution.

On Etsy, similar listings inside one shop could compete for a limited marketplace attention pool, and locomotive listings could absorb traffic from weaker similar listings.

For Google organic search, the strategy is different:

- Traffic is not a fixed Etsy-style internal shop allocation.
- Multiple similar products can all be valuable if they serve real search intents, images, variants, materials, events, or personas.
- Similarity is not automatically bad.
- Exact duplication and unclear page responsibility are bad.

Therefore the gate should not be interpreted as “ban similar products”.

The correct interpretation is:

```text
SEO portfolio overlap / differentiation preflight
```

The system must decide whether overlap is:

1. **Strategic overlap** — acceptable or desirable because it expands a proven cluster.
2. **Needs differentiation** — pages are too similar but can be separated by product facts, persona, event, material, image angle, or long-tail intent.
3. **Duplicate/conflict risk** — pages look like the same page with different URLs and should not be published as-is.

## Why this matters for TheFEYA

TheFEYA has many visually related festival/stage pieces:

- gold shoulder armor;
- futuristic shoulder armor;
- warrior / cyberpunk / Burning Man looks;
- harnesses and armor sets;
- mirror / acrylic / vegan leather pieces;
- stage and festival variants.

A strong cluster can be good for Google if pages have distinct value:

- distinct product facts;
- distinct images;
- distinct component composition;
- distinct buyer persona;
- distinct event/use-case;
- distinct long-tail keyword role;
- clear internal linking;
- correct canonical/URL logic.

A weak duplicate cluster is bad if pages repeat the same title/meta/intro with no unique product truth.

## What the first route currently does

Current route:

```text
/api/admin/seo-engine/draft-similarity-check
```

Current scope:

- compares saved SEO drafts only;
- uses token overlap across title/H1/meta/intro/FAQ/internal links/keyword roles;
- writes `similarity_checked` event;
- updates `similarity_check_snapshot`;
- moves passing drafts to `needs_image_alt_review`;
- does not publish;
- does not mark `ready_for_publish`.

This is a safe first gate, not the final corporate-grade overlap engine.

## What the final corporate-grade engine should compare

The future `SEO Portfolio Overlap Engine` should compare several layers:

### 1. Current imported Etsy/source state

Compare existing imported product state:

- original Etsy title;
- original Etsy description;
- original Etsy tags;
- current product title;
- current product description;
- current slug;
- current materials/colors/options;
- current images and image ALT;
- current price/variation structure.

Purpose: understand where products already start too similar before generation.

### 2. New SEO draft state

Compare generated/approved SEO packs:

- SEO title;
- H1;
- meta description;
- intro;
- full description;
- FAQ;
- image ALT candidates;
- internal links;
- keyword role map.

Purpose: ensure new AI/human content does not collapse products into one repeated template.

### 3. Product DNA / factual overlap

Compare:

- part;
- material;
- color;
- event/use-case;
- persona/style;
- components;
- image roles;
- gender/audience;
- category placement.

Purpose: separate legitimate product similarity from lazy duplicate copy.

### 4. Keyword portfolio allocation

Compare keyword ownership:

- primary product keyword;
- secondary product keywords;
- long-tail keywords;
- collection keywords;
- image keywords;
- excluded keywords.

Purpose: decide which page should own which intent.

### 5. Performance feedback later

After launch, use:

- Google Search Console impressions/clicks/CTR/query data;
- GA4 sessions/conversions;
- product revenue;
- image search traffic;
- internal search/filter use.

Purpose: when a cluster performs well, create more differentiated pages around it instead of blindly avoiding similarity.

## Decision labels

The gate should eventually return one of these labels:

```text
PORTFOLIO_EXPANSION_OK
DIFFERENTIATE_BEFORE_PUBLISH
DUPLICATE_RISK_BLOCKER
COLLECTION_PAGE_BETTER_THAN_PRODUCT
PRODUCT_PAGE_BETTER_THAN_COLLECTION
NEEDS_KEYWORD_REASSIGNMENT
NEEDS_IMAGE_DISTINCTION
NEEDS_SOURCE_DATA_CLEANUP
```

## Corporate-style operating rule

Strong e-commerce teams do not treat SEO overlap as a binary ban.

They run portfolio governance:

- one page owns one main search intent;
- related pages can support the same cluster through distinct long-tail roles;
- collection/landing pages own broad event/style/persona queries;
- product pages own specific product-truth queries;
- image SEO uses visible image truth, not keyword stuffing;
- sitemap/canonical/structured data follow the approved publish state;
- analytics later decide whether to expand or reduce a cluster.

## Immediate next architecture step

Before real OpenAI generation, add a strategy contract that the writer agent must receive:

```text
SeoPortfolioStrategyContract
```

It should include:

- source overlap snapshot;
- draft overlap snapshot;
- keyword ownership decision;
- page type decision;
- required differentiation angle;
- internal linking hints;
- excluded claims/keywords;
- publish blockers.

This ensures OpenAI does not generate isolated text. It writes inside a controlled portfolio strategy.

## Current rule for implementation

Do not advance from `approved_draft` directly to publish.

Correct order:

```text
approved_draft
→ portfolio overlap / differentiation check
→ image ALT truth check
→ structured data / sitemap readiness
→ final human publish approval
```
