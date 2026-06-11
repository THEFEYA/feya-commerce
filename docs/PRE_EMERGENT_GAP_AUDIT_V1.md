# FEYA Commerce — Pre-Emergent Gap Audit v1

Status: prepared before Emergent visual pass  
Date: 2026-06-12  
Repo: `THEFEYA/feya-commerce`

---

## 1. Why this audit exists

This audit compares the current working FEYA Commerce implementation with the earlier research documents and project canon before giving work to Emergent.

Goal:

- avoid a beautiful but hollow UI;
- avoid losing the data/admin foundation;
- make sure Emergent improves the real app instead of replacing it with mockups;
- identify which functional links must be reinforced before or during the visual pass.

---

## 2. Current confirmed state

Working now:

- GitHub repo exists: `THEFEYA/feya-commerce`;
- Vercel deployment works;
- `/shop` loads real products from Supabase;
- `/shop/[slug]` opens a real product preview;
- `/admin/review` loads real review queues;
- `/admin/products` loads real product draft overview;
- raw source tables are not queried by the frontend;
- Phase A is read-only;
- no checkout/cart/write/edit mutations are implemented.

Current data layer:

```text
storefront products = 243
storefront configurations = 442
review queues = 5
product catalog overview = 334
```

---

## 3. Alignment with research

### 3.1 Data/admin foundation before visual polish

Research says the realistic first priority is a hard engineering foundation: clean data, import, media, fast storefront, crawlable structure, structured product data and a usable product editor/admin layer before advanced AI or recommendation features.

Current project status: aligned.

We built:

- Supabase-backed canonical preview layer;
- safe view access;
- storefront catalog preview;
- admin review queues;
- admin product overview.

### 3.2 Do not build a full Shopify clone first

Research says not to promise a full Shopify clone or full admin parity quickly. The realistic path is an independent store with its own architecture, data and phased functionality.

Current project status: aligned.

We are not copying Shopify runtime or Liquid theme code. We are building a new Next.js/Supabase catalog-first system.

### 3.3 Catalog-first MVP before full commerce

Research supports a catalog-first MVP for the short sprint, with cart/checkout/order/customer work later.

Current project status: aligned.

Current app intentionally has no cart, checkout, customer accounts, order management or write flows.

### 3.4 Next.js storefront and server-first approach

Research recommends a fast Next.js/App Router style storefront and warns against a heavy client-side SPA when SEO and performance matter.

Current project status: aligned.

The current app uses Next.js App Router and server-rendered data reads from safe Supabase views.

### 3.5 Public storefront in English, admin in Russian

Research and canon require English public storefront and Russian internal admin.

Current project status: partially aligned.

- Public pages are English.
- Admin pages are Russian-first, but some technical labels remain English because they come from data codes. That is acceptable in Phase B but should be mapped to human Russian labels later.

---

## 4. Gaps before a full visual pass

### Gap 1 — PDP does not yet expose configuration details clearly

Current PDP shows price range and configuration count, but does not yet display the `configurations` payload as a readable read-only options table.

Risk:

Emergent may design a pretty PDP without understanding set/options/pricing logic.

Needed:

- read-only configuration/options block on `/shop/[slug]`;
- clear placeholder for future selector;
- no Add to Bag yet.

### Gap 2 — PDP content hierarchy is still skeletal

Research says the first PDP screen should clearly show gallery, product identity, price, variants/options, shipping/returns shorthand and trust details.

Current PDP has the basics, but lacks structured blocks for:

- What’s included;
- Materials & care;
- Sizing & fit;
- Production time;
- Shipping & returns;
- handmade/styled imagery note.

Needed before or during Emergent:

- keep these as structured placeholders, even if content is draft.

### Gap 3 — SEO/GEO layer is not implemented yet

Research requires product structured data, Product/ProductGroup/Offer, canonical URLs, sitemap/robots, Open Graph, merchant-feed-friendly fields and clean variant URLs later.

Current app has basic Next metadata only.

Needed after visual skeleton but before production:

- `robots.ts` or `robots.txt`;
- `sitemap.ts`;
- PDP canonical metadata;
- JSON-LD Product/ProductGroup placeholder;
- Open Graph/Twitter metadata;
- image alt/filename strategy.

### Gap 4 — Media quality dashboard not yet present

Research requires media quality signals: missing images, too small images, generic filenames, alt text, variant mismatch, feed readiness.

Current admin only has high-level `missing_media = 10` queue.

Needed later:

- media review page or Product Builder section;
- image readiness statuses;
- AI/styled imagery flags.

### Gap 5 — Navigation taxonomy and filters are placeholders

Research says navigation should not be only by product type; it should include product type, occasion/use-case, aesthetic/style, color/material/fit and price/filter logic.

Current `/shop` has only visual placeholder chips.

Needed later:

- real category/occasion/style taxonomy;
- filter/search/sort strategy;
- SEO collection/landing pages.

### Gap 6 — Recommendation/merchandising logic is not implemented

Research recommends rule-based merchandising first: complete the look, same vibe, same set, same material/color, complementary products.

Current app has no related products logic.

Needed later:

- rule-based related products view;
- product-to-product relation model or safe view;
- no AI visual search yet.

### Gap 7 — Checkout/payment/tax/policy are intentionally postponed

Research says full payments, tax, VAT/IOSS, policy pages, orders and customers are not a first sprint problem.

Current app intentionally has none of this.

Status: acceptable.

Needed later:

- hosted/PSP checkout plan;
- policy pages shell;
- consent/privacy structure;
- payment provider decision for Ukraine/EU/US reality.

### Gap 8 — Future backend choice remains open

Research says long-term Next.js + Medusa may be the better full commerce backend, while Next.js + Supabase is acceptable for catalog-first MVP.

Current project uses Next.js + Supabase.

Status: acceptable for current catalog-first phase.

Needed later:

- decide whether to stay Supabase-first or add Medusa before checkout/order management.

---

## 5. What must be added to Emergent prompt

Emergent must be told explicitly:

1. This is not final production build.
2. This is visual pass over working read-only skeleton.
3. Do not add checkout/cart/customer auth.
4. Do not replace live Supabase data with mocks.
5. Do not remove admin review queues.
6. Do not remove Product Builder placeholders.
7. Preserve public English + Russian admin split.
8. Keep PDP sections for options, included items, materials, sizing, production, shipping/returns and handmade/styled imagery notes.
9. Keep future SEO/AI/feed readiness visible in structure.
10. Keep performance simple and avoid heavy animation or unnecessary JS.

---

## 6. Recommended next steps before sending to Emergent

Do before Emergent or include as mandatory in prompt:

1. Add read-only configurations/options display to `/shop/[slug]`.
2. Add PDP placeholder blocks for product content hierarchy.
3. Add clearer admin home cards linking to review/products/next Product Builder.
4. Keep `/shop` visual filters as placeholders only.
5. Then run Emergent visual pass with strict brief.

Do after Emergent visual pass:

1. Add SEO metadata and JSON-LD skeleton.
2. Add sitemap/robots/canonical strategy.
3. Add media readiness dashboard.
4. Add taxonomy/filter safe views.
5. Add Product Builder read-only detail page, then write workflows later.

---

## 7. Decision

Do not send a broad open-ended visual prompt yet.

Allowed next prompt type:

```text
Strict visual/UI pass on existing FEYA Commerce read-only skeleton.
No mocks. No architecture replacement. No checkout. No write flows.
```

Before that, the safest next implementation step is to strengthen PDP structure and configuration display.
