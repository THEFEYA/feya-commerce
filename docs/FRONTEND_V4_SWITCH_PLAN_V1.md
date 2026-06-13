# FEYA Commerce — Frontend v4 Switch Plan v1

Date: 2026-06-13  
Branch: `rebuild/emergent-template-port-v2`  
Status: implementation plan, no frontend code changes yet

## Purpose

This document defines how the existing storefront frontend should move from the current v1/v2/v3 safe views to the future v4 storefront data contract.

It follows:

- `docs/CONTROL_TOWER_ROADMAP_V1.md`;
- `docs/SUPABASE_V4_DIAGNOSTIC_EXECUTION_PLAN_V1.md`;
- `docs/SUPABASE_PRICE_CONFIG_CONTRACT_V4_SPEC.md`;
- `docs/VISUAL_LOCK_PHASE_C_V1.md`.

This file does not implement v4 yet. v4 does not exist until Supabase diagnostics and SQL are done.

---

## 1. Why this plan is needed

The current frontend works as a visual/data-wiring preview, but its data adapter logic is still transitional.

Current risks:

- `/shop` and PDP do not use exactly the same view fallback logic;
- public option labels are still partly sanitized in frontend;
- category/world labels are still regex-based in frontend;
- price display still relies on `min_price`, `max_price`, option price fallbacks and local calculations;
- cart/checkout save local snapshots from PDP values before v4 price/label confidence exists;
- payment must remain blocked until v4 data is safe.

The v4 switch must therefore be done as an adapter-layer change, not as a visual redesign.

---

## 2. Current frontend files involved

Primary files:

```text
lib/types.ts
lib/storefront.ts
app/shop/page.tsx
app/shop/[slug]/page.tsx
components/ProductCard.tsx
components/ProductDetailClient.tsx
components/SalePrice.tsx
components/CartClient.tsx
components/CheckoutClient.tsx
```

Do not touch visual layout first.

First change should be data contract support and adapter behavior.

---

## 3. Current data access issues

### 3.1 Shop page

Current `/shop` uses this sequence:

```text
v2 -> v3 -> v1
```

Observation:

- it tries `STOREFRONT_VIEW_V2` first;
- then v3;
- then v1;
- v2/v1 get extra fast media merge;
- v3 returns media directly.

Risk:

- v3 is the intended current rich contract in PR #5, but it is not first in shop query order.

### 3.2 Product detail page

Current PDP uses:

```text
v2 -> v1
```

Observation:

- PDP does not currently query `STOREFRONT_VIEW_V3` directly;
- it uses a fast media view to attach media.

Risk:

- shop cards and PDP can diverge in fields/configurations;
- v4 switch will be harder if each route has different fallback behavior.

### 3.3 Product card

Current card uses frontend helpers:

- `productTitle`;
- `worldLabel`;
- `colorOptions`;
- `mainRegularPrice`;
- `salePrice`.

Risk:

- category/context/color/price can be guessed in frontend instead of supplied by clean canonical v4 data.

### 3.4 PDP

Current PDP calculates:

- active configuration label;
- active option price;
- full-set savings;
- selected full set by label regex;
- total price from frontend-selected option;
- cart snapshot from local PDP data.

Risk:

- full-set savings should come from v4 only when valid;
- frontend regex should not decide final bundle logic;
- cart should not store unverified labels/prices once payment becomes real.

### 3.5 Cart and checkout draft

Current cart and checkout use localStorage item values:

```text
title
config
size
color
qty
price
currency
```

Risk:

- this is acceptable for preview;
- it is not enough for payment activation;
- order draft items need v4 contract fields and confidence statuses.

---

## 4. Required v4 frontend fields

`StorefrontProduct` should support these v4 fields when v4 exists:

```text
price_contract_version
price_source_mode
price_confidence_status
has_unverified_discount
has_russian_public_label
needs_price_review
needs_label_review
full_set_display_price_amount
component_sum_display_price_amount
full_set_savings_amount
full_set_savings_percent
```

`StorefrontConfiguration` should support:

```text
public_label
component_code
component_family
is_full_set
is_bundle
bundle_component_codes
base_price_amount
sale_price_amount
compare_at_price_amount
display_price_amount
discount_percent
price_source_mode
price_confidence_status
has_fallback_price
has_russian_raw_label
needs_label_review
```

Cart/order item snapshots should eventually include:

```text
price_contract_version
price_confidence_status
label_confidence_status
component_code
component_family
is_full_set
is_bundle
configuration_id
configuration_label
public_label
unit_price_amount
compare_at_price_amount
currency
```

---

## 5. Adapter strategy

Do not rewrite every component directly against v4.

Create/extend adapter helpers in `lib/storefront.ts` so UI components keep stable calls.

Recommended helper behavior after v4:

### `optionLabel(option, index)`

Priority:

```text
option.public_label
-> option.configuration_label
-> option.configuration_name
-> Option N
```

Rule:

- never expose raw Cyrillic values;
- if raw label exists but public label is missing, show `Option N` and mark review in data/admin.

### `optionPrice(option)`

Priority:

```text
option.display_price_amount
-> option.sale_price_amount
-> option.base_price_amount
-> legacy option.price_amount / price / amount
```

Rule:

- after v4, display price must come from v4;
- frontend should not apply global discount.

### `compareAtPrice(option)`

Use only:

```text
option.compare_at_price_amount
```

Rule:

- do not invent compare-at price;
- hide strike-through when compare_at is null or <= display price.

### `isFullSetOption(option)`

Priority:

```text
option.is_full_set === true
-> legacy label regex fallback
```

Rule:

- v4 data should decide full-set/bundle status;
- regex remains only emergency fallback.

### `componentCode(option)`

Use:

```text
option.component_code
```

Rule:

- needed for cart/order/admin/complete-the-look later.

---

## 6. Future query order

After v4 is created and tested:

### Shop page

Recommended order:

```text
v4 -> v3 -> v2 -> v1
```

### PDP

Recommended order:

```text
v4 -> v3 -> v2 -> v1
```

Important:

- Shop and PDP should share the same data selection strategy as much as possible;
- PDP must not remain v2/v1-only after v4 exists;
- media behavior from v3/fast media view must be preserved.

---

## 7. No-visual-change rule

The v4 frontend switch must not redesign:

- header;
- shop filters;
- product cards;
- 4-column grid;
- PDP gallery;
- PDP buy box;
- cart layout;
- checkout draft visual style.

Allowed changes:

- data source constants;
- type fields;
- adapter helper priority;
- hidden warnings for unsafe data;
- safe fallback text;
- test/debug logs only if not visible to customers.

---

## 8. Payment and checkout gate

Do not activate real payment after v4 switch unless these are true:

- selected cart item has v4 `display_price_amount`;
- `needs_price_review = false`;
- `needs_label_review = false`;
- selected configuration has `public_label`;
- selected configuration has `price_confidence_status = approved` or other approved launch-safe status;
- order draft stores v4 confidence fields;
- payment provider webhook verification is implemented.

Until then:

- checkout draft may exist;
- payment remains intentionally inactive;
- no paid order can be created.

---

## 9. Test checklist after v4 switch

Routes to test:

```text
/
/shop
/shop/[slug]
/cart
/checkout
/account
/studio/orders
```

Required checks:

- shop loads products;
- PDP loads the same product as card;
- options show English public labels;
- no Cyrillic visible on public storefront;
- prices match v4 display prices;
- compare-at price appears only when approved;
- full-set savings appears only when v4 provides valid savings;
- cart item uses selected v4 configuration;
- checkout draft carries v4 confidence fields;
- payment remains blocked;
- visual layout remains unchanged.

---

## 10. Current blockers

Do not implement this switch yet because:

- Supabase v4 view does not exist yet;
- diagnostics have not confirmed source coverage;
- price reconciliation is not complete;
- component mapping is not approved;
- media readiness is not fully verified;
- Vercel preview after the latest docs commits still needs re-check when tooling allows.

---

## 11. Next action

Next correct work block remains:

```text
Run Supabase v4 diagnostics in a Supabase-connected context.
```

After diagnostics return:

1. create/update `docs/SUPABASE_V4_DIAGNOSTIC_RESULTS_V1.md`;
2. create v4 SQL only if diagnostics are clear;
3. then implement this frontend switch plan.
