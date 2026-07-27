# FEYA Commerce — Current Start Here

Date: 2026-07-27
Status: current execution entrypoint
Repository: `THEFEYA/feya-commerce`
Integration branch: `work/product-truth-variant-separation-20260723`

## Read first

The current operating contract is:

```text
docs/PRODUCT_SEO_COMPLETION_OPERATING_PROMPT_2026-07-27.md
```

Historical reports and research remain useful evidence, but they do not
override this file, the current storefront v4 selector, current Supabase
contracts, or verified application behavior.

## Current phase

```text
Finish safe, repeatable Product Page SEO Pack generation
→ QA and human approval
→ only then build collection/landing-page generation
→ launch the storefront
→ collect organic, conversion and advertising data
```

Do not start a parallel admin, Product Truth system, keyword bank, storefront,
or SEO engine. Extend the existing path.

## Current data authority

For what a shopper can buy now:

```text
feya_commerce_get_step7_storefront_products_api_v4().configurations
→ storefront_sellable_offer_v1 resolver
```

For semantic product facts and provenance:

```text
feya_commerce_get_seo_product_truth_v4()
```

For operator intent and reviewed keyword roles:

```text
feya_commerce_listing_master_decisions_v1
→ vw_seo_keyword_bank_v1_approved
```

Current selector options outrank stale Etsy variations and older Product Truth
snapshots when determining sellable components. Etsy data remains provenance.
Images may confirm visible appearance, but never prove what is included.

## Hard safety rule

If current options, Product Truth, saved focus, keyword roles, or their
signatures disagree:

```text
HOLD
→ no OpenAI call
→ no draft authorization
→ no Apply
→ no Publish
```

A changed option snapshot invalidates the earlier reviewed decision.

## Current regression product

```text
canonical_product_id: d42b9d73-1327-49fa-bfab-9a732b133772
matched_etsy_listing_id: 4340584466
```

The current selector is exactly:

```text
Skirt
Shoulders
Full Set
```

For `Full Set`, the deterministic included components are:

```text
Shoulders
Skirt
```

`Bracelets`, `Harness Top`, and `Top` are stale evidence and must not enter
What’s Included, component focus, product keywords, generated prose, ALT, or
structured product claims. `Full Set` is an aggregate selector choice, not a
component and not a Primary keyword entity.

## Non-negotiable boundaries

- Existing payment remains intentionally inactive until its own readiness work.
- Never expose source tables or server secrets to the client.
- Never generate or paraphrase the fixed right PDP information panel.
- What’s Included is deterministic storefront output, never model copy.
- No product Apply or Publish without explicit human approval.
- No fixed keyword-density target. Natural buyer language and verified intent
  outrank mechanical repetition.
