# FEYA Commerce — Current Start Here

Date: 2026-08-07
Status: current execution entrypoint
Repository: `THEFEYA/feya-commerce`
Active branch: `claude/human-copy-v2-20260727`
Draft PR: `#19`

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

## Product Truth regression product

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

## Current live editorial pilot

```text
canonical_product_id: a94b5c1b-3346-4868-b0f6-7a60d954530e
matched_etsy_listing_id: 1885178663
```

The last preview showed a four-part deterministic checklist:

```text
Headpiece
Leg Covers
Shoulders
Top
```

The runtime contract must reverify these options before every paid call. The
generator must still describe one whole costume; Meta, Intro and About do not
repeat this checklist. A large set follows the same composition rule as a
two-part set.

## Non-negotiable boundaries

- Existing payment remains intentionally inactive until its own readiness work.
- Never expose source tables or server secrets to the client.
- Never generate or paraphrase the fixed right PDP information panel.
- What’s Included is deterministic storefront output, never model copy.
- No product Apply or Publish without explicit human approval.
- No fixed keyword-density target. Natural buyer language and verified intent
  outrank mechanical repetition.

## Active generation contract

The production path is one bounded writer call:

```text
deterministic Product Truth + saved focus + reviewed keyword roles
→ zero-cost preflight
→ one OpenAI writer request
→ deterministic structural, commercial and keyword validators
→ blocked preview or human review
```

There is no automatic retry, second editor or generic humanizer. A failed
draft is shown with evidence. A targeted repair is a separate explicit human
action, never a hidden second charge.

The writer receives compact positive block frames plus short
`feature → wearer value` claims. It does not receive a full warrior paragraph
to copy or a growing paid blacklist. Layout, What's Included, right-panel
facts, purchase configuration, FAQ and internal links remain code-owned.

For a supported multi-component offer, the generated section jobs are:

```text
About: whole-product buyer job + one supported differentiator; no inventory
Why: 3-4 different feature → buyer-value families; no purchase configuration
Ideal for: 4-5 distinct people and concrete situations; varied rhythm
Close: we/our studio voice, one TheFEYA mention, honest self-expression value
```

## Exact reviewed focus for the regression product

```text
event: Burning Man, festival
persona: warrior
Primary: warrior armor costume
```

Only the saved focus for the product may enter generated copy. Unselected
event, style or persona suggestions remain internal questions, not prose.

The exact Primary is intentionally owned by three fields:

```text
SEO title
H1
meta description
```

Body copy must preserve the whole-product concept through natural grammatical
variation, not repeat the exact phrase for density. Secondary phrases are
semantic vocabulary, not a checklist. Component terms are used in factual ALT
only when the sold part is visibly present. There is no target keyword
percentage.

## Last observed live result

The latest 2026-08-07 preview used one bounded writer call with no retry or
editor, so the cost architecture worked. It returned a review-only draft and
did not save, approve, Apply or Publish anything. The result improved Why and
Ideal for, but correctly remained blocked.

The exact observed causes were:

```text
deterministic title normalization produced “for Festival”
the imperative buyer job “Help the wearer…” leaked into About
About contained fewer than 40 useful words
four ALT rows were returned for one supplied image
the extra detail ALT changed glossy/mirror-like into unsupported “reflective”
the body omitted a close semantic variation of “warrior armor costume”
the close used the negative comparison “without borrowing … character”
the self-expression validator missed the valid phrase “make the look their own”
```

The corrective contract now inflects generic `festival` as `Festivals`,
supplies `warrior armor outfit` as the body identity variant, expresses the
buyer job as customer-facing context rather than an instruction, keeps one ALT
for the single supplied image, uses a positive 45-60 word About frame, blocks
negative borrowing comparisons, and recognizes `make the look their own`.
These cases are covered by the current 179-test SEO suite.

## Exact continuation step

Deploy the corrective branch to a Vercel Preview and verify the real preview
route for product `a94b5c1b-3346-4868-b0f6-7a60d954530e` without pressing any
generation, repair, save, Apply or Publish control. A later controlled pilot
may run exactly one generation with its already saved focus only after an
explicit operator authorization. Accept it only if all of the following are
true:

```text
Primary is represented naturally in title/H1/meta and exact count is at most 3
body copy uses a natural whole-product semantic variation
no unselected event/style/persona leakage
no repeated component inventory outside deterministic What’s Included
no unsupported photo, fit, coverage, convenience, or styling mechanism
ALT names only visible sold product
Why contains 3-4 distinct, evidenced buyer reasons
Ideal for contains 4-5 different people and situations without template rhythm
final close uses we/our and one TheFEYA mention
Intro and About sound natural when read aloud
fixed right panel is unchanged
structural, commercial, and keyword placement validators pass
```

Do not save, approve, apply or publish during this corrective checkpoint. The
owner first reviews the visible result and explicitly authorizes persistence.
