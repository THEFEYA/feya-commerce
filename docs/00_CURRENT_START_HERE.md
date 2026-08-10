# FEYA Commerce — Current Start Here

Date: 2026-08-10
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

## Current verified checkpoint (2026-08-10)

The deployed preview at commit
`91acda248f10b53eb1222ec03e32669c6edd2188` reserves exact product-page
Primary ownership before any OpenAI request.

For the current Gold Warrior editorial pilot:

```text
canonical_product_id: a94b5c1b-3346-4868-b0f6-7a60d954530e
matched_etsy_listing_id: 1885178663
keyword selection: confirmed
Primary owner: warrior armor costume
generation preflight: pass
publish status: blocked pending peer reassignment and later publish gates
```

The exact matching peer is:

```text
canonical_product_id: d42b9d73-1327-49fa-bfab-9a732b133772
matched_etsy_listing_id: 4340584466
current included components: Shoulders, Skirt
keyword selection: needs_keyword_review
generation status: blocked_pending_keyword_reassignment
```

That peer must receive a different validated **whole-product** Primary before
generation or publication. Current phrases such as `gold skirt set`,
`festival skirt set`, and `metallic skirt outfit` describe only part of the
sellable two-piece offer and must not be promoted to Primary just because they
have volume.

The last paid Gold Warrior control output returned HTTP 422 and was not saved,
applied, approved, or published. The exact failed copy now passes structural
and commercial regression QA after bounded zero-token normalization, but that
regression result is not a human editorial approval and is not an index-ready
SEO Pack. No paid generation is authorized merely by loading the current
preview.

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

## Historical reviewed focus for the regression product

The allocation below records the earlier editorial pilot and is superseded for
live keyword ownership by the 2026-08-10 checkpoint above. It remains useful
for copy-regression tests only; it must not authorize generation or publish for
product `4340584466`.

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

The 2026-08-08 preview ran exactly one bounded `gpt-5.4-mini` writer request.
It completed in about 6.9 seconds with 3,774 input and 900 output tokens. No
retry, editor, repair, save, approval, Apply or Publish action followed. The
review draft correctly returned HTTP 422 rather than presenting weak copy as
ready.

Product Truth and section order were correct. The remaining failures were
editorial and two deterministic false negatives:

```text
“Step into…” was a generic Meta cliche
“belongs at festivals and cosplay” was not idiomatic English
“festival or cosplay wearer” and “character-first look” were robotic shorthand
“The comfortable against the body feel” was grammatically broken
“own story on arrival” was empty closing language
H1 “…for Festivals” was not recognized as saved focus `festival`
ALT repeated exact Primary a fourth time
```

The new corrective contract keeps the compact one-call architecture but makes
the positive memory more concrete. `fact_statement_en` and
`buyer_outcome_en` are now complete grammatical customer sentences that the
writer may reuse directly. Intro, Meta, About, Why, Ideal for and ALT each have
one positive job. `Festivals` is matched through the same inflection aliases as
manual focus, and exact Primary in ALT is replaced deterministically with the
reviewed `warrior armor outfit` variation without touching pose or setting
facts. Generic sales cliches and the exact live-pilot robotic phrases are
zero-cost blockers, not extra prompt tokens. These cases are covered by the
current 212-test SEO suite.

## Superseded 2026-08-08 continuation step

The deployment checkpoint described below has been completed. Continue from
the 2026-08-10 checkpoint at the top of this file, not from this historical
instruction.

Deploy this corrective branch to a Vercel Preview and verify the real preview
route for product `a94b5c1b-3346-4868-b0f6-7a60d954530e` without pressing any
generation, repair, save, Apply or Publish control. The next paid checkpoint is
one fresh generation from the new deployment, never the Repair button. Accept
it only if all of the following are true:

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
