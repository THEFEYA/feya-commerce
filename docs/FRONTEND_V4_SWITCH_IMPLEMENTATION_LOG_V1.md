# FEYA Commerce — Frontend v4 Switch Implementation Log v1

Date: 2026-06-13  
Branch: `rebuild/emergent-template-port-v2`  
Status: partial implementation, backward-compatible with v1/v2/v3

## Purpose

This log records frontend changes made after `docs/FRONTEND_V4_SWITCH_PLAN_V1.md`.

The goal was to stop waiting for Supabase v4 where possible and prepare the frontend so it can safely consume v4 once the Supabase view exists.

No visual redesign was performed.

---

## 1. Implemented changes

### 1.1 v4 type support

Updated:

```text
lib/types.ts
```

Added optional v4 fields to:

- `StorefrontProduct`;
- `StorefrontConfiguration`.

These fields are optional so the storefront can keep working with existing v1/v2/v3 views.

### 1.2 v4 storefront constants and selects

Updated:

```text
lib/storefront.ts
```

Added:

```text
STOREFRONT_VIEW_V4
STOREFRONT_V4_CARD_SELECT
STOREFRONT_V4_PDP_SELECT
```

The existing v3/v2/v1 constants were kept.

### 1.3 v4-aware adapter helpers

Updated:

```text
lib/storefront.ts
```

Changed helper priority:

```text
optionLabel:
public_label -> configuration_label -> configuration_name -> option_value -> title -> label -> Option N
```

```text
optionPrice:
display_price_amount -> sale_price_amount -> base_price_amount -> legacy price fields
```

Added helpers:

```text
optionCompareAtPrice
optionDiscountPercent
componentCode
isFullSetOption
mainCompareAtPrice
```

The frontend now prefers v4 public/price fields when available, while keeping legacy fallbacks.

### 1.4 Shop query order aligned with v4 plan

Updated:

```text
app/shop/page.tsx
```

New order:

```text
v4 -> v3 -> v2 -> v1
```

If v4 does not exist yet, Supabase returns an error and the code falls back to v3/v2/v1.

### 1.5 PDP query order aligned with v4 plan

Updated:

```text
app/shop/[slug]/page.tsx
```

New order:

```text
v4 -> v3 -> v2 -> v1
```

PDP now tries v3 directly before v2/v1, so shop and PDP are closer to the same data source strategy.

### 1.6 Compare-at price support

Updated:

```text
components/SalePrice.tsx
components/ProductCard.tsx
components/ProductDetailClient.tsx
```

Behavior:

- no fake global sale is applied;
- compare-at price only appears when v4/adapter provides a higher compare-at value;
- sale percentage is derived from compare-at vs display price when explicit percent is not provided;
- if no compare-at exists, the UI shows a single normal price.

### 1.7 PDP cart snapshot enriched

Updated:

```text
components/ProductDetailClient.tsx
```

Cart item snapshot now carries future v4 metadata when available:

```text
price_contract_version
price_confidence_status
label_confidence_status
component_code
component_family
is_full_set
is_bundle
configuration_id
public_label
unit_price_amount
compare_at_price_amount
```

This does not activate payment. It only prepares the draft/cart layer for future safe order creation.

---

## 2. What was intentionally not done

Not implemented yet:

- real payment;
- paid order creation;
- Supabase v4 SQL;
- admin approval queue;
- customer account activation;
- visual redesign;
- SEO collection page generation.

Reason:

Supabase v4 diagnostics and SQL still need to be executed in a Supabase-connected context.

---

## 3. Risk notes

The frontend now attempts v4 first.

Expected behavior before v4 exists:

```text
v4 query fails -> v3/v2/v1 fallback continues
```

This should be safe, but preview/deployment must still be checked after Vercel build completes.

Vercel deployment listing was blocked by tooling during this session, so deployment status is not confirmed here.

---

## 4. Next required validation

When preview is available, test:

```text
/
/shop
/shop/[slug]
/cart
/checkout
```

Required checks:

- shop still loads products;
- PDP opens real products;
- no public Cyrillic labels are visible;
- price displays normally without fake sale;
- cart still accepts selected configuration;
- checkout draft still works as draft-only;
- no payment activation appears.

---

## 5. Next correct work block

Run Supabase v4 diagnostics using:

```text
docs/SUPABASE_V4_DIAGNOSTIC_PROMPT_V1.md
```

Then create:

```text
docs/SUPABASE_V4_DIAGNOSTIC_RESULTS_V1.md
```

Only after that should v4 SQL be created.
