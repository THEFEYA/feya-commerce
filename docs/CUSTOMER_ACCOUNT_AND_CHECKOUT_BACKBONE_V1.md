# FEYA Commerce — Customer Account & Checkout Backbone v1

Date: 2026-06-13
Status: Product/architecture spec
Depends on:
- `docs/VISUAL_LOCK_PHASE_C_V1.md`
- `docs/SUPABASE_PRICE_CONFIG_CONTRACT_V4_SPEC.md`
- `docs/DATA_AUDIT_PRICE_DNA_V1.md`

## Purpose

Define the next under-the-hood functionality for FEYA Commerce without breaking the approved storefront visual.

This layer covers:

- customer account / personal cabinet;
- checkout flow;
- order record model;
- measurements and customization notes;
- shipping/delivery choice;
- payment-provider readiness;
- admin review requirements.

## Visual rule

The approved Shop, PDP, Product Card, and Cart visuals are locked. New account/checkout functionality must be added as matching dark luxury FEYA UI, not as generic 2000s ecommerce forms.

## Customer account modules

### 1. Authentication

Required customer login options:

- email + password or magic link;
- Google login optional later;
- guest checkout allowed at first;
- account creation after purchase should be optional.

### 2. Profile

Customer profile fields:

```text
customer_id
email
full_name
phone
country
city
address_line_1
address_line_2
postal_code
preferred_language
created_at
updated_at
```

### 3. Address book

Customers can save multiple addresses:

```text
address_id
customer_id
label
full_name
phone
country
city
address_line_1
address_line_2
postal_code
is_default
```

### 4. Measurements profile

Important for TheFEYA custom garments.

Fields:

```text
measurement_profile_id
customer_id
label
height_cm
bust_cm
underbust_cm
waist_cm
hips_cm
shoulder_width_cm
arm_length_cm
thigh_cm
notes
created_at
updated_at
```

Rules:

- customer can attach measurements to an order;
- measurements are optional for standard-size products;
- custom-size products should request measurements before production;
- do not force measurements before Add to Bag.

### 5. Wishlist / saved looks

Customer can save:

- products;
- selected configuration;
- color;
- size;
- event date;
- styling note.

This can later support abandoned cart and retargeting.

### 6. Order history

Customer account should show:

```text
order_number
order_status
payment_status
production_status
shipping_status
tracking_number
ordered_at
estimated_ready_date
estimated_delivery_date
items
shipping_method
total_amount
currency
```

Customer-facing order statuses:

```text
Placed
Payment received
In production
Ready to ship
Shipped
Delivered
Cancelled
Return requested
```

Internal statuses can be more detailed, but customer UI should stay simple.

### 7. Messages and notes

Customer can add optional order notes:

- event date;
- sizing notes;
- custom request;
- delivery deadline;
- stylist notes.

These notes should be visible in admin order review before production.

## Checkout flow

### Step 1 — Bag

Already started.

Bag contains:

- product image;
- title;
- selected configuration;
- selected color;
- selected size;
- quantity;
- item price;
- remove/update quantity.

### Step 2 — Shipping method

Move shipping choice to cart/checkout, not PDP.

Options:

```text
Standard UPS
Express DHL
```

Delivery dates should be calculated in checkout, not hardcoded long-term.

### Step 3 — Contact and address

Fields:

```text
email
full_name
phone
country
city
address_line_1
address_line_2
postal_code
```

### Step 4 — Optional notes

Field:

```text
customer_note
```

Not required.

### Step 5 — Payment

Do not collect card data directly in our frontend.

Use a secure payment provider.

Candidate providers:

- Stripe Checkout / Payment Links / Elements;
- PayPal Checkout;
- Payoneer Checkout only if available for the user’s merchant/account region and DTC store use case.

Until provider is chosen:

- keep payment button as preview / disabled or route to placeholder;
- no card number field;
- no fake successful order.

## Order data model draft

### commerce_orders

```text
order_id
order_number
customer_id nullable for guest
email
full_name
phone
country
city
address_line_1
address_line_2
postal_code
customer_note
shipping_method
shipping_price_amount
subtotal_amount
total_amount
currency
payment_provider
payment_status
order_status
production_status
shipping_status
estimated_ready_date
estimated_delivery_date
created_at
updated_at
```

### commerce_order_items

```text
order_item_id
order_id
product_slug
canonical_product_id
matched_etsy_listing_id
product_title
configuration_id
configuration_label
component_code
is_full_set
color
size
quantity
unit_price_amount
line_total_amount
currency
image_url
raw_snapshot_json
```

### commerce_payments

```text
payment_id
order_id
payment_provider
provider_session_id
provider_payment_id
amount
currency
status
raw_provider_payload
created_at
updated_at
```

## Admin / internal cabinet requirements

Admin cabinet should eventually show:

- new orders;
- paid/unpaid orders;
- order item configuration;
- customer notes;
- measurements;
- production status;
- shipping status;
- price confidence warnings;
- missing label/price warnings;
- source listing and Etsy ID trace;
- export/payment history.

## Critical warnings

- Do not turn cart preview into real checkout without payment provider.
- Do not store card data.
- Do not let unreviewed fallback prices become paid orders.
- Do not allow Russian/internal labels in order item customer-facing snapshots.
- Do not calculate discount in frontend after v4 contract is built.

## Implementation order

1. Finish price/config v4 contract in Supabase.
2. Switch frontend to v4 labels/prices.
3. Create lightweight guest checkout/order draft schema.
4. Connect Add to Bag → Checkout Draft.
5. Choose payment provider.
6. Implement provider checkout session.
7. Store successful payment as order.
8. Add customer account/order history.
9. Add admin order review.
10. Add measurements/custom production workflow.

## Acceptance criteria

The account/checkout layer is accepted only if:

- customer can understand checkout without extra explanation;
- no card data is stored by FEYA frontend;
- order item snapshot has English labels and correct prices;
- shipping choice is in cart/checkout;
- admin can see exactly what was ordered;
- production notes and measurements are preserved;
- visual style matches the approved luxury storefront;
- data source and price confidence are traceable.
