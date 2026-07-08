# FEYA Commerce — Current Reality Map

Status: working audit note, not frozen canon  
Date: 2026-06-27  
Branch: chatgpt/operating-front-2026-06-27

This document records the current GitHub reality after the first ChatGPT write-access confirmation and Phase A code audit. It should guide the next implementation steps without becoming a new passport for its own sake.

---

## 1. Verified repository state

Repository: `THEFEYA/feya-commerce`  
Stack: Next.js 15, React 19, TypeScript, Supabase JS  
Current product position: independent commerce system for TheFEYA, not a Shopify clone and not the old Etsy SEO Monitor.

The current application already contains a real read-only preview layer:

- `/` project home/status page.
- `/shop` storefront product grid.
- `/shop/[slug]` read-only PDP preview.
- `/admin` Russian admin entry page.
- `/admin/review` review queue dashboard.
- `/admin/products` read-only product catalog overview.
- `/admin/seo-keywords` read-only SEO keyword cleanup/validation gate.

The app currently uses the App Router under `app/`, not `src/app/`.

---

## 2. Phase A / Phase B naming mismatch

Docs still describe the official current implementation phase as:

```text
Phase A — read-only Supabase preview
```

However, some UI text and constants already say `Phase B skeleton` or `PHASE_B_*` while the behavior is still read-only preview.

This is not a functional bug, but it can confuse future work. Recommended correction: keep the public/internal label as `Phase A read-only preview` until the read-only storefront and admin review flow are confirmed stable.

---

## 3. Data access reality

The current code uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` only.

Current safe views used by code:

- `feya_commerce_v_step7_storefront_products_api`
- `feya_commerce_v_step8_review_queues_summary`
- `feya_commerce_v_step6_product_catalog_overview`
- `feya_commerce_v_seo_keyword_ai_cleanup_report_v1`

The code audit did not find a service role key in the inspected browser/server page code. Current pages are read-only and query views through the Supabase anon client.

Risk to verify through Supabase later:

- whether anon read permissions are correct for the safe views;
- whether raw source tables are not publicly readable;
- whether the storefront view does not leak internal raw payloads;
- whether the SEO keyword cleanup report view exists and returns the expected shape.

---

## 4. What is working conceptually

### Storefront preview

`/shop` reads up to 250 rows from the safe storefront view and renders product cards with image, title, price range, material/color/options badges and safe error handling.

### PDP preview

`/shop/[slug]` reads one product by `product_slug`, shows a read-only PDP panel, basic badges, price range, up to 8 configurations, and placeholder blocks for included parts, materials, sizing, production, shipping/returns and styled imagery.

### Admin review

`/admin/review` reads the review queue summary and maps known queue codes such as:

- `needs_price`
- `missing_media`
- `fallback_price_review_rows`
- `storefront_excluded`
- `sampler_excluded_rows`

### Admin products

`/admin/products` reads the catalog overview and displays readiness, publish status and next action without write UI.

### SEO keyword gate

`/admin/seo-keywords` reads the SEO keyword cleanup report view and clearly states that generated keyword candidates are not final keywords until cleaned, validated with real metrics, scored and approved. This is directionally correct and prevents fake OpenAI scoring.

---

## 5. Main gaps before moving to SEO Content Engine implementation

### Gap 1 — no build/runtime verification from the live environment yet

The code structure looks coherent, but we still need either local/Vercel build confirmation or a deployment report. Without this, the current state is “code-audited”, not “runtime-confirmed”.

### Gap 2 — Supabase live view reality not confirmed in this chat

The repository docs contain expected counts and expected view names, but we need a fresh Supabase-connected report before depending on those counts for production decisions.

### Gap 3 — SEO Content Engine is not implemented yet

There is a read-only keyword gate, but no implemented SEO pack generation/review contract yet.

Missing future pieces:

- product SEO pack type;
- content QA model;
- keyword bucket assignment;
- component accuracy checks;
- image SEO readiness checks;
- anti-cannibalization warnings;
- schema readiness checks;
- save/review workflow.

### Gap 4 — PDP uses placeholders for critical launch content

The PDP correctly avoids making false claims, but launch-ready product pages will need real generated/approved content for:

- what is included;
- materials and care;
- sizing and fit;
- production time;
- shipping and returns;
- handmade/styled imagery note;
- FAQ;
- image alt text and structured data.

### Gap 5 — image pipeline is preview-permissive

`next.config.ts` uses `images.unoptimized = true` for preview. This is acceptable for early Phase A but not final for SEO/image performance. Future work should replace this with a controlled image host strategy, responsive sizes, quality rules and image QA.

---

## 6. Immediate next work order

### Step 1 — clean small naming mismatch

Normalize Phase labels in UI/constants so the app consistently says Phase A until a real phase transition happens.

### Step 2 — request Supabase reality report

Ask the Supabase-connected chat for a fresh read-only report covering:

- project report counts;
- review queue summary;
- storefront view sample;
- frontend API contract;
- SEO keyword cleanup report existence and sample;
- anon-read safety status if available.

### Step 3 — make a minimal Phase A readiness fix commit

Depending on Supabase report and build state:

- fix naming mismatch;
- add an explicit current-state doc link;
- improve empty/error states if needed;
- avoid adding write workflows.

### Step 4 — design SEO Content Pack v1 as contracts only

Before adding generation buttons, define TypeScript contracts for:

- `SeoContentPackV1`;
- `KeywordBucketAssignment`;
- `ContentQaResult`;
- `ImageSeoCheckResult`;
- `CannibalizationWarning`;
- `StructuredDataReadiness`.

This should be a safe design step, not a production generator yet.

### Step 5 — only after contracts, implement controlled generation route

The generation route must not write directly to public product data. It should draft/review SEO packs and mark QA warnings.

---

## 7. Supabase prompt to use when needed

Use this in the Supabase-connected chat when the GitHub chat requests a live DB summary:

```text
Ты работаешь как Supabase auditor для проекта FEYA Commerce / TheFEYA.
Нужно дать read-only reality report для GitHub-чата. Ничего не изменяй в базе.

Проверь и верни короткий структурированный отчёт:

1. Существуют ли эти views и сколько строк они возвращают:
- public.feya_commerce_v_step8_project_report
- public.feya_commerce_v_step8_review_queues_summary
- public.feya_commerce_v_step7_storefront_products_api
- public.feya_commerce_v_step8_frontend_api_contract
- public.feya_commerce_v_step6_product_catalog_overview
- public.feya_commerce_v_seo_keyword_ai_cleanup_report_v1

2. Верни первые 5 строк из:
- public.feya_commerce_v_step7_storefront_products_api
- public.feya_commerce_v_step8_review_queues_summary
- public.feya_commerce_v_seo_keyword_ai_cleanup_report_v1

3. Для storefront_products_api проверь:
- total rows
- rows with primary_image_url not null
- rows with product_slug not null
- rows with min_price or max_price not null
- rows with has_fallback_price = true
- rows with storefront_candidate_flag = true

4. Для seo keyword cleanup report проверь:
- total rows
- counts by cleanup_pipeline_status
- counts by validation_status
- counts by priority_tier
- rows where should_validate_api = true
- rows where should_hold = true

5. Проверь, есть ли явные признаки, что public anon может читать raw source tables:
- public.feya_commerce_source_listings
- public.feya_commerce_source_price_rows

Если это нельзя проверить без прав — так и напиши.
Никаких DROP/CREATE/UPDATE/DELETE. Только SELECT/инспекция.
```

---

## 8. Working decision

The next implementation should stay practical:

- finish and verify read-only Phase A;
- request Supabase reality only when it unlocks a concrete next step;
- avoid premature checkout/order/CRM;
- move toward SEO Content Engine through contracts, not a magic generator button.
