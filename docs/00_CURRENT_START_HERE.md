# FEYA Commerce — Current Start Here

Date: 2026-07-27
Status: current execution entrypoint
Repository: `THEFEYA/feya-commerce`
Active branch: `fix/sellable-offer-truth-20260727`
Draft PR: `#18`

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

## Active validation checkpoint

Published code checkpoint:

```text
commit: 34da7aa162c90e06f97a72b1d9b84b582c30a90e
deployment: dpl_2K25V6c8eWzkuLrNZEHbtgFSo3nQ
deployment state: READY
stable branch alias:
https://feya-commerce-git-fix-sellable-o-c638d0-alexs-projects-5419f9ec.vercel.app
```

Verification at this checkpoint:

```text
SEO regression tests: 141/141 passing
TypeScript: passing
ESLint: passing with zero warnings
```

The writer remains a two-pass pipeline: one evidence-bound writer followed by
one final human-copy editor. The final editor now receives deterministic
section jobs. Intro may be one factual sentence; About may be one factual
sentence containing the Primary. Neither section must invent an extra benefit
to meet a word or sentence quota.

The final editor and deterministic validator now reject the observed failure
class:

```text
building from separate finds
makes it easier to choose accessories
focal point
photographs well / wide shots
visible waist detail as a styling mechanism
natural break for changing tops
```

For a confirmed modular offer, the supported Why plan is:

```text
1. original studio design → personal interpretation of the selected persona
2. separately selectable parts → order, replace, or restyle one part without
   reordering the full set
```

## Exact reviewed focus for the regression product

```text
event: Burning Man, festival
persona: warrior
unselected and forbidden as generated focus: rave, cosplay, fantasy,
historical, medieval, costume party
Primary: warrior armor costume
```

The exact Primary is intentionally limited to four placements:

```text
SEO title
H1
meta description
one About this piece sentence
```

Four exact placements are not a density target. Secondary phrases are semantic
candidates, not a checklist; an approved Secondary is used only where it adds
natural meaning. For the current product, `gold shoulder armor` is a natural
ALT candidate. Do not force every skirt/shoulder variant into visible copy.

## Last live result and storage state

The last live generation before commit `34da7aa...` correctly placed the
Primary four times and excluded rave/cosplay, but it was rejected because
Intro and About invented convenience and photography mechanisms. It was not
saved.

After commit `34da7aa...`, the deployment reached READY, but the cloud browser
security policy denied opening the new protected deployment URL. No bypass was
attempted. Therefore the post-fix live generation still requires one browser
run before storage.

Supabase verification for product
`d42b9d73-1327-49fa-bfab-9a732b133772` returned zero rows in
`feya_commerce_seo_pack_drafts_v1`. No rejected draft, approval, Apply, or
Publish action was written.

## Exact continuation step

Open:

```text
https://feya-commerce-git-fix-sellable-o-c638d0-alexs-projects-5419f9ec.vercel.app/admin/seo-storefront-preview?product_id=d42b9d73-1327-49fa-bfab-9a732b133772
```

Run one generation with the already reviewed focus. Accept it only if all of
the following are true:

```text
Primary exact count = 4 in the four owned fields
no unselected event/style/persona leakage
no repeated component inventory outside deterministic What’s Included
no unsupported photo, fit, coverage, convenience, or styling mechanism
ALT names only visible sold product
Why contains two distinct, evidenced buyer reasons
Intro and About sound natural when read aloud
fixed right panel is unchanged
structural, commercial, and keyword placement validators pass
```

Only then use `Сохранить и открыть следующий товар`. This stores a human-review
draft only. Do not approve, apply, or publish during this checkpoint.
