# FEYA Commerce — Admin & Product OS Vision v1

Status: strategic product/admin backlog  
Purpose: keep all brainstormed business logic before visual work  
Language split: public storefront in English, internal admin in Russian

---

## 1. Core principle

FEYA Commerce admin should not be only a Shopify-like product editor.

It should become a Product Operating System for TheFEYA:

```text
Import → Diagnose → Normalize → Build Product → Content/SEO → Media → Pricing → Publish → Monitor → Improve
```

Shopify-style admin is the baseline. FEYA admin should go further by knowing the real business rules:

- Etsy import reality;
- handmade products;
- sets/configurations/components;
- AI/styled imagery risk;
- fallback prices;
- sampler/probnik exclusion;
- SEO/GEO/AI-ready product pages;
- media readiness;
- change impact tracking;
- future marketplace/feed export.

---

## 2. Admin areas to preserve in roadmap

### 2.1 Dashboard / Command Center

Purpose: answer “what needs my attention today?”

Must show:

- products ready for storefront;
- products blocked from publishing;
- price issues;
- media issues;
- content/SEO issues;
- fallback price review;
- sampler/probnik audit;
- recent changes;
- next recommended actions.

Future advantage:

- not just analytics, but an action queue.

---

### 2.2 Import Center

Purpose: safely import data without losing raw evidence.

Must preserve:

- import batches;
- source Etsy rows;
- source price rows;
- raw payloads;
- matching confidence;
- unresolved matches;
- do-not-import / do-not-publish decisions.

Important rule:

Raw source data is evidence, not the final product page.

---

### 2.3 Product Builder

Purpose: the main product editing workspace.

Must have sections:

1. Identity
   - product title;
   - slug;
   - source Etsy listing ID;
   - product type;
   - status/readiness.

2. DNA / taxonomy
   - part;
   - material;
   - color;
   - context/use-case;
   - style/aesthetic;
   - gender/fit when relevant.

3. Components / what is included
   - normalized component list;
   - bundle/set logic;
   - included vs not included;
   - component aliases.

4. Configurations / options
   - set options;
   - size options;
   - color/material options;
   - price per configuration;
   - fallback price warning;
   - sampler/probnik exclusion.

5. Pricing
   - real collected price;
   - fallback price;
   - future cost/profit logic;
   - margin warnings;
   - currency handling.

6. Media
   - primary card image;
   - gallery images;
   - image roles;
   - missing media warnings;
   - AI/styled imagery flag;
   - alt text readiness.

7. Content / SEO / AI
   - H1;
   - SEO title;
   - meta description;
   - PDP copy blocks;
   - snippets;
   - AI draft status;
   - human approval status.

8. Readiness checklist
   - can publish;
   - cannot publish;
   - blockers;
   - next action.

---

### 2.4 SEO / GEO / AI Search Cockpit

Purpose: prepare products and collections for organic search and AI discovery.

Must track:

- SEO title quality;
- H1 quality;
- meta description;
- canonical URL;
- slug quality;
- schema.org Product/ProductGroup readiness;
- image alt text;
- internal linking;
- collection assignment;
- duplicate/cannibalization risk;
- AI-ready product summary;
- feed-ready fields.

Future modules:

- collection landing page builder;
- keyword cluster coverage;
- AI search snippet preview;
- structured data validator.

---

### 2.5 Media QA Center

Purpose: avoid bad product cards and weak PDP galleries.

Must show:

- missing primary image;
- too few images;
- duplicate images;
- image not matching product/configuration;
- low quality image flag;
- missing alt text;
- styled/AI image disclosure requirement;
- recommended product card image.

Future advantage:

- media readiness becomes a launch gate, not an afterthought.

---

### 2.6 Pricing & Profit Center

Purpose: avoid selling products with broken or unprofitable price logic.

Must include later:

- real option-level prices;
- fallback price warning;
- sampler exclusion;
- cost inputs;
- margin estimate;
- discount simulation;
- shipping impact;
- currency handling;
- price change log.

Important rule:

Formula pricing is diagnostic/future. Real collected prices are primary until approved otherwise.

---

### 2.7 Collections / Merchandising Builder

Purpose: make the storefront navigable and SEO-friendly.

Must support later:

- Shop by Piece;
- Shop by Occasion;
- Shop by Style;
- Shop by Color/Material;
- Burning Man / festival / stage / editorial collections;
- complete-the-look groups;
- related products;
- same material/color/style recommendations;
- manual featured products.

Do not build only generic filters.

TheFEYA needs editorial commerce navigation.

---

### 2.8 Change Log & Impact Tracking

Purpose: understand what actually improves traffic, conversion and sales.

Must preserve future logic:

- every title/content/SEO/media/price/status change is logged;
- change reason;
- before/after;
- who/what changed it;
- expected effect;
- later performance comparison.

Future advantage:

- FEYA admin becomes smarter over time and does not repeat bad SEO/product decisions.

---

### 2.9 Tasks / Work Queue

Purpose: turn diagnostics into actions.

Must support later:

- task packs;
- product-specific tasks;
- review steps;
- assigned owner;
- status;
- due date;
- completion log;
- effect review.

Examples:

- fix missing media;
- approve fallback price;
- rewrite SEO title;
- normalize components;
- review sampler exclusion;
- prepare for collection launch.

---

### 2.10 Feed / Channel Readiness

Purpose: prepare for Google Merchant, Pinterest, Meta, TikTok, future marketplaces.

Must track later:

- feed title;
- feed description;
- price/currency;
- availability;
- image suitability;
- product category;
- shipping/returns summary;
- policy compliance;
- blocked products.

Do not expose this in public UI yet, but keep roadmap ready.

---

## 3. Public storefront areas to preserve

### 3.1 Home page

Should become:

- brand positioning page;
- editorial entry point;
- collection/navigation launcher;
- trust/policy teaser;
- SEO landing path gateway.

Not only a generic hero.

### 3.2 Shop / PLP

Must evolve into:

- product grid;
- collection context;
- filters;
- sorting;
- badges;
- editorial merchandising;
- SEO-friendly collection pages.

### 3.3 PDP

Must include:

- gallery;
- title;
- price range;
- configuration selector later;
- what is included;
- materials/care;
- sizing/fit;
- production time;
- shipping/returns;
- handmade/styled imagery note;
- related products;
- structured data.

### 3.4 Policy / trust pages

Needed later:

- shipping;
- returns/exchanges;
- custom sizing;
- handmade variation;
- styled/AI imagery note;
- privacy/cookies;
- terms.

---

## 4. What Shopify-like admin does not know by default

FEYA-specific admin should understand things generic Shopify admin does not understand deeply:

- a product can be a set, not a simple item;
- product configurations may represent bundles, not just variants;
- sampler/probnik rows must not define public price range;
- fallback prices are evidence quality issues;
- AI/styled images require disclosure/readiness;
- Etsy titles/tags are not final SEO content;
- product DNA affects navigation and SEO;
- product updates should be measured after the change.

This is why FEYA admin should be better than a generic product editor.

---

## 5. Phase order

### Current Phase B

- read-only storefront;
- read-only PDP structure;
- read-only admin review;
- read-only admin products;
- no edits;
- no checkout.

### Next: Visual Pass v1

Only visual/UI improvement over existing working skeleton.

Do not add business logic yet.

### Next: Product Builder Read-only Detail

A product detail admin page that shows all product data in structured blocks.

Still no edits.

### Next: Controlled Editing

Only after read-only Product Builder is validated:

- edit draft content;
- approve content;
- map components;
- approve price/configurations;
- log all changes.

### Later: Commerce

- cart;
- checkout;
- payment provider;
- tax/VAT/shipping logic;
- orders;
- customers;
- CRM.

---

## 6. Current recommendation

Before asking Emergent for visual polish, keep this document as the roadmap guardrail.

Emergent may improve visuals, layout, spacing, cards and interaction affordances.

Emergent must not remove or hide the future operating system structure.

The next real product feature after visual polish should be:

```text
Admin Product Builder read-only detail page
```

because it is the bridge between current overview tables and future editing/AI/SEO workflows.
