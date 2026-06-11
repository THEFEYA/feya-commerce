# FEYA Commerce — Performance & Architecture Guardrails v1

Status: strategic engineering guardrail  
Purpose: prevent slow, fragile, outdated architecture while building FEYA Commerce in phases

---

## 1. Principle

FEYA Commerce must not become a visually pretty but technically heavy storefront.

Every feature must be judged by three questions:

1. Does it improve selling, admin speed, SEO, data quality or future automation?
2. Can it be implemented without breaking catalog/data architecture?
3. Will it keep the public storefront fast and crawlable?

If the answer is no, the feature goes to later backlog.

---

## 2. Performance philosophy

The public site should be server-first and crawlable.

Avoid:

- heavy client-side product catalog rendering;
- huge UI libraries without need;
- animation-heavy storefronts;
- too many third-party scripts;
- client-only filters for important SEO pages;
- loading full raw product payloads into the browser;
- exposing admin logic in public bundle.

Prefer:

- Next.js App Router;
- server-rendered product and collection pages;
- safe Supabase/API views;
- small components;
- real HTML for product content;
- image optimization strategy;
- controlled caching/revalidation;
- progressive enhancement only where useful.

---

## 3. Current architecture decision

Current stack is correct for catalog-first MVP:

```text
Next.js + TypeScript + Supabase + Vercel
```

This is suitable for:

- storefront preview;
- catalog pages;
- PDPs;
- SEO-ready pages;
- admin preview;
- Product Builder later;
- import/review workflows.

Do not rush Medusa/Saleor/WooCommerce before the Product Builder and catalog foundation are clear.

Potential future decision:

- stay Supabase-first for custom FEYA Product OS;
- or add Medusa later only when cart/checkout/orders/inventory require a stronger commerce backend.

Do not mix commerce backends prematurely.

---

## 4. Data access rules

Public pages must read only safe public views or server APIs built on safe views.

Forbidden for public frontend:

```text
feya_commerce_source_listings
feya_commerce_source_price_rows
raw_payload_json
internal import evidence
service role key
```

Use raw/source data only in admin/server-only contexts when necessary.

---

## 5. Caching and freshness strategy

Different areas need different caching behavior.

### Public storefront

Can be cached/revalidated after the data model stabilizes.

Good candidates:

- collection pages;
- product pages;
- product cards;
- static content blocks;
- policy pages.

Avoid permanent static output while import/review data is still changing quickly.

### Admin pages

Should stay dynamic.

Admin pages show current readiness, blockers, review queues and product status. They should not rely on stale static output.

### Future API layer

When route handlers are added, use explicit cache headers or tag-based cache only for public read data.

Never cache sensitive admin data publicly.

---

## 6. Image performance rules

Images are the biggest storefront performance risk.

Current Phase B uses remote Etsy image URLs for preview only.

Production direction:

- download/import master images to owned storage;
- generate responsive derivatives;
- keep card images consistent in ratio;
- preserve width/height/aspect ratio;
- avoid layout shift;
- use descriptive alt text;
- keep primary card image assigned intentionally;
- later support video but do not autoplay heavy video by default.

Future media QA should warn about:

- missing primary image;
- too few images;
- low resolution;
- generic alt text;
- generic filename;
- image/product mismatch;
- wrong configuration image;
- AI/styled imagery disclosure missing.

---

## 7. SEO and AI-ready architecture rules

SEO is not just title tags.

The system must support:

- clean slugs;
- canonical URLs;
- crawlable collection pages;
- indexable PDPs;
- structured data later;
- Product/ProductGroup/Offer readiness;
- sitemap and robots;
- Open Graph images;
- image alt text;
- internal linking;
- feed-ready product fields;
- AI-ready short summaries and normalized attributes.

Do not generate mass thin pages.

Do not create SEO pages before taxonomy and content quality are clear.

---

## 8. Storefront UX rules

Public pages should be commercial, not only artistic.

Every PDP must eventually answer:

- What is this?
- What is included?
- What options exist?
- What does it cost?
- What size/fit should I choose?
- What material is it?
- How long does production take?
- How does shipping/returns work?
- Why can I trust this handmade product?
- What goes with it?

The current PDP placeholders exist to preserve this structure before visual work.

---

## 9. Admin UX rules

The admin must reduce thinking load.

Good admin screens should answer:

- what is broken;
- why it matters;
- what to do next;
- what will happen if I approve/publish;
- what changed recently;
- what is ready for launch;
- what is blocked.

Avoid generic CRUD pages without business meaning.

Use queues, readiness, badges, tasks and product-specific next actions.

---

## 10. Future functionality must be real, not decorative

Do not add fake UI for:

- Add to Bag;
- checkout;
- payments;
- shipping calculation;
- customer account;
- product editing;
- media upload;
- AI generation;
- feed export.

These can appear as roadmap/placeholders, but not as working buttons until backend and validation exist.

---

## 11. No-rework implementation order

Recommended order:

1. Read-only storefront and admin foundation.
2. Visual pass over real data.
3. Read-only Product Builder detail page.
4. Controlled editing with change logs.
5. Media QA and owned image pipeline.
6. SEO metadata, sitemap, structured data.
7. Collections/taxonomy/filtering.
8. Cart/checkout architecture decision.
9. Payment/shipping integration test.
10. Orders/customers/CRM.
11. Feeds/channels/analytics.
12. AI helpers and recommendation logic.

This order prevents expensive rebuilds.

---

## 12. Decision rule for new ideas

When a new feature idea appears, classify it:

```text
CORE NOW — required for current phase
FOUNDATION NEXT — needed before production
LATER POWER FEATURE — useful after stable catalog/admin
DANGEROUS DISTRACTION — impressive but too early
```

Examples:

- Product Builder detail page: FOUNDATION NEXT.
- Better product card UI: CORE NOW.
- Visual search by uploaded image: LATER POWER FEATURE.
- Custom checkout without PSP decision: DANGEROUS DISTRACTION.
- Media QA dashboard: FOUNDATION NEXT.
- AI rewriting of 300 PDPs without approval workflow: DANGEROUS DISTRACTION.

---

## 13. Next concrete move

Before broad visual work, keep the app structure honest:

- PDP has configuration and content hierarchy blocks;
- admin has review queues and product overview;
- Product OS roadmap is documented;
- Shopify parity roadmap is documented;
- performance guardrails are documented.

Then Emergent can safely improve visuals without inventing or deleting architecture.
