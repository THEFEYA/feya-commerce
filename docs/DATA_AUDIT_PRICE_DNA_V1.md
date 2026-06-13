# FEYA Commerce — Price & DNA Audit v1

Date: 2026-06-13
Scope: TheFEYA import, Etsy CSV export, browser price collector JSON, DNA passports.

## 1. Current finding

The browser collector data is useful for prices, but it was collected from Etsy pages rendered in a translated/Russian browser context.

Evidence from `feya_etsy_price_collection_master_v0_18_final`:

- unique collector listings: 330
- price rows: 1193
- high-confidence rows: 1115
- fallback visible price rows: 78

Local inspection of the uploaded collector file showed:

- 1176 / 1193 price rows have Cyrillic/Russian listing titles;
- 1180 / 1193 price rows have Russian option axis labels;
- 1180 / 1193 price rows have Russian option names;
- 325 / 330 listings in the collector index have Russian titles.

This means Russian storefront labels are **not approved product copy**. They are a collector-language artifact and must not become the final public product configuration language.

## 2. Etsy CSV vs collector roles

The uploaded Etsy CSV export is the best current source for:

- English product titles;
- English variation names and variation values;
- images;
- tags/materials/description basis.

The browser collector JSON is the best current source for:

- option-level prices;
- visible Etsy price at collection time;
- pricing rows by listing.

Important: Etsy CSV does not contain individual variation prices, so the collector is still needed for price detail.

## 3. Pricing risk

The collector saw Etsy pages with promotion active (`pro=1` in URLs and visible sale prices). The frontend currently also applies a 20% sale display formula.

Risk:

- if collector `price_amount` is already discounted, applying another 20% creates an accidental double-discount;
- this can explain why some site prices look too low compared with Etsy.

Rule before production:

- split price fields into `source_price_collected_visible`, `source_price_original_estimated`, `source_discount_pct`, and `display_sale_price`;
- do not blindly apply 20% to every collector price;
- mark rows with `variant_price_source = visible_price` as lower confidence;
- only publish prices after a reconciliation report.

## 4. DNA / component normalization

The product system must not rely only on raw Etsy option text. Raw values such as `Fringe Skirt`, `Open Skirt`, `Leather Skirt`, or `Feathers Skirt` should normalize to a component/entity like `skirt`.

Required layers:

1. raw option label from Etsy/collector;
2. normalized customer option label;
3. internal component code;
4. part family / DNA axis;
5. bundle/full-set logic.

Example:

- `Fringe Skirt` → component_code `skirt`
- `Open Skirt` → component_code `skirt`
- `Leather Skirt` → component_code `skirt`
- `Arm Armor` → component family `arms`, with possible components: shoulder, bicep, bracelet, glove

This follows the existing DNA passport logic where listing identity is defined by fixed axes such as part, material, color, context, persona, and gender.

## 5. Required Supabase-side audit

The next Supabase diagnostic should produce these outputs:

### A. Source coverage

- count product drafts;
- count storefront-ready products;
- count collector listings;
- count Etsy CSV listings;
- list unmatched collector listing IDs;
- list unmatched Etsy CSV rows.

### B. Russian label audit

- rows where public title/configuration/option contains Cyrillic;
- source column that introduced Cyrillic;
- whether English CSV alternative exists.

### C. Price reconciliation audit

Per listing/option:

- listing_id;
- product_slug;
- English CSV title;
- collector title;
- collector option axis;
- collector option name;
- normalized option name;
- collector price_amount;
- frontend currently displayed regular price;
- frontend currently displayed sale price;
- suspected discount status: `already_discounted`, `needs_original`, `fallback`, `unknown`.

### D. Component map audit

- raw option value;
- normalized option label;
- component_code;
- component_family;
- is_full_set;
- bundle components;
- confidence;
- needs_manual_review.

## 6. Visual lock dependency

No price/DNA fix should redesign the current approved storefront visual. Data corrections must feed the existing components, not rebuild them.

See: `docs/VISUAL_LOCK_PHASE_C_V1.md`.

## 7. Next action

Do not manually edit individual Supabase rows.

Next safe path:

1. Run diagnostics in Supabase and export audit CSVs.
2. Generate a clean mapping CSV for Russian → English option labels.
3. Generate a clean component mapping CSV.
4. Generate a price reconciliation CSV.
5. Import approved clean data into a new versioned safe layer.
6. Point frontend to the corrected safe view.
