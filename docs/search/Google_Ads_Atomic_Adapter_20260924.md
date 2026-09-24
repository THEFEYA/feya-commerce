# FEYA — Google Ads atomic evidence adapter

24 September 2026. Parent: `816c1ff12441986a545e829d093c52e99e73ca5a`. Draft PR #26. Production SELECT-only; migration8 **unapplied**, provider activation OFF until reviewed release. Public EN/admin RU, design/fonts/colors/prices/Product Truth and agent passports unchanged.

## Decision and contradictions resolved

Reuse the existing atomic metric importer, staging/snapshot pair, immutable evidence and receipt table. No third keyword core, duplicate approval engine or new scoring scale. Google API transport becomes another evidence input; it does not approve source context, keywords, pages or indexing.

| Observed issue | Evidence class | Resolution |
|---|---|---|
| Outbound geo/language/network came from environment, stored geo/language from batch or US/en fallback | Repository code at parent commit | Explicit US/en/Google Search profile. `geoTargetConstants/2840` and `languageConstants/1000` are sent in every request; conflicting configured values stop execution. Batch market/language/provider must match, with no fallback. |
| Snapshot upsert, keyword status and batch status were separate operations | Repository code | One existing RPC transaction owns observations, statuses and receipt. Failure in receipt insertion rolls everything back. |
| Same source/batch key could overwrite a previous capture | Repository code | Immutable captures, explicit request key, first committed result retained. A new request cannot silently refetch completed selection. |
| `batch_id` / `batchId` might have been missing | Earlier uncertainty, now disproven by observed fixture and fresh SELECT of generated expressions | These are generated aliases of `metric_batch_id`, not independent identities. Reads/writes now use canonical UUID columns; aliases remain unchanged. |
| A grouped API result could look like independent demand for each keyword | Google-confirmed grouping; FEYA storage design | Keep each requested keyword identity and a shared `observation_group`, returned text, variants and raw result. Never sum group members. |
| Old summaries imply developer-token requirement | Official documentation contains stale summary text above newer migration guidance | Current dated migration body says developer tokens sunset 9 September 2026; Cloud-project OAuth access controls the API. Existing header-free transport stays. No new token request to owner. |

## Official evidence checked on 24 September

- [Google historical metrics guide](https://developers.google.com/google-ads/api/docs/keyword-planning/generate-historical-metrics): confirms US geo 2840, English language 1000, approximate search metrics, advertising competition and bid micros. Advertising competition is not organic SEO difficulty.
- [v25 request](https://developers.google.com/google-ads/api/reference/rpc/v25/GenerateKeywordHistoricalMetricsRequest): geography, language and network have permissive omission behavior. FEYA sends explicit values instead of relying on omissions. Google permits much larger requests; the **1–20 keyword cap is FEYA policy**, not a Google limit.
- [v25 historical options](https://developers.google.com/google-ads/api/reference/rpc/v25/HistoricalMetricsOptions): requested year/month ranges can produce only the available subset. FEYA v1 holds incomplete monthly coverage rather than labeling it a full-year result.
- [v25 result](https://developers.google.com/google-ads/api/reference/rpc/v25/GenerateKeywordHistoricalMetricsResult): text and close variants share metrics. Keyword IDs and result groups represent different things.
- [Developer-token migration](https://developers.google.com/google-ads/api/docs/api-policy/developer-token): use the updated migration body to resolve its conflict with the stale page summary. Actual FEYA Cloud-project access level remains **unverified in this implementation pass**.
- [ProtoJSON](https://protobuf.dev/programming-guides/json/): large integers can arrive as strings. Adapter validates lexical integers and supported bounds; identifiers stay strings and raw bid micros remain in provenance.

These are external facts, not FEYA traffic/conversion measurements. All newly generated test metrics are synthetic and never sent to production. No search volume, SEO difficulty, revenue or Google ranking behavior has been invented.

## Request and response contract

`GET /api/internal/google-ads-keyword-metrics?batch_id=<uuid>` is an authenticated preview of up to 20 pending keyword IDs. It does not contact Google or write to the DB. There is no implicit pick of an arbitrary pending batch.

An explicit POST selects the operation:

```json
{
  "dry_run": false,
  "batch_id": "existing-batch-uuid",
  "keyword_ids": ["existing-batch-keyword-uuid"],
  "period_start": "2025-09",
  "period_end": "2026-08"
}
```

The dates above are only an example; require a recent completed twelve-month range. The body keeps strict boolean handling. Header `Idempotency-Key` is mandatory for execution. UUIDs, cardinality, duplicates, keyword normalization, batch membership, provider, country, language, network and reviewed API version v25 are checked before Google. Dry-run with a selection returns the exact outbound request and fingerprint. Old automatic POST callers must migrate to this explicit contract before activation.

Execution requires all of:

- existing internal token authorization;
- `FEYA_ADMIN_AUTH_REQUIRED=true`;
- `FEYA_METRIC_IMPORT_STORAGE_ENABLED=true`;
- new `FEYA_GOOGLE_ADS_IMPORT_ENABLED=true`;
- healthy reader boundary v1, access boundary v2 and Google adapter SQL contract;
- fetchable selected batch/keyword statuses, or a matching already committed receipt.

Owner identity and publication authority are not inferred from the internal token. This route only imports evidence. It cannot assign Primary, publish or index. Existing Core/agent proposal and owner decision boundaries remain separate.

Profile v1 deliberately supports US/en/Search and a full twelve-month period. Other regions, combined countries, all-language requests, arbitrary networks and incomplete coverage require a separately reviewed adapter extension. This is a controlled scope, not a claim that Google lacks those features.

Transport reuses OAuth, account currency/time-zone lookup and Google v25. Every call has a 15-second timeout. No automatic provider retry loop is added. Missing account context, provider errors, unmatched results, absent demand, out-of-bound integers, duplicate months, incomplete periods or multiple result groups for one requested keyword hold the whole selected operation. Null is not zero; missing monthly values remain null where the monthly record exists. Unsupported/held responses return a reason and perform no metric/status writes; persistent quarantine of such raw failures is future work.

## Storage and replay semantics

Files: `lib/googleAdsDemandAdapter.ts`, `lib/googleAdsProvider.ts`, existing internal route; migration `20260924095003_google_ads_atomic_evidence_v1.sql`; deterministic generator `scripts/build-google-ads-import.py`.

The existing `feya_commerce_import_keyword_metrics_atomic_v1(text,jsonb)` retains identity, OID, ownership, invoker security, ACL and CSV behavior. Its API branch validates provenance/selection, locks the batch and selected keyword rows, stores staging/snapshot pairs, updates fetch statuses and appends the receipt in one transaction. `result_summary_json` and keyword evidence retain historical fields while adding the atomic request reference and context-review flag.

Snapshots keep `demand_observation_key` non-null and `data_freshness_status=context_review_required`; existing reader isolation therefore still applies. Historical approvals/score/IDs are not rewritten. The snapshot's request field continues to identify the atomic receipt; the provider request ID, original result, exact request, account currency/time zone, API version, returned keyword and close variants are retained in evidence/receipt metadata. Stable batch keyword IDs are stored in each observation's metadata. Existing snapshot batch-FK columns are not repurposed and legacy upsert uniqueness is not reused.

`batch_status=applied` / `keyword_status=metrics_fetched` mean fetching completed, **not source-context or SEO approval**. UI consumers must read the explicit context-review state before making search decisions.

A committed retry looks up the existing receipt **before** OAuth and returns original string IDs. A changed explicit request with the same key returns 409. Concurrent copies of the same request may both contact Google before either commits; the DB lock makes the first successful capture authoritative and both callers receive the same receipt. Exactly-once provider execution is not claimed. An uncertain DB response requires retrying the same request key. Re-fetching completed selection requires a separately prepared new batch; old evidence is not overwritten.

The new service-only `feya_commerce_google_ads_import_contract_v1()` checks the exact importer body, invoker configuration/privileges and existing reader/access health. Body or boundary drift closes the API path. Migration preflight rejects an unexpected previous importer or boundary; transaction postcondition must pass.

## Validation and limits

Local adapter scenarios cover explicit targeting, UUID/selection mismatch, profile conflicts, stable ordering, periods, shared close-variant grouping, raw micros, null/zero/currency, missing/duplicate/unrequested results and unsafe integers. SQL scenarios cover preflight, unchanged RPC identity/ACL, zero writes on invalid provenance, receipt-failure rollback including statuses, immutable captures, large string IDs, replay/conflict, native concurrent first-capture selection, CSV compatibility and rollback.

Runtime adds actual Next → synthetic Google transport → PostgREST → PostgreSQL checks to the existing Auth/browser/CSV suite. Only Google transport is substituted: a loopback fixture with a test-process preload. The application has no provider-host override or test route. Assertions check exact outbound request and safe first-capture behavior. Production credentials are excluded. This proves adapter/transaction behavior, **not live Google authorization, quota, coverage or data quality**.

The 84-view / 39-table restored scope and earlier limits on external FKs/non-core triggers/indexes remain. Exact-head CI status, artifact digest and counts are recorded in PR #26 after completion, rather than treating scenario definitions as PASS. Overall advisor/pre-index gates remain closed.

## Dependency roadmap

| Task / owner | Inputs → output | Validation / blocker | Rollback / definition of done |
|---|---|---|---|
| Adapter preparation — Engineering / GDAE | Observed schema, Google docs, current store → migration8 + route/parser | Local SQL, native concurrency, real app/API runtime | Revert code before activation; complete at exact-head PASS |
| Hosted compatibility review — Engineering / Core | Selected deployment, actual DB contracts/config → release record | All preceding migrations and Auth/cutover prerequisites; current fixture is not hosted staging | Keep flags OFF; no speculative grants |
| Provider access verification — GDAE | Existing Cloud/OAuth setup → explicit live access evidence | Read-only bounded request only when activation prerequisites hold; unsupported access keeps CSV path | Disable API flag; no owner task until an actual missing permission is identified |
| Inventory/page pilot — CPIM / OSPM | Product Truth + eligible designs + candidate intent → a few reviewable briefs | Distinct intent, inventory, unique value, accountable query owner; no axis-to-page autogeneration | Keep candidate/noindex; no public page until portfolio gate passes |
| Source-context review and rollout — Core / TSEO / owner authority | Actual evidence + previous launch checklist → reviewed decision | Import is not source approval or indexing permission | Previous deployment/manifest; indexing stays OFF until binary gate passes |

Guarded rollback: `tests/search-db/fixtures/rollback-google-ads-import.sql` restores the previous CSV-only importer, preserves immutable API observations/receipts/status history and keeps reader isolation. Google contract becomes NULL. Turn API flag OFF first. It does not reverse completed fetches or restore legacy overwrite behavior. A new forward recovery requires review; do not blindly rerun migration8 after rollback because its health function already exists.

No new owner research, uploads or connections are required for current preparation. Live access, production cutover and source-context approval are separate uncompleted gates.
