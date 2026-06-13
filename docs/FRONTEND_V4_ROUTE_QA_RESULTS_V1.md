# FEYA Commerce — Frontend v4 Route QA Results v1

Date: 2026-06-13

## Status

Supabase v4 has been created and validated:

```text
public.feya_commerce_v_step7_storefront_products_api_v4
```

Current GitHub head:

```text
d622ab89f136b9dd7cfef0732c60e2d56bbe4945
```

GitHub CI:

```text
Phase A CI = success
```

PR state:

```text
open / draft / mergeable
```

---

## Code-level route validation

### `/shop`

`/shop` queries storefront views in this order:

```text
v4 -> v3 -> v2 -> v1
```

Now that v4 exists, `/shop` should use v4 as the primary source.

### `/shop/[slug]`

PDP also queries storefront views in this order:

```text
v4 -> v3 -> v2 -> v1
```

Now that v4 exists, PDP should use v4 as the primary source.

### Adapter behavior

Frontend adapter already prioritizes:

```text
configurations[].public_label
configurations[].display_price_amount
configurations[].compare_at_price_amount
configurations[].discount_percent
configurations[].component_code
configurations[].is_full_set
```

Global frontend sale logic is disabled:

```text
SALE_PERCENT = 0
SALE_RATE = 0
```

---

## Buyer-facing label expectation

Supabase v4 validation reported:

```text
configuration_rows = 1066
configurations_with_cyrillic_public_label = 0
products_with_russian_public_label_flag = 0
```

Therefore storefront configuration labels should display English `public_label` values only.

---

## Known automated QA limitation

The Vercel deployment exists and CI is green, but automated route fetch may be blocked by protected preview access.

If automated fetch returns authentication/protection instead of HTML, treat that as preview access limitation, not as an application failure.

Manual browser QA is still required.

---

## Manual route checklist

Open the Vercel PR preview in browser and check:

```text
/
/shop
one real /shop/[slug]
/cart
/checkout
/account
/studio/orders
```

For `/shop` and PDP, check:

```text
no Cyrillic buyer-facing configuration labels
no fake -20% sale
prices display from v4 display_price_amount
configuration dropdown works
Full Set labels work
Bundle labels work where available
images load
cart add works
checkout draft page opens
payment remains disabled
```

---

## Known next code gap

PDP cart snapshot already stores v4 metadata:

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

But checkout draft API still needs a follow-up code fix so these fields are preserved in draft item rows instead of being partially downgraded to temporary values.

Do not activate payment while this gap remains.

---

## Next decision

If manual route QA is clean, next GitHub fix:

```text
Preserve v4 cart metadata in checkout draft items.
```

Do not start SEO/feed/export/payment work before that.
