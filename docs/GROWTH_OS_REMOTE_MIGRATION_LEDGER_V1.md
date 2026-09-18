# FEYA Growth OS — Remote Supabase Migration Ledger v1

Status: remote migration history is canonical for the current single Supabase project
Project ref: ysnizcgzhdwdfdkjkhud
Implementation branch: growth-os-implementation-v1

## Why this ledger exists

The existing FEYA repository does not contain the full historical Supabase migration baseline.

Therefore adding only the newest Growth OS SQL files to a local supabase/migrations directory would create a false impression that the repository can fully recreate the database.

Until a complete baseline/export strategy is approved:

- Supabase remote migration history is canonical.
- GitHub stores this audited ledger and architecture contracts.
- New DDL is applied only through Supabase migrations.
- No partial local migration history is presented as complete.

## Applied Growth OS implementation migrations

### Keyword demand foundation

20260917233243 — feya_keyword_metric_snapshot_api_provenance_v1
- adds batch/keyword/source provenance to existing keyword metric snapshots
- preserves historical rows

20260917233323 — feya_keyword_metric_snapshot_idempotency_index_v2
- retry-safe API snapshot uniqueness

20260917233712 — feya_keyword_metric_snapshot_bid_currency_v1
- stores bid currency context separately

### Controlled editing / version ledger

20260917235021 — feya_commerce_version_ledger_foundation_v1
- extends server-only admin review event journal
- creates generic entity version ledger

20260917235128 — feya_commerce_entity_versions_surface_key_v2
- distinguishes version surfaces such as content/en vs content/es

20260917235152 — feya_content_draft_atomic_update_rpc_v1
- atomic service-role-only controlled content draft mutation

20260917235235 — fix_content_draft_rpc_ambiguous_version_id_v1
- fixes PL/pgSQL RETURNING ambiguity discovered by rollback validation

### OSPM SEO portfolio

20260917235543 — feya_seo_portfolio_foundation_v1
- stable SEO page IDs
- URL history
- query cluster registry
- cluster members
- page/query ownership
- bootstraps 243 product-page candidates
- creates zero automatic query clusters/ownership rows

20260917235623 — feya_seo_page_portfolio_safe_view_v1
- safe read-only page portfolio projection

20260917235944 — feya_query_cluster_review_queue_v1
- deterministic semantic-clustering readiness queue
- does not create clusters

### Core capability / workflow

20260918000627 — feya_growth_registry_capabilities_v1
- generic registry table
- initial Capability Registry and safe readiness view

20260918000801 — feya_growth_case_registry_foundation_v1
- Growth Cases
- case items
- case events
- idempotent case creation
- atomic ownership epoch transfer

20260918000925 — feya_owner_attention_queue_foundation_v1
- durable owner-attention queue
- canonical categories
- deduplication

### Independent CQA

20260918081718 — feya_seo_pack_independent_cqa_gate_v1
- independent CQA fields
- stronger ready_for_publish constraint
- safe shadow-classification view

20260918081947 — feya_seo_pack_cqa_event_type_v1
- adds cqa_checked to existing SEO pack event journal

20260918082014 — feya_record_independent_cqa_result_rpc_v1
- atomic independent CQA result persistence
- stale-state protection
- cqa_checked audit event

## Validation tests performed

All mutation tests used explicit ROLLBACK.

### Controlled content edit RPC

PASS:
- field allowlist
- before/after version creation
- audit event creation
- rollback cleanliness
- idempotency returns same event/version

After rollback:
- production draft restored
- test events = 0
- test versions = 0

### Growth Case registry

PASS:
- idempotent create
- duplicate fingerprint reuse
- ownership epoch 1 -> 2
- repeated transfer idempotency
- stale epoch rejection

After rollback:
- test cases = 0
- test events = 0

### Owner Attention queue

PASS:
- dedup key returns existing item

After rollback:
- test attention rows = 0

### Independent CQA recorder

PASS:
- temporary CQA result persisted inside transaction
- cqa_checked event persisted inside transaction
- rollback restored cqa_status=not_run

After rollback:
- test CQA events = 0

## Security verification

Verified for all new private Growth OS tables:

- RLS enabled
- anon SELECT = false
- anon INSERT = false
- authenticated SELECT = false
- authenticated INSERT = false
- service_role read/write = true

Verified mutation functions:

- anon EXECUTE = false
- authenticated EXECUTE = false
- service_role EXECUTE = true

Functions checked:
- feya_fn_update_content_draft_v1
- feya_fn_record_content_cqa_result_v1
- feya_fn_create_growth_case_v1
- feya_fn_transfer_growth_case_owner_v1
- feya_fn_enqueue_owner_attention_v1

## When to create a repository migration baseline

Create a real local migration baseline only when we intentionally choose one of:

1. Full schema baseline export + future migrations from that point.
2. Full historical migration import where reproducible.
3. Fresh-environment rebuild strategy validated on a disposable Supabase project.

Do not mix an incomplete migration directory with claims of reproducibility.
