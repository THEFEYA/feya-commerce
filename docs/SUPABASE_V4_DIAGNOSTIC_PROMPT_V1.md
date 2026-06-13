# FEYA Commerce — Supabase v4 Diagnostic Prompt v1

Date: 2026-06-13  
Branch: `rebuild/emergent-template-port-v2`  
Status: prompt for Supabase-connected execution context

## Purpose

Use this prompt in a Supabase-connected context when it is time to run diagnostics before building the v4 storefront data contract.

Do not use this prompt blindly if a newer Control Tower file exists.

---

## Copy-paste prompt

```text
Ты продолжаешь проект FEYA Commerce.

Язык ответа: русский.
SQL/код показывай только когда мне нужно скопировать и вставить.
Не делай ручные правки строк.
Не удаляй и не перезаписывай source data.
Все изменения только add-only, если отдельно не согласовано обратное.

Главная цель этого шага:
Подготовить Supabase diagnostics для перехода storefront data contract с v3 на v4.

Перед любым SQL сначала проверь схему и фактические объекты.
Не предполагай, что таблицы/вьюхи существуют только потому, что они есть в документах.

Сначала прочитай/учти эти файлы из GitHub, если доступны:

- docs/CONTROL_TOWER_ROADMAP_V1.md
- docs/DATA_AUDIT_PRICE_DNA_V1.md
- docs/SUPABASE_PRICE_CONFIG_CONTRACT_V4_SPEC.md
- docs/SUPABASE_V4_DIAGNOSTIC_EXECUTION_PLAN_V1.md
- docs/VISUAL_LOCK_PHASE_C_V1.md

Текущая стратегическая логика:

1. Visual storefront уже есть и его нельзя ломать.
2. Emergent больше не активный инструмент.
3. TheFEYA не full custom atelier from scratch; бренд продаёт свои handmade designs, допускает sizing/color/detail adjustments.
4. Checkout/payment не расширяем, пока v4 labels/prices/components не безопасны.
5. v4 должен исправить Russian/internal labels, fallback prices, discount risk, component mapping и bundle/full-set logic.

Нужный target contract:

public.feya_commerce_v_step7_storefront_products_api_v4

v1/v2/v3 нельзя удалять до полного теста v4.

Твоя задача сейчас:

Phase 1.1 — Supabase v4 diagnostics.

Сделай работу в таком порядке:

A. Schema discovery

Проверь фактическое наличие объектов, связанных с:

- source listings
- source price rows
- product drafts
- option/configuration mappings
- sellable configurations
- configuration prices
- content drafts
- media drafts/gallery
- v3 storefront products API
- review queues

Выведи кратко:

- объект найден / не найден;
- тип объекта: table/view/materialized view/function;
- ключевые поля;
- примерное количество строк;
- риск, если объект отсутствует.

B. Source coverage diagnostic

Нужно получить:

- total source listings;
- total source price rows;
- total product drafts;
- total storefront-ready products in v3;
- storefront-excluded products;
- products without prices;
- products without media;
- unmapped source listings;
- unmapped collector/price rows;
- duplicated source listing IDs;
- duplicated product slugs;
- sampler/probnik rows and whether they are excluded.

C. Russian/internal label diagnostic

Проверь customer-facing candidate fields for Cyrillic/internal values:

- titles;
- card titles;
- H1;
- SEO titles;
- option axis labels;
- option values;
- configuration labels;
- public candidate labels;
- product type;
- material;
- color;
- current order draft item snapshots, if any exist.

Вывод должен включать:

source_listing_id, product_slug, field_name, raw_value, suggested_public_label, source_layer, has_cyrillic, has_safe_english_alternative, needs_manual_review, severity.

D. Price reconciliation diagnostic

Проверь:

- collector prices vs current v3 min/max;
- fallback visible price rows;
- suspected already-discounted prices;
- full-set prices that look too low;
- missing option prices;
- sampler/probnik price contamination;
- products where display price should be blocked.

Вывод должен включать:

source_listing_id, product_slug, configuration_id, raw_option_label, public_label, component_code, collector_price_amount, collector_currency, current_v3_min_price, current_v3_max_price, suspected_price_source_mode, suspected_discount_status, has_fallback_price, needs_price_review, severity.

E. Component and bundle mapping diagnostic

Проверь raw option values and map them toward canonical component codes.

Examples:

- Fringe Skirt / Open Skirt / Leather Skirt / Юбка -> skirt
- Top / Bra / Bustier / Топ -> top
- Shoulder / Shoulders / Плечи -> shoulders
- Choker / Collar / Воротник -> choker
- Mask / Маска -> mask
- Full Set / Complete Set / Полный комплект -> full_set, is_full_set = true

Important:
Full Set is bundle/kit option, not product type.

Вывод должен включать:

source_listing_id, product_slug, raw_option_value, normalized_public_label, component_code, component_family, is_full_set, is_bundle, bundle_component_codes, confidence, needs_manual_review, severity.

F. Media readiness diagnostic

Проверь:

- primary image exists;
- media gallery exists;
- secondary/hover image exists where possible;
- primary alt text exists;
- products with missing/weak media.

G. Result format

После диагностики выдай:

1. Что найдено.
2. Что сломано/сомнительно.
3. Какие продукты/строки блокируют v4.
4. Какие mapping tables/import CSVs нужны.
5. Можно ли уже создавать v4 view.
6. Если можно — подготовь add-only SQL.
7. Если нельзя — скажи, какие данные сначала нужно экспортировать/исправить.

Важно:
Не создавай v4 view, пока diagnostics не показали, что понятно, откуда брать labels/prices/components.
Не переключай frontend.
Не трогай визуал.
Не открывай raw tables публично.
```

---

## Expected output from Supabase-connected run

After running the prompt in a Supabase-connected context, bring back:

1. Schema discovery summary.
2. Coverage numbers.
3. Russian/internal label issues.
4. Price reconciliation issues.
5. Component mapping issues.
6. Media readiness issues.
7. Whether v4 SQL can be written immediately.
8. Any blockers.

Then update:

- `docs/SUPABASE_V4_DIAGNOSTIC_RESULTS_V1.md` if results are available;
- `docs/CONTROL_TOWER_ROADMAP_V1.md` if roadmap decisions change.
