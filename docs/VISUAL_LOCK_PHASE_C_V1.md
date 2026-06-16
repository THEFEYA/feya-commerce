# FEYA Commerce — Visual Lock Passport Phase C v1

Date: 2026-06-13
Branch: `rebuild/emergent-template-port-v2`

## Purpose

This document freezes the current approved visual direction so future engineering work does not accidentally destroy the luxury storefront look while adding data, cart, checkout, pricing, SEO, and admin logic.

The current visual direction is considered **approved as the baseline** unless the owner explicitly requests a visual change.

## Locked areas

### 1. Shop/catalog page

The `/shop` page visual direction is locked:

- dark editorial luxury background;
- fixed top header;
- connected category strip under the header;
- left filter rail;
- 4-column desktop product grid;
- product cards with large vertical fashion image;
- gold gradient price treatment;
- thin editorial product title typography;
- subtle hover border/glow;
- 20 products initially with load-more behavior;
- footer structure preserved.

Future changes may add filtering logic, sorting logic, pagination, SEO URLs, collections, or data corrections, but must not redesign the page from scratch.

### 2. Product card

Product card visual direction is locked:

- image-first card;
- vertical editorial image frame;
- dark gradient content area;
- title, category/context, color dots, price line, view link;
- no heavy buttons inside the card;
- hover should swap to the next/secondary image when available;
- if hover image is not available or not loaded, the primary image must remain visible and the card must never turn black.

### 3. PDP/product detail page

The PDP visual direction is locked:

- left vertical thumbnail rail;
- large vertical fashion frame for main image;
- compact right-side purchase block;
- configuration, color, size, quantity, Add to Bag, Buy It Now above the fold;
- shipping method moved out of PDP and into cart;
- delivery dates moved to cart;
- fullscreen/lightbox uses `object-fit: contain`;
- normal PDP image uses `object-fit: cover`.

Future product data work must preserve this layout.

### 4. Cart / checkout preview

Cart visual direction is locked as early checkout preview:

- compact luxury heading;
- cart items on the left;
- shipping method and dates on the right;
- contact/delivery details block;
- optional comment field;
- total summary;
- no real card input until a payment provider is selected and integrated securely.

## Engineering guardrails

- Do not query raw Supabase tables from frontend.
- Do not expose service role keys.
- Use only public safe views or server-side secured endpoints.
- Do not add fake card collection fields before real payment provider integration.
- Do not make public storefront pages slower for visual effects.
- Preserve fixed image aspect ratios to prevent layout shift.
- Product card hover must not require heavy libraries.
- Do not rewrite full files when a small targeted change is enough.

## Data guardrails

The current visual layer can use temporary labels, but final commerce data must be reconciled from canonical sources:

1. Etsy CSV export for English titles, tags, images, and variation names.
2. Browser collector JSON for variation prices.
3. Product DNA / component mapping for normalized product entities.
4. Supabase safe views for frontend serving.

Any Russian labels inside product configuration or titles are considered a data-quality issue, not an approved storefront state.

## Pricing guardrails

Before production checkout:

- verify whether collected Etsy prices are already discounted or original prices;
- avoid applying the 20% sale twice;
- keep both `source_price_original` and `source_price_sale` if possible;
- mark fallback visible prices as lower confidence;
- never overwrite canonical prices without an audit report.

## Next data audit

Required next audit:

- compare Etsy CSV listings with price collector JSON by listing title / canonical URL / listing ID where available;
- identify Russian translated option labels from the collector;
- map Russian labels back to English Etsy variation values where possible;
- compare full-set prices vs component sums;
- flag suspected double-discount rows;
- produce a clean import package for Supabase, not manual table edits.
