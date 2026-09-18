# FEYA Keyword Demand Snapshot Contract v1

Status: validated against existing Supabase snapshot layer; additive provenance migration applied
Owner domain: GDAE
Consumers: OSPM, future Growth Director
Source: Google Ads API Keyword Planning historical metrics

## 1. Purpose

Persist external keyword-demand observations as versioned snapshots without mixing them with semantic keyword cleanup or SEO conclusions.

The snapshot layer answers:

- what keyword/query-cluster demand did Google Ads API report;
- for what market/language/network;
- when was it requested;
- what historical months were returned;
- which request batch produced the snapshot;
- what API/source version produced the values.

It does NOT answer:

- organic ranking difficulty;
- Zofeya organic position;
- conversion;
- business value;
- whether a keyword should be used on a product page.

Those conclusions belong to OSPM/CPIM/GMEL.

## 2. Logical entity

Existing physical table confirmed:

feya_commerce_seo_keyword_metric_snapshots_v1

Existing downstream pipeline confirmed:
- metric validation queue;
- score preview;
- recommendation layer;
- system status views.

No replacement table should be created.

## 3. Required identity fields

- snapshot_id — stable UUID
- request_batch_id — link to existing metric request batch
- request_batch_keyword_id — optional link to exact batch keyword row
- keyword_id — existing semantic keyword identity where available
- query_cluster_id — nullable until query cluster registry exists
- keyword_text — exact keyword submitted to API
- keyword_norm — normalized keyword if available

Do not use keyword text alone as immutable identity.

## 4. Targeting context

- market_code
- geo_target_constants
- language_constant
- language_code where derivable
- keyword_plan_network
- customer_id_hash_or_ref if needed for provenance

Never expose OAuth secrets or account credentials in snapshot rows.

## 5. Snapshot provenance

- requested_at
- response_received_at
- source_provider = GOOGLE_ADS_API
- api_version
- endpoint/method logical name
- access_model
- bid_currency_code = GOOGLE_CLOUD_PROJECT_OAUTH
- source_request_id where Google returns one
- source_payload_ref or sanitized payload hash
- ingestion_run_id
- schema_version

## 6. Historical metrics

Recommended top-level fields:

- avg_monthly_searches
- competition
- competition_index
- low_top_of_page_bid_micros
- high_top_of_page_bid_micros
- bid_currency_code

Important:

Google Ads competition is advertising competition, not organic SEO difficulty.

## 7. Monthly search volumes

Do not flatten months into columns such as jan_2026, feb_2026.

Use one of:

A. child table keyword_demand_monthly_history

or

B. JSON/JSONB monthly_search_volumes in the raw snapshot plus a canonical child mart later.

Preferred analytical model:

keyword_demand_monthly_history:
- snapshot_id
- keyword identity
- year
- month
- monthly_searches
- source_version

This keeps multi-year FEYA history queryable.

## 8. Quality/status fields

- source_status
- validation_status
- completeness_status
- warning_flags
- is_latest_for_targeting_context
- supersedes_snapshot_id
- superseded_by_snapshot_id

Do not overwrite old snapshots in place.

## 9. Source semantics

All metrics must preserve Google source meaning.

Allowed:
- external demand estimate
- approximate historical monthly demand
- Ads competition context

Forbidden renaming:
- competition -> seo_difficulty
- avg_monthly_searches -> guaranteed_searches
- historical metric -> real-time demand

## 10. Write policy

Current /api/internal/google-ads-keyword-metrics must remain write-disabled until:

1. actual Supabase batch schema is inspected;
2. target physical table name is approved;
3. FK/identity mappings are known;
4. dry-run payload is validated;
5. insert is idempotent;
6. duplicate snapshot behavior is defined;
7. audit/provenance fields are implemented.

## 11. Idempotency

Recommended logical idempotency key:

request_batch_id + keyword identity + targeting-context hash + API/source version

Retrying the same completed batch must not create uncontrolled duplicates.

## 12. Snapshot cadence

Historical metrics default cadence:

monthly.

Additional refresh may be allowed for a specific business investigation.

Do not poll identical keyword sets daily by default.

## 13. Query-cluster integration

Until query clusters exist:

snapshot may attach to keyword_id / keyword_text.

After query clusters are introduced:

aggregate external-demand marts should be calculated separately.

Do not rewrite the raw historical snapshot to make it look like cluster-level source data.

## 14. OSPM consumption

OSPM should receive compact derived evidence such as:

- current external demand level
- month-over-month / seasonal comparison
- market/language
- data age
- source quality
- query-cluster aggregation

OSPM should not receive the raw Google payload unless investigating a data issue.

## 15. Admin UI

/admin/seo-keywords may later display:

- last metric snapshot date
- avg monthly searches
- latest month
- 12-month pattern
- market/language
- source status
- validation status

It must continue showing semantic cleanup status separately from external metrics.

## 16. Migration status

Supabase schema was inspected directly before DDL.

Applied additive provenance/idempotency fields:
- metric_batch_id
- metric_batch_keyword_id
- keyword_id
- source_request_id
- api_version
- ingestion_run_id
- targeting_context_hash
- access_model

Existing historical rows were not rewritten.

A unique index on metric_batch_keyword_id + source_api supports retry-safe upsert for API-fetched snapshots.


## 17. Verified implementation state

Supabase audit after additive migrations:

- historical snapshot row count remains 168;
- 0 historical rows were rewritten with new batch provenance;
- new provenance fields are nullable;
- retry-safe unique index exists on metric_batch_keyword_id + source_api;
- bid_currency_code is stored separately for future API-fetched rows;
- runtime target API version is v25;
- developer-token header is not sent after the 2026-09-09 sunset.
