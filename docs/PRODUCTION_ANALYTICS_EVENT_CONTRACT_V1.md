# FEYA Production Analytics Event Contract v1

Status: contract defined; collection not activated
Owners: GDAE (implementation), GMEL (measurement semantics)
Architecture: FEYA Growth OS v1.0 CANONICAL

## 1. Current reality

The current feya-commerce application has no production GA4, GSC or BigQuery integration in code.

There is no real checkout/order completion system yet.

Existing feya_commerce_order_drafts are draft-commerce records and must not be treated as authoritative completed orders.

Therefore:

CPIM production intelligence = not active.
GMEL production measurement = not active.

This document defines the future contract without pretending data already exists.

## 2. Canonical product identity

GA4 ecommerce item_id:

canonical_product_id

Never use:
- mutable product title;
- product slug as primary identity;
- Etsy listing ID as current site product identity.

Optional item fields may include:
- item_name = current card/public title
- item_brand = TheFEYA
- item_category = normalized product type
- item_variant = real customer-facing configuration identity when defined

## 3. Environment separation

All analytics events must identify environment:

production
preview
development

Only production enters canonical Growth OS behavior marts.

Preview/test purchases must never contaminate production metrics.

## 4. Required ecommerce events

Target event contract:

### view_item_list

Trigger:
User is shown a real product list/grid.

Required FEYA context:
- item_list_id
- item_list_name
- items[].item_id = canonical_product_id

Do not generate fake list views server-side when the user did not receive the list.

### select_item

Trigger:
User selects a product from a list.

Required:
- source item_list_id
- canonical item_id
- list position where available

### view_item

Trigger:
Product detail becomes a real user-visible product view.

Required:
- canonical item_id
- displayed price/currency when approved
- customer-facing configuration context where applicable

### add_to_cart

DEFER until a real cart exists.

Do not emit from decorative/nonfunctional buttons.

### begin_checkout

DEFER until a real checkout exists.

### purchase

DEFER until a real completed-order authority exists.

transaction_id must map to authoritative commerce order identity.

Do not fire purchase from a confirmation-looking UI without a real successful order/payment workflow.

### refund

DEFER until authoritative refund state exists.

Must reference transaction_id and item-level data where available.

## 5. Commerce authority

Future Commerce DB is authoritative for:
- completed order
- item quantity
- order line revenue
- discounts
- refunds
- order state

GA4 is behavioral/channel context.

If GA4 purchase differs from Commerce DB:
- create data-quality/reconciliation issue;
- do not silently replace Commerce truth with GA4.

## 6. Event versioning

Each FEYA event payload should carry or be traceable to:

analytics_contract_version = feya_analytics_v1

Material contract changes require a new version.

## 7. Measurement surface

Growth OS metrics must identify their surface:

RAW_OBSERVED
GA4_REPORTED
COMMERCE_TRUTH
MODELED_OR_AGGREGATED

These values are not interchangeable.

## 8. Consent / privacy gate

Analytics collection must not be activated before a consent implementation appropriate for the site's markets is selected and tested.

The analytics layer must preserve enough consent/measurement context for later interpretation of observable coverage.

Growth OS must never assume:
GA4 events = 100% of all user behavior.

## 9. GA4 BigQuery target

When a production GA4 property exists:

Preferred analytical source:
GA4 -> BigQuery raw event export.

Canonical stable daily source:
events_YYYYMMDD

Intraday:
events_intraday_YYYYMMDD

Intraday data is provisional and must not be treated as complete daily history.

No BigQuery warehouse is required before the storefront foundation is ready.

## 10. Search Console target

After zofeya.com production verification:

Enable Search Console Bulk Export to BigQuery.

Use for:
- clicks
- impressions
- CTR
- average position
- page
- query where available
- country
- device

Known limitation:
anonymized query text is not available. Bulk table rows marked
is_anonymized_query remain useful for aggregate coverage; accept null or empty
query text without inventing a keyword. The official table schema describes both
representations: https://support.google.com/webmasters/answer/12917991?hl=en.

Therefore absence of a query row is not proof that no such searches occurred.

## 11. Data marts to build only after sources exist

search_performance_daily:
- date
- seo_page_id
- query_cluster_id where mapped
- market/country
- device
- clicks
- impressions
- CTR
- position
- completeness/source state

product_performance_daily:
- date
- canonical_product_id
- market
- list exposure
- item selection
- product views
- add-to-cart
- checkout
- purchased units
- orders
- net item revenue
- refunds
- offer/content/media version
- measurement surface

page_performance_daily:
- date
- seo_page_id
- sessions/traffic context
- organic exposure
- product discovery
- downstream outcome
- content/technical version

Do not create empty fake marts before their sources are active.

## 12. Reconciliation

Once purchase tracking exists:

GA4 purchase events must be reconciled against Commerce DB using transaction_id.

Checks:
- missing transaction
- duplicate transaction
- currency mismatch
- revenue mismatch
- item_id mismatch
- quantity mismatch
- refund mismatch

Material mismatch:
DATA_QUALITY_INCIDENT.

## 13. Stable item/configuration relationship

Product:
canonical_product_id

Customer-facing configuration:
sellable_configuration_id or future canonical configuration identity.

Internal components must not be sent as customer-facing item_variant unless they are truly the selected purchase configuration.

## 14. Current activation gates

GA4 instrumentation cannot be marked ACTIVE until:

- production GA4 property exists;
- production web stream exists;
- measurement ID stored in deployment environment;
- consent behavior decided/tested;
- environment isolation tested;
- view_item_list/select_item/view_item validated in DebugView or equivalent;
- item_id mapping confirmed;
- preview/test traffic separated.

Purchase funnel activation additionally requires:
- real cart;
- real checkout;
- authoritative order table;
- transaction ID contract;
- payment success semantics;
- refund semantics.

GSC/Bulk Export activation requires:
- production domain live;
- Search Console ownership verified;
- BigQuery project/dataset configured;
- export health verified.

## 15. Current status

GA4_COLLECTION = NOT_IMPLEMENTED
GA4_BIGQUERY_EXPORT = NOT_CONFIGURED
GSC_PROPERTY = NOT_CONFIRMED
GSC_BULK_EXPORT = NOT_CONFIGURED
COMMERCE_ORDER_TRUTH = NOT_IMPLEMENTED
PURCHASE_EVENT = NOT_ALLOWED
REFUND_EVENT = NOT_ALLOWED

This is an honest readiness state, not a defect in the current catalog-first phase.
