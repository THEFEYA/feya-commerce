# FEYA Commerce — Current Start Here

Date: 2026-06-13  
Status: current entrypoint for the active PR branch  
Repository: `THEFEYA/feya-commerce`  
Branch: `rebuild/emergent-template-port-v2`

## Read first

The current execution source of truth is:

```text
docs/CONTROL_TOWER_ROADMAP_V1.md
```

Use that file before deciding what to build next.

The older file below is historical and no longer fully current:

```text
docs/00_START_HERE.md
```

It still contains old read-only Phase A wording.

---

## Current implementation state

Current state:

```text
Phase 0 / Phase 1 boundary — visual baseline exists, v4 data foundation is next
```

The project is no longer only a read-only Supabase preview.

Current branch includes:

- recovered luxury/dark editorial storefront baseline;
- public routes `/`, `/shop`, `/shop/[slug]`, `/cart`, `/checkout`, `/account`, `/studio/orders`;
- cart and checkout draft foundation;
- account/order preview foundations;
- v4-ready storefront adapter work;
- CI-passing PR branch;
- payment intentionally inactive.

Correct current sequence:

```text
preserve visual baseline
→ fix/verify data foundation v4
→ validate frontend against v4
→ then continue SEO/product graph/admin/payment layers
```

---

## Current control docs

```text
docs/CONTROL_TOWER_ROADMAP_V1.md
docs/SUPABASE_V4_DIAGNOSTIC_EXECUTION_PLAN_V1.md
docs/SUPABASE_V4_DIAGNOSTIC_PROMPT_V1.md
docs/FRONTEND_V4_SWITCH_PLAN_V1.md
docs/FRONTEND_V4_SWITCH_IMPLEMENTATION_LOG_V1.md
docs/FRONTEND_V4_BUILD_QA_STATUS_V1.md
```

---

## Current storefront data strategy

Existing safe views remain supported:

```text
public.feya_commerce_v_step7_storefront_products_api
public.feya_commerce_v_step7_storefront_products_api_v2
public.feya_commerce_v_step7_storefront_products_api_v3
```

Future target contract:

```text
public.feya_commerce_v_step7_storefront_products_api_v4
```

Current frontend fallback order:

```text
v4 -> v3 -> v2 -> v1
```

If v4 does not exist yet, the frontend falls back to v3/v2/v1.

---

## Safe Supabase rules

Do not expose raw source tables publicly:

```text
feya_commerce_source_listings
feya_commerce_source_price_rows
```

Do not show sampler/probnik publicly.

Do not treat fallback price rows as approved launch pricing.

Do not let the frontend invent discount math.

Do not switch payment on until v4 labels/prices/configurations are safe.

---

## Brand positioning rule

TheFEYA sells original handmade designs.

Public storefront should emphasize:

- handmade TheFEYA designs;
- made to order for existing designs;
- adjustable/custom sizing;
- selected color/detail adjustments.

Do not position the brand as a full custom atelier that makes any design from scratch.

---

## Emergent rule

Emergent is no longer an active working tool.

The old Emergent visual export is historical context and approved visual baseline only.

Future work happens inside this repository.

---

## Next correct block

Next data-layer block:

```text
Run Supabase v4 diagnostics in a Supabase-connected context.
```

Use:

```text
docs/SUPABASE_V4_DIAGNOSTIC_PROMPT_V1.md
```

Then record results in:

```text
docs/SUPABASE_V4_DIAGNOSTIC_RESULTS_V1.md
```
