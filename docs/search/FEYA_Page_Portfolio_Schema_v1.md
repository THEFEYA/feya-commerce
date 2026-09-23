# FEYA Page Portfolio Schema v1

Status: additive SQL prepared and tested locally; not applied to production. The SQL migration is the executable source of the foundation, and this document defines its contract and remaining integration work.

## Preserve existing authorities

| Existing object | Identity / responsibility | Foundation usage |
|---|---|---|
| feya_commerce_product_drafts | canonical_product_id UUID; existing product identity | FK from membership; no product cloning or truth rewrite |
| feya_commerce_seo_pages_v1 | seo_page_id UUID; path/market/locale/portfolio/indexation | FK from all page extensions; no new base enum |
| feya_commerce_seo_query_clusters_v1 | query_cluster_id UUID | Keep existing registry; no second keyword/cluster core |
| feya_commerce_seo_page_query_ownership_v1 | page_query_ownership_id UUID; role/status/scope/period | Read by policy; writer deferred until serialized Core integration |
| feya_commerce_seo_page_url_history_v1 | Existing URL identity history | Future GSC effective-date joins and redirects |
| feya_commerce_seo_keyword_metric_snapshots_v1 | Existing observed demand snapshots and request identities | New validator will feed existing importer, not replace storage |
| feya_growth_execution_requests_v1 | execution_request_id UUID | Optional draft provenance; required by future release gate |
| feya_growth_change_events_v1 | change_event_id UUID | Existing before/after/change authority |

Existing base page_type remains product, landing, editorial. Family extension maps product→product, guide→editorial, all other families→landing. Existing indexation_intent and portfolio_status values remain unchanged. active is not equivalent to indexable.

## Added physical tables

| Table | Key | Fields / invariants |
|---|---|---|
| feya_search_page_specs_v1 | seo_page_id PK/FK | family, parent, accountable owner, draft/review/approved/hold, user/search intent, unique value, evidence/truth state, utility rationale, selection rule, inventory policy, excluded queries, evidence refs; self-parent forbidden |
| feya_search_membership_snapshots_v1 | membership_snapshot_id UUID PK | seo_page_id, rule_version, source_revision, expected_item_count, captured_at; immutable |
| feya_search_membership_items_v1 | snapshot + canonical_product_id PK | design family, eligible/ineligible/unknown, orderability, truth_version, evidence refs/reasons; eligible requires confirmed orderability + nonempty truth version |
| feya_search_page_versions_v1 | page_version_id UUID PK; unique page + version_number | Immutable spec/content/evidence, SHA-256 content hash, same-page snapshot FK, existing execution/change references |
| feya_search_link_edges_v1 | link_edge_id UUID PK | from/to page FKs, kind, deterministic/editorial mode, proposed/approved/hold/retired, source version/evidence; no self links; unique edge/kind/version |

All five tables: RLS enabled, no anon/authenticated/public table grants. Service role may select/insert; only specs and proposed link ledger allow update. Evidence/version update/delete also fail through immutable-row triggers for ordinary owner execution. A database owner can deliberately change DDL; this is not a tamper-proof external audit system. No public view or public write RPC is created.

Snapshot header and every item must be inserted in ONE transaction. Deferred count constraints execute at commit, rejecting incomplete snapshots and subsequent appended items. Duplicate canonical_product_id cannot inflate depth. Multiple products that share a design_family_key count as one distinct design in the policy. Missing design identity/unknown/stale truth cannot satisfy eligibility. Never assign independent design keys simply to bypass inventory policy.

JSON contracts (producer schema must be validated before writes):

```json
{
  "selection_rule_json": {
    "version": "selection_v1",
    "all": [
      {"field": "confirmed_sellable_type", "op": "in", "values": ["shoulder_armor"]},
      {"field": "orderability", "op": "eq", "value": "confirmed"}
    ],
    "unknown_policy": "exclude_and_queue_review"
  },
  "inventory_policy_json": {
    "status": "proposed",
    "minimum_distinct_designs": 4,
    "decision_ref": null
  },
  "evidence_refs_json": [
    {"source_type": "owner_confirmed_truth", "source_id": "existing-reference", "version": "actual-source-version"}
  ]
}
```

Values above are structural examples, not FEYA data or an approved inventory threshold. The selection rule JSON is a declarative contract, not executable SQL and not yet an implemented arbitrary rule evaluator. Whitelist field/operators at the future service boundary. Never interpolate rule JSON into SQL.

The current migration checks JSON shapes, FK relationships and immutable evidence; it does not implement the full JSON producer schema. It checks family when a spec is written; later changes to the existing base page_type must be checked again by the future release service. Full parent cycles are detected in policy, not enforced by this migration. No release/promotion is permitted on that basis alone.

## Approval / release contract (next stage)

1. Existing Core case owns the proposal and approval class.
2. Read current truth/configuration versions from existing Product OS authority; create a complete snapshot in one DB transaction.
3. Generate/review immutable content/spec version, reserving cluster ownership without overlap.
4. Before execution, re-read target versions/orderability; compare against approved hashes. Stale evidence returns to review.
5. Serialize per ownership scope and page; recheck intervals and parent graph; commit version/ownership/release/change consistently. Use existing idempotency keys and execution ledger.
6. Publish through one immutable manifest pointer read by Next.js metadata/render/sitemap/schema. Invalidate dependent caches after successful commit. Failure leaves previous validated release visible or responds with an explicit unavailable state.

The foundation's `assessSearchPage` returns at most `eligible_for_technical_review`; `can_publish` and `can_index` are always false. An approved spec does not authorize publication. The migration creates no production release pointer and makes no new indexable pages.

## Migration and rollback

File: `supabase/migrations/20260923205841_search_portfolio_foundation_v1.sql` (created using Supabase CLI migration new). Existing required parent objects were inspected read-only in the live project before writing it.

Local verification uses actual PostgreSQL semantics via PGlite with minimal parent fixtures, not a full Supabase restore. Before production: restore schema/data into an isolated environment, inspect roles/default grants/extensions/schema-drift, run migration, validate RLS/auth and existing application reads, then record exact migration hash. Do not apply this file blindly to an empty Supabase project; its existing parent tables are prerequisites.

Rollback for code is reverting the isolated changeset with indexing disabled. Empty additive tables can be removed in a separately reviewed reverse migration. Once populated, retain them read-only/dormant and preserve provenance; do not drop evidence to undo application behavior. No production migration has been executed in this sprint.
