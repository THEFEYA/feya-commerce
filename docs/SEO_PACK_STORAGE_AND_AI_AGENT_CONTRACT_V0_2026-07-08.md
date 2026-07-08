# FEYA Commerce — SEO Pack Storage + AI Agent Contract v0

Status: contract proposal only  
Date: 2026-07-08  
Branch: `rebuild/emergent-template-port-v2`  
Scope: bridge from SEO Brief v2.1 to future AI-agent SEO Content Engine

This document defines the next safe contract after SEO Brief v2.1. It is not a Supabase migration, not a write route, and not a generation workflow. No database changes are implied by this file.

---

## 1. Current operating decision

The project must not jump from keyword selection directly to generated production text.

The safe flow is:

```text
Listing Master saved decision
→ SEO Brief v2.1
→ SEO pack storage contract
→ AI-agent input/output contract
→ QA gates
→ draft save only after explicit approval
→ publish readiness check
```

Current hard limits:

- no Supabase writes from this step;
- no OpenAI API calls from this step;
- no final SEO pack generation yet;
- no new public route;
- no keyword-bank expansion;
- no fake keyword metrics;
- no production product data mutations.

---

## 2. SEO Brief v2.1 source of truth

SEO Brief v2.1 is the pre-generation contract screen. It should provide the future agent with:

- canonical product id;
- matched Etsy listing id when available;
- product title / card title / H1 / slug;
- product facts: material, color, category, world/context, image state;
- manual Product DNA from Listing Master;
- selected keywords with validated metrics;
- keyword role groups;
- product-specific excluded words;
- global blacklist note;
- SEO QA contract;
- draft preview: title/H1/meta/intro/bullets/FAQ/ALT/internal links;
- readiness decision.

For the test product, product truth priority is:

```text
Primary:
- post apocalyptic shoulder armor
- warrior shoulder armor
- futuristic shoulder armor

Secondary/support:
- cyberpunk shoulder armor
- gold shoulder armor
- gold shoulders
- warrior shoulders

Collection/internal:
- burning man festival costume
- burning man festival outfits
- men's burning man clothes
- men's EDM festival clothing
- gold festival outfit
- festival outfits gold
- cyberpunk festival outfit
```

Commercial words such as buy, order, price, shipping, custom and delivery are placement-sensitive. They belong in FAQ/meta/body/landing only when supported, not in the main product title by default.

---

## 3. Proposed storage model, no SQL yet

These are logical storage targets, not migrations to execute now.

### 3.1 `seo_product_pack_drafts_v1`

Purpose: one reviewable SEO pack draft per product/version.

Required fields:

```text
id uuid
canonical_product_id uuid
matched_etsy_listing_id text null
source_decision_id uuid null
source_brief_version text default 'seo_brief_v2_1'
pack_version text default 'seo_pack_v1'
status text
created_at timestamptz
updated_at timestamptz
created_by text null
updated_by text null
```

Content fields:

```text
seo_title text null
h1 text null
meta_title text null
meta_description text null
intro text null
full_description text null
bullet_highlights jsonb default []
faq_json jsonb default []
image_alt_json jsonb default []
internal_links_json jsonb default []
structured_data_notes_json jsonb default []
```

Contract fields:

```text
product_truth_json jsonb not null
manual_focus_json jsonb not null
keyword_roles_json jsonb not null
metrics_status_json jsonb not null
excluded_words_json jsonb default []
global_blacklist_note_json jsonb default []
qa_checks_json jsonb not null
cannibalization_check_json jsonb null
agent_input_json jsonb null
agent_output_json jsonb null
human_review_json jsonb null
```

Lifecycle status values:

```text
brief_ready
draft_generated
needs_human_review
needs_keyword_review
needs_similarity_check
needs_image_alt_review
blocked_by_product_mismatch
blocked_by_cannibalization
approved_draft
ready_for_publish
published
archived
```

### 3.2 `seo_product_pack_events_v1`

Purpose: audit trail for every meaningful SEO pack decision.

```text
id uuid
pack_id uuid
canonical_product_id uuid
event_type text
event_note text null
actor text null
event_payload_json jsonb default {}
created_at timestamptz
```

Example event types:

```text
brief_viewed
agent_contract_created
draft_generated
qa_warning_added
human_review_requested
human_edit_saved
similarity_check_completed
approved_for_publish
publish_blocked
published
```

### 3.3 `seo_keyword_role_map_v1`

Purpose: store the chosen role of each keyword for a product, separated from raw keyword bank.

```text
id uuid
canonical_product_id uuid
keyword_norm text
role text
placement text
metric_source text null
avg_monthly_searches numeric null
competition text null
role_reason text null
is_primary_candidate boolean default false
is_final_primary boolean default false
created_at timestamptz
updated_at timestamptz
```

Allowed roles:

```text
primary
secondary
support
image_alt
collection
faq_commercial
hold
reject
```

---

## 4. AI-agent input contract

The agent must receive a narrow, explicit payload. It must not browse the database, infer product facts from old Etsy text, or invent metrics.

```json
{
  "contract_version": "seo_agent_input_v1",
  "task": "draft_product_seo_pack",
  "language": "en-US",
  "brand": "TheFEYA",
  "canonical_product_id": "uuid",
  "matched_etsy_listing_id": "text|null",
  "product": {
    "title": "string",
    "slug": "string",
    "category": "string",
    "material": "string|null",
    "color": "string|null",
    "world": "string|null",
    "primary_image_alt": "string|null",
    "known_components": [],
    "known_non_components": []
  },
  "manual_focus": {
    "component": "string|string[]|null",
    "material": "string|string[]|null",
    "event": "string|string[]|null",
    "style": "string|string[]|null",
    "persona": "string|string[]|null",
    "audience": "string|string[]|null",
    "exclude": "string|string[]|null"
  },
  "keyword_roles": {
    "primary": [],
    "secondary": [],
    "support": [],
    "image_alt": [],
    "collection": [],
    "faq_commercial": [],
    "hold": [],
    "reject": []
  },
  "metrics_status": {
    "status": "validated|partial|missing",
    "validated_count": 0,
    "missing_metric_count": 0,
    "note": "string"
  },
  "qa_contract": {
    "must_check": [
      "cliche_phrase",
      "long_dash",
      "keyword_stuffing",
      "product_specificity",
      "forbidden_mismatch",
      "similarity_cannibalization",
      "image_alt_truth",
      "commercial_placement",
      "validated_metrics"
    ]
  },
  "blocked_words": {
    "product_specific_exclusions": [],
    "global_blacklist_note": []
  },
  "allowed_output_fields": [
    "seo_title",
    "h1",
    "meta_description",
    "intro",
    "bullet_highlights",
    "faq",
    "image_alt_candidates",
    "internal_linking_hints",
    "qa_self_report"
  ]
}
```

---

## 5. AI-agent output contract

The agent must return JSON-like structured output that can be shown as a draft, not published automatically.

```json
{
  "contract_version": "seo_agent_output_v1",
  "status": "draft|needs_review|blocked",
  "seo_title": "string|null",
  "h1": "string|null",
  "meta_description": "string|null",
  "intro": "string|null",
  "bullet_highlights": [],
  "faq": [
    {
      "question": "string",
      "answer": "string",
      "intent": "commercial|fit|shipping|materials|styling|care|other"
    }
  ],
  "image_alt_candidates": [
    {
      "image_role": "primary|detail|lifestyle|unknown",
      "alt_text": "string",
      "truth_basis": "visible_product_fact|needs_image_review"
    }
  ],
  "internal_linking_hints": [
    {
      "anchor": "string",
      "target_type": "collection|related_product|guide",
      "reason": "string"
    }
  ],
  "qa_self_report": {
    "cliche_phrase": "pass|warning|blocker",
    "long_dash": "pass|warning|blocker",
    "keyword_stuffing": "pass|warning|blocker",
    "product_specificity": "pass|warning|blocker",
    "forbidden_mismatch": "pass|warning|blocker",
    "image_alt_truth": "pass|warning|blocker",
    "commercial_placement": "pass|warning|blocker",
    "notes": []
  },
  "generation_notes": []
}
```

Output rules:

- return `blocked` if product facts are insufficient;
- return `needs_review` if image truth or similarity check is missing;
- do not produce final publish status;
- do not include raw Etsy copy as final text;
- do not include unseen components;
- do not include medical/safety claims;
- do not include brands/franchises from global blacklist;
- do not repeat primary keywords unnaturally;
- avoid long dash punctuation as default style;
- use natural human English, not generic AI sales copy.

---

## 6. QA gates before save/publish

### 6.1 Gates before draft save

A generated draft can be saved only if:

```text
- product facts exist;
- at least one validated primary or secondary keyword exists;
- product-specific exclusions are respected;
- commercial intent is not forced into product title;
- image ALT candidates are marked as visible truth or needs review;
- QA self-report has no blocker.
```

### 6.2 Gates before publish readiness

A draft can become `ready_for_publish` only after:

```text
- human review approved;
- similarity/cannibalization check completed;
- image ALT reviewed;
- structured data readiness checked;
- no keyword stuffing warning remains;
- no component mismatch remains;
- no global blacklist/franchise terms remain;
- canonical URL/slug verified;
- product page has image, price/offer, shipping/returns trust blocks.
```

---

## 7. Similarity and cannibalization contract

The SEO pack must reserve its final primary keyword only after comparing against existing products.

Input needed:

```text
canonical_product_id
candidate_primary_keyword
candidate_secondary_keywords
product cluster/component/style/material/event fields
existing product keyword map
similarity pairs / shared token map
```

Output:

```json
{
  "status": "pass|warning|blocker|not_checked",
  "primary_keyword": "string",
  "competing_products": [],
  "shared_tokens": [],
  "risk_reason": "string|null",
  "suggested_resolution": "string|null"
}
```

Rule: no final publish without at least `warning` explicitly reviewed; `not_checked` cannot publish.

---

## 8. Image SEO contract

Image ALT must describe what is visible, not what keyword metrics suggest.

Allowed basis:

```text
visible color
visible component
visible silhouette
visible model/product context
visible material/surface only if clear
```

Forbidden basis:

```text
hidden components
unsupported event claims
brand/franchise references
keyword stuffing
commercial phrases like buy/order/price
medical/safety terms
```

For the test product, safe image directions are:

```text
gold shoulder armor
gold shoulders
warrior shoulders
post apocalyptic shoulder armor if visual style is clear
futuristic shoulder armor if visual style is clear
```

---

## 9. Implementation sequence after this contract

Next safe engineering steps:

```text
1. Keep SEO Brief v2.1 stable and inspect UI screenshot.
2. Add TypeScript contract types only if needed by UI or future route.
3. Add read-only preview object builder from SEO Brief v2.1 output.
4. Add draft storage SQL only after explicit confirmation.
5. Add internal protected generation route only after storage + QA contract is accepted.
6. Add OpenAI call only in the protected route, never in browser code.
7. Add save draft action only after service-role safety and table contract are confirmed.
8. Add publish readiness dashboard after drafts exist.
```

Explicitly not next:

```text
- mass generation for all products;
- direct writes to public product fields;
- new keyword bank imports;
- OpenAI metrics/scoring;
- doorway/landing page explosion;
- uncontrolled buy/order/price variants.
```

---

## 10. Current checkpoint

SEO Brief v2.1 should now act as the bridge into this contract:

```text
Product truth priority > simple score/volume > adjacent style.
```

The next visible product-screen expectation for the test product is:

```text
Primary should not start with cyberpunk shoulder armor.
SEO title should be post-apocalyptic / warrior / futuristic oriented.
Cyberpunk should be secondary/support.
Blocked words should show product-specific exclusions, not the full global blacklist wall.
```
