# FEYA Commerce — Emergent Visual Brief v1.1

Status: ready after Phase B skeleton and Product OS guardrails  
Target repo: `THEFEYA/feya-commerce`  
Current mode: read-only Supabase preview  
Language split: public storefront in English, admin in Russian

---

## 1. Main instruction

Improve the visual design and UX structure of the existing working FEYA Commerce app without replacing the architecture.

Do not rebuild the project from scratch.

Do not replace real Supabase data with mock data.

Do not remove existing routes, safe views, env logic, or read-only restrictions.

Your task is a design/UI pass on top of the current working skeleton.

This is not a generic Shopify theme. This is the foundation of a future TheFEYA Product Operating System.

---

## 2. Current working routes

Public storefront:

```text
/
/shop
/shop/[slug]
```

Admin preview:

```text
/admin
/admin/review
/admin/products
```

---

## 3. Data contract must stay intact

The app currently reads safe Supabase views only.

Do not query raw tables.

Do not add service-role usage.

Do not add write/edit mutations.

Do not add checkout/cart yet.

Safe views currently used:

```text
public.feya_commerce_v_step7_storefront_products_api
public.feya_commerce_v_step8_review_queues_summary
public.feya_commerce_v_step6_product_catalog_overview
```

Keep this read-only logic intact.

Public pages must keep loading real products from Supabase.

Admin pages must keep loading real review/product data from Supabase.

---

## 4. Product OS guardrails

Before editing UI, read and follow these docs:

```text
docs/PRE_EMERGENT_GAP_AUDIT_V1.md
docs/ADMIN_PRODUCT_OS_VISION_V1.md
docs/SHOPIFY_PARITY_AND_COMMERCE_REQUIREMENTS_V1.md
docs/PERFORMANCE_ARCHITECTURE_GUARDRAILS_V1.md
docs/SUPABASE_HANDOFF.md
docs/IMPLEMENTATION_PLAN_PHASE_A.md
```

The admin should visually communicate this long-term system:

```text
Import → Diagnose → Normalize → Build Product → Content/SEO → Media → Pricing → Publish → Monitor → Improve
```

Do not reduce the admin to a pretty product table.

Do not remove future-facing structure such as review queues, readiness, Product Builder placeholders, media/SEO/pricing warnings or next actions.

---

## 5. Brand direction

TheFEYA visual direction:

- luxury editorial fashion;
- dark / noir / cinematic base;
- gold accents, but not cheap casino gold;
- high-fashion festival/stage/costume energy;
- premium handmade couture feel;
- strong product imagery;
- clean commercial UX, not just an art portfolio.

Avoid:

- generic Shopify template look;
- childish festival colors;
- neon cyberpunk overload;
- fake luxury clichés;
- cluttered dashboard look on public pages;
- replacing real content with marketing placeholders;
- heavy animation that can hurt performance.

---

## 6. Public storefront improvements

### `/`

Improve the home page as a real brand entry point.

Needed blocks:

1. Hero with TheFEYA positioning.
2. Entry links to Shop and Admin Preview.
3. Short explanation that this is an independent commerce engine preview.
4. Editorial dark fashion feel.
5. Future section placeholders for collection navigation and trust/policy blocks.

Do not make it final production home yet.

### `/shop`

Improve the product grid and catalog preview.

Keep real data fields from `StorefrontProduct`:

- `card_title`
- `primary_image_url`
- `min_price`
- `max_price`
- `currency`
- `material`
- `color`
- `public_configuration_count`
- `has_fallback_price`

Improve:

- product card proportions;
- consistent image height;
- title truncation/readability;
- price readability;
- badge styling;
- responsive grid;
- planned filter bar styling;
- clear visual direction for future Shop by Piece / Occasion / Style / Color.

Do not implement real filters yet unless they are local/non-destructive and do not require schema changes.

### `/shop/[slug]`

Improve PDP preview structure.

Keep and improve existing sections:

1. Gallery/primary image area.
2. Product title.
3. Price range.
4. Product meta badges.
5. Read-only configurations/options block.
6. Future content blocks placeholders:
   - What’s included
   - Materials & care
   - Sizing & fit
   - Production time
   - Shipping & returns
   - Handmade / styled imagery note

Important:

- Do not add Add to Bag yet.
- Do not fake checkout readiness.
- Do not hide configuration/fallback price warnings.
- Do not remove content hierarchy blocks.

---

## 7. Admin preview improvements

Admin language is Russian.

### `/admin`

Improve as an internal control hub.

Needed blocks:

- Review Queues card;
- Product Drafts card;
- Phase status card;
- future Product Builder card;
- clear note: read-only, no editing yet;
- action-oriented framing: what needs attention today.

### `/admin/review`

Improve review queue cards.

Keep meanings:

- `needs_price` — high priority;
- `missing_media` — high priority;
- `fallback_price_review_rows` — medium priority;
- `storefront_excluded` — medium priority;
- `sampler_excluded_rows` — low/audit only.

Make the dashboard easier to scan.

Each card should visually answer:

- what is the issue;
- why it matters;
- what the next Product Builder action will be later.

### `/admin/products`

Improve table readability.

Keep fields:

- title;
- Etsy ID;
- readiness;
- publish status;
- next action.

Improve:

- sticky-ish visual header if simple;
- badges;
- spacing;
- long title handling;
- mobile horizontal scroll;
- summary metric cards;
- clear future path to Product Builder.

Do not add editing.

---

## 8. Performance and architecture rules

Keep Next.js App Router.

Keep TypeScript strict mode.

Keep Supabase client in `lib/supabase.ts`.

Keep current data types in `lib/types.ts` unless only adding safe optional fields.

Do not add large UI libraries unless absolutely necessary.

Do not add paid dependencies.

Do not add heavy animation.

Do not add tracking scripts.

Do not move product rendering into a heavy client-only SPA.

Keep public pages crawlable and fast.

Prefer editing:

```text
app/globals.css
components/ProductCard.tsx
app/page.tsx
app/shop/page.tsx
app/shop/[slug]/page.tsx
app/admin/page.tsx
app/admin/review/page.tsx
app/admin/products/page.tsx
```

Do not touch Supabase schema.

Do not break CI.

---

## 9. Acceptance checklist

The visual pass is acceptable only if:

- `npm run typecheck` passes;
- `npm run build` passes;
- `/shop` still loads real Supabase products;
- `/shop/[slug]` still opens a real product;
- `/admin/review` still loads real queue data;
- `/admin/products` still loads real product rows;
- no mock replacement happened;
- no write/edit UI was added;
- no fake cart/checkout/buy button was added;
- no service role key was introduced;
- raw tables are still not queried;
- public storefront remains English;
- admin remains Russian-first;
- performance stays lightweight.

---

## 10. What not to do

Do not create a separate fake landing page disconnected from the current app.

Do not rename routes.

Do not replace Supabase calls with hardcoded arrays.

Do not add checkout.

Do not add customer account/auth.

Do not add Product Builder editing yet.

Do not make public pages Russian.

Do not make admin pages English-first.

Do not change business logic around samplers, fallback prices, or do-not-publish flags.

Do not hide future architecture because it is not visually polished yet.

---

## 11. Final instruction

This is a visual pass over a working commerce foundation.

Make it look more premium, clear, modern, and useful, but preserve the skeleton for the future full FEYA Commerce system.

The best result is not a finished Shopify clone.

The best result is a beautiful, fast, real-data Phase B interface that can safely grow into Product Builder, SEO/media/pricing workflows, checkout, orders, feeds and analytics later.
