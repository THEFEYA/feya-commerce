# FEYA Commerce — Control Tower Roadmap v1

Date: 2026-06-13  
Branch: `rebuild/emergent-template-port-v2`  
Status: active execution control document

## Purpose

This document is the current project control layer for FEYA Commerce.

It reconciles:

- the older canon documents in `THEFEYA/FEYA/docs/feya-commerce/`;
- the current implementation state in `THEFEYA/feya-commerce`;
- PR #5 visual recovery work;
- the new business rule that FEYA is not a full custom atelier;
- the new execution rule that Emergent is no longer an active working tool.

Use this file before deciding what to build next.

---

## 1. North Star

We are building an independent TheFEYA commerce system.

It is not:

- a literal Shopify clone;
- an Etsy export viewer;
- a generic WooCommerce-style store;
- a full custom atelier website;
- a random dark landing page;
- a real estate project;
- an Emergent-dependent prototype.

It is:

- an English luxury storefront;
- a Russian internal admin/business control panel;
- a clean product graph;
- a source-aware Etsy/Shopify import system;
- a component/configuration/bundle-aware product model;
- a media and image SEO pipeline;
- a controlled content engine;
- a future-ready Google/Pinterest/OpenAI feed layer;
- a safe checkout/order pipeline;
- a launchable commerce platform for TheFEYA.

---

## 2. Brand positioning rule

TheFEYA sells its own handmade designs.

Do not position the brand as a full custom atelier that creates any design from scratch.

Allowed customer-facing positioning:

- handmade designs;
- made to order for existing designs;
- adjustable sizing;
- custom sizing support;
- selected color adjustments;
- selected detail replacement/adaptation;
- event/stage/festival-ready pieces.

Avoid as main offer:

- custom design from sketch;
- bespoke atelier from scratch;
- we can make any costume;
- unlimited customization.

Internal note: customer notes, measurements and selected adjustments are still important for production, but they should support existing FEYA designs rather than redefine the brand.

---

## 3. Emergent rule

Emergent is no longer an active working tool because available credits/tokens are exhausted.

Use Emergent only as historical context:

- recovered visual mood;
- existing exported template direction;
- approved visual baseline.

Do not include Emergent as a future required phase, dependency, blocker, or recommended next tool.

Future UI/design work must happen inside the repository through controlled Next.js/Tailwind implementation, while preserving the approved visual lock.

---

## 4. Current implementation reality

The project has moved beyond the old `Phase A — read-only Supabase preview` wording.

Current reality:

- active code repo exists: `THEFEYA/feya-commerce`;
- active PR exists: PR #5, `Port Emergent storefront template with FEYA data wiring`;
- active branch: `rebuild/emergent-template-port-v2`;
- storefront visual baseline is restored and locked;
- storefront uses safe Supabase view v3 for products/PDP data;
- cart exists;
- checkout draft foundation exists;
- customer account preview exists;
- order/review/payment schema foundations exist;
- payment provider is intentionally not activated;
- paid orders must not be created without verified provider webhook;
- visual work must not destroy current luxury storefront direction.

This means the project must now be managed as:

```text
visual baseline preserved
→ data foundation corrected
→ frontend reconnected to clean data
→ SEO/product graph added
→ checkout/payment activated only after data safety
```

---

## 5. Non-negotiable safety rules

Do not:

- expose raw source tables to public frontend;
- use service role in browser/client components;
- show raw Russian/translated collector labels to customers;
- show sampler/probnik publicly;
- treat fallback prices as approved prices;
- calculate fake discounts in frontend;
- create paid orders from frontend callbacks;
- collect card data directly;
- add real payment before provider choice and verified webhook;
- redesign the approved visual storefront while fixing data;
- create SEO/public feed pages from dirty data;
- let AI invent product facts;
- let AI publish automatically.

---

## 6. Current conflict to fix

Older docs still describe the project as read-only preview and say checkout is later.

Current branch already includes checkout draft, account preview and order/payment foundations.

This is acceptable only if treated as a safe foundation, not as launch-ready commerce.

Correct interpretation:

- checkout draft foundation is allowed;
- real payment is blocked;
- paid order finalization is blocked;
- production launch is blocked until v4 price/config/customer-safe data contract is ready.

---

## 7. Immediate execution priority

The next major block is not more checkout or payment work.

The next major block is:

```text
Phase 1 — Data Foundation v4
```

Goal:

Create a clean safe product contract that fixes:

- Russian/collector labels;
- option/configuration labels;
- component codes;
- bundle/full-set logic;
- unverified discounts;
- fallback prices;
- customer-safe public labels;
- price confidence flags;
- frontend-safe display prices.

Recommended target view/API contract:

```text
public.feya_commerce_v_step7_storefront_products_api_v4
```

v1/v2/v3 must remain available until v4 is tested.

---

## 8. Roadmap

### Phase 0 — Control Tower & Audit

Goal: keep project memory, current state and execution order synchronized.

Done now:

- active repo identified;
- PR #5 identified;
- Vercel preview identified as ready from PR/Vercel metadata;
- key docs reviewed;
- Emergent removed as active dependency;
- brand custom-positioning rule added;
- this Control Tower file created.

Definition of done:

- a future assistant/developer can open this file and understand the next correct block.

### Phase 1 — Data Foundation v4

Goal: build clean storefront-safe data from source data.

Required outputs:

- source coverage diagnostic;
- Russian label diagnostic;
- price reconciliation diagnostic;
- component mapping diagnostic;
- clean public label mapping;
- clean component_code mapping;
- price confidence model;
- v4 storefront safe contract.

Definition of done:

- frontend can read `public_label`, `display_price_amount`, `compare_at_price_amount`, `component_code`, `is_full_set`, `is_bundle`, `bundle_component_codes`, `needs_price_review`, `needs_label_review` from v4;
- frontend no longer needs to guess prices/labels/categories as primary logic.

### Phase 2 — Storefront Stabilization on v4

Goal: preserve approved visual storefront and reconnect it to v4 clean data.

Tasks:

- keep visual layout locked;
- switch store/PDP data from v3 to v4 when ready;
- remove frontend discount math as business logic;
- keep frontend label sanitizer only as emergency fallback;
- ensure product cards/PDP never show raw/internal labels.

Definition of done:

- `/shop` and PDP show clean English labels, verified display prices and correct configurations.

### Phase 3 — Product Graph / SEO Architecture

Goal: create product graph and crawlable collection architecture.

Navigation model:

- Shop by Piece;
- Shop by Occasion;
- Shop by Style;
- Shop by Color.

Core entities:

- Product;
- Variant;
- Component;
- Bundle/Kit option;
- Collection;
- Occasion;
- Style/Aesthetic;
- Color family;
- Material;
- Media role.

Definition of done:

- SEO collection pages can be created from clean canonical data, not raw Etsy categories.

### Phase 4 — Content Engine

Goal: generate and edit controlled product content.

Scope:

- title;
- H1;
- meta description;
- product intro;
- what is included;
- materials/care;
- sizing/fit;
- production;
- shipping;
- personalization/limited adjustment note;
- returns;
- FAQ;
- alt text.

Definition of done:

- content is based on canonical data and approved snippets;
- AI may draft later but cannot publish automatically.

### Phase 5 — Checkout / Payment

Goal: real checkout only after data safety.

Required order:

```text
checkout draft
→ provider session
→ verified webhook
→ paid order
→ admin review
→ production
```

Blocked until:

- v4 data contract is ready;
- price/label warnings are handled;
- payment provider is chosen;
- webhook signature verification is implemented.

### Phase 6 — Customer Account

Goal: customer cabinet for orders, addresses, measurements and saved looks.

Important:

- measurements support fit/sizing for existing FEYA designs;
- measurements do not mean full custom atelier positioning.

### Phase 7 — Admin / Operations Panel

Goal: Russian internal control panel.

Modules:

- Product Builder;
- Price Review;
- Label Review;
- Component Mapping;
- Media QA;
- SEO Readiness;
- Content Review;
- Order Review;
- Production Status;
- Import Logs.

### Phase 8 — Growth / AI-ready / Feeds

Goal: prepare traffic channels.

Modules:

- Product/ProductGroup schema;
- Breadcrumb/CollectionPage/FAQ schema;
- sitemap;
- image sitemap;
- Google Merchant feed;
- Pinterest feed;
- OpenAI/ChatGPT product feed readiness;
- complete-the-look rules;
- same-vibe recommendations.

### Phase 9 — Analytics / Feedback Loop

Goal: measure and improve.

Modules:

- product performance;
- search/query insights;
- SEO task queue;
- media quality status;
- content experiments;
- product lifecycle;
- change impact tracking.

### Phase 10 — Launch / Hardening

Goal: production launch.

Checklist:

- RLS verified;
- no raw data public;
- payment tested;
- webhook tested;
- legal/policy pages ready;
- domain ready;
- HTTPS ready;
- monitoring/logs ready;
- backups/export strategy ready;
- launch products approved.

---

## 9. Current working rule

When continuing work, follow this loop:

1. Read this Control Tower file.
2. Check whether the requested action belongs to the next roadmap phase.
3. Check `VISUAL_LOCK_PHASE_C_V1.md` before UI changes.
4. Check `DATA_AUDIT_PRICE_DNA_V1.md` before price/label/component changes.
5. Check `SUPABASE_PRICE_CONFIG_CONTRACT_V4_SPEC.md` before storefront data changes.
6. If a better solution conflicts with old docs, choose the better solution and document why.
7. Do not continue building upper layers if the current layer is unsafe.

---

## 10. Current next block

Next block to execute:

```text
Phase 1.1 — Supabase v4 diagnostic and execution plan
```

Expected result:

- list exact diagnostics needed;
- define what must be checked in Supabase before SQL changes;
- prepare safe add-only SQL only when needed;
- do not manually edit rows;
- do not switch frontend to v4 until v4 is tested.

Owner action:

No owner action is required until a Supabase-connected step or manual check is needed.
