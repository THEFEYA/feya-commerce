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


### Business Truth / Content Brief / SCO shadow

20260918082819 — feya_business_truth_registry_v1
- versioned Business Truth
- active vs review-required policy separation
- safe status view

20260918083239 — feya_content_brief_compiler_shadow_v1
- deterministic shadow Content Brief Compiler
- service-only full compiled payload
- safe readiness projection

20260918083810 — feya_sco_shadow_draft_foundation_v1
- SCO shadow provenance fields
- growth_os_sco_shadow source mode
- atomic shadow-draft creation RPC
- draft_created audit event
- retry/idempotency support

20260918083850 — fix_sco_shadow_draft_product_slug_v1
- removes invalid product_drafts.product_slug fallback found by rollback validation
- Product Truth snapshot is canonical slug source for SCO shadow drafts

### SCO validation

Rollback-only tests confirmed:
- atomic draft + event creation
- no production rows after rollback
- repeated generation_run_id returns same draft
- one draft + one event inside transaction
- no duplicate write on retry


### Deterministic content prechecks

20260918084759 — feya_content_prechecks_foundation_v1
- deterministic token-set helper
- Jaccard similarity helper
- preview content prechecks RPC
- apply content prechecks RPC
- textual similarity threshold calibration stored in capability evidence
- exact Product Truth primary-ALT check

Validation:
- preview is read-only
- apply tested only under explicit ROLLBACK
- apply produced two expected audit events inside transaction
- rollback restored original draft snapshots/QA flags
- end-to-end SCO shadow -> prechecks -> CQA shadow transition PASS
- no test rows/events remained


### Human review / action / metric / measurement governance

20260918085403 — feya_sco_shadow_human_review_rpc_v1
- server-only approve / changes-requested / reject transition for Growth OS SCO drafts
- approval requires PASS deterministic prechecks and no validation blockers
- rollback validation confirms READY_FOR_INDEPENDENT_CQA transition

20260918085545 — feya_growth_registry_safe_views_v2
- safe Action Capability Map projection
- safe Metric Registry projection

20260918085636 — feya_metric_registry_foundation_v1
- canonical metric definitions
- current operational metric view
- future GSC/GA4/Commerce metrics remain unavailable until sources exist

20260918085854 — feya_measurement_spec_registry_v1
- Measurement Spec registry
- Measurement Outcome registry foundation
- immutable material spec hash/lock
- locked-spec mutation guard

Measurement rollback test:
- lock PASS
- SHA-256 hash created
- material mutation after lock blocked
- lifecycle status update allowed
- rollback rows = 0


### Launch readiness / admin security boundary

20260918090226 — feya_launch_readiness_gate_v1
- deterministic readiness gates for PUBLIC_SITE / SEARCH_INDEXING / MEASUREMENT / COMMERCE
- no blended readiness score
- each blocker has owner and next action

20260918090634 — feya_launch_readiness_admin_boundary_v2
- adds ADMIN_DATA_BOUNDARY as a hard public-site gate

20260918090751 — feya_admin_data_hardening_rpc_v1
- preview RPC inventories explicit internal/admin view allowlist
- hardening RPC can revoke anon/authenticated SELECT only after explicit confirmation
- hardening RPC has not been executed

Current preview:
- allowlisted internal views = 24
- anon-readable = 24
- authenticated-readable = 24

Storefront/public commerce API views are not included in the hardening allowlist.


### Pre-launch Signals / Case Admission / Objectives / Handoffs

20260918090958 — feya_prelaunch_signal_engine_v1
- deterministic pre-launch signal candidates
- launch blockers, domain work queues and degraded capabilities
- no automatic Growth Case creation

20260918091138 — feya_case_admission_preview_v1
- classifies signals as CASE_CANDIDATE / OWNER_ATTENTION / WORK_QUEUE / DEFER / MONITOR

20260918091338 — feya_explicit_signal_admission_rpc_v1
- explicit service-role admission into Growth Case or Owner Attention
- blocks promotion of DEFER / MONITOR / WORK_QUEUE into cases
- idempotent/deduplicated

20260918091455 — feya_growth_case_status_transition_rpc_v1
- guarded case lifecycle transitions
- expected current status + ownership epoch
- transition graph + idempotent events

20260918091704 — feya_growth_objective_registry_v1
- versioned Growth Objective + objective events
- structured feasibility
- activation requires FEASIBLE/PARTIAL and human user id

20260918091813 — feya_objective_aware_signal_engine_v2
- deferred Commerce/Measurement signals thaw only when matching human-activated objective exists

20260918091909 — feya_signal_admission_objective_aware_v2
- signal admission primitive switched to objective-aware admission preview

20260918092031 — feya_growth_handoff_registry_v1
- durable structured handoffs
- ownership epoch guard
- duplicate suppression
- per-case handoff budget
- unchanged reverse-loop detection
- stale result protection

20260918092401 — feya_handoff_schema_validation_v1
- simple required-field/type output contract validator
- schema-incompatible COMPLETED result is rejected
- compatible result can complete
- top-level simple JSON types only by design

Rollback validation:
- Signal admission case idempotency PASS
- Owner Attention admission dedup PASS
- DEFER promotion guard PASS
- Case lifecycle stale status guard PASS
- Objective human-only activation PASS
- Objective-aware thawing PASS
- Handoff duplicate suppression PASS
- Handoff budget PASS
- Reverse-loop detection PASS
- stale handoff result PASS
- handoff schema incompatibility guard PASS
- all test rows cleaned by ROLLBACK


## Post-handoff implementation wave

### Durable runtime / review / execution / learning foundations

20260918092631 — feya_durable_workflow_orchestrator_foundation_v1  
20260918092724 — fix_workflow_stale_audit_events_v1
- durable workflow run/event persistence installed
- worker/automatic orchestration remains unavailable

20260918093014 — feya_keyword_cleanup_review_risk_queue_v1  
20260918093114 — feya_keyword_cleanup_independent_review_foundation_v1  
20260918093210 — feya_keyword_cleanup_review_recommendation_rpc_v1
- separate human/independent review layer over legacy keyword cleanup
- historical cleanup state is not silently rewritten

20260918094618 — feya_query_cluster_proposal_foundation_v1  
20260918094653 — fix_query_cluster_apply_returning_ambiguity_v1  
20260918094752 — feya_query_cluster_proposal_recorder_v1  
20260918094834 — feya_query_cluster_proposal_queue_v1
- semantic query clustering is proposal-first
- canonical cluster creation remains review/apply gated

20260918095435 — feya_page_query_ownership_proposal_foundation_v1  
20260918095607 — feya_page_ownership_shortlist_v1  
20260918100029 — feya_indexable_page_eligibility_foundation_v1
- page ownership and indexability are separate controlled decisions
- no automatic page creation/indexation

### Regression / authority / health / incidents

20260918100407 — feya_scenario_test_registry_v1  
20260918100451 — feya_scenario_run_recorder_v1
- canonical regression scenario registry + explicit run evidence
- current latest scenario readiness after the 18 Sep regression wave: PASS 15 / WARN 0 / NOT_RUN 0 / FAIL 0 / ERROR 0
- current registry release state = PASS; this is regression-harness readiness only and does not override launch/data capability gates

20260918100652 — feya_source_of_truth_registry_v1  
20260918100818 — feya_data_source_health_registry_v1
- explicit data authority and source-health state installed

20260918101047 — feya_incident_change_freeze_foundation_v1  
20260918101125 — feya_change_freeze_mutation_guards_v1
- incidents can impose controlled mutation freezes
- mutation guards are database-level, not chat-memory instructions

### Execution / learning / experimentation

20260918101513 — feya_execution_gateway_foundation_v1  
20260918101611 — feya_execution_gateway_safe_view_v1
- request/approval/receipt foundation installed
- no production dispatcher is enabled

20260918101742 — feya_learning_registry_foundation_v1  
20260918103315 — feya_learning_policy_adoption_gate_v1
- reusable evidence/learning persistence installed
- policy promotion remains explicitly gated

20260918103620 — feya_experiment_change_contamination_foundation_v1  
20260918103726 — feya_execution_receipt_change_event_bridge_v1  
20260918103846 — feya_change_event_safe_view_v1
- experiment/change contamination and execution-change linkage installed

### Strategy / opportunities / role maturity / stabilization

20260918104110 — feya_growth_strategy_initiative_foundation_v1  
20260918104142 — feya_growth_strategy_margin_mode_guard_v1
- versioned Growth Strategy + Initiative primitives installed
- margin-mode guard prevents pretending contribution margin is known without trusted variable-cost truth

20260918104414 — feya_event_opportunity_registry_v1  
20260918104448 — feya_event_opportunity_attention_bridge_v1  
20260918104511 — fix_opportunity_expiry_transition_v1
- opportunity/expiry foundation installed; no synthetic opportunity rows created

20260918104727 — feya_role_activation_gate_v1
- eight canonical roles have explicit runtime state/autonomy ceiling
- current state: 5 SHADOW, 3 INACTIVE, 0 ACTIVE

20260918104905 — feya_stabilization_window_gate_v1
- stabilization-window gate installed; current windows = 0

20260918105345 — feya_data_health_experiment_propagation_v1
- required measurement-source degradation can propagate to active experiments
- DEGRADED produces warning contamination; STALE/UNAVAILABLE/NOT_OBSERVABLE can invalidate affected experiment evidence

### Admin boundary registry hardening

20260918104927 — feya_admin_data_boundary_registry_v2  
20260918105052 — feya_admin_data_boundary_registry_v3
- replaced the earlier fixed 24-view hardening list with registry-backed governed admin-view registration
- current registered admin read surfaces = 40
- current browser-readable = 40 because hardening is intentionally NOT executed before admin auth/allowlist verification
- hardening now refuses empty/missing registry state instead of claiming partial success

### AI runtime cost discipline

20260918105254 — feya_ai_runtime_usage_ledger_v1  
20260918105716 — feya_ai_runtime_usage_metering_active_v1
- private per-invocation model token/latency ledger
- no prompt or model-response content stored
- current internal OpenAI runners instrumented:
  - SEO keyword cleanup
  - independent CQA
  - SCO shadow
  - keyword cleanup review
  - query-cluster proposals
  - page-ownership proposals
- live metered invocation rows at activation = 0
- monetary cost estimation intentionally absent until a versioned pricing contract exists
- AI_BUDGET_GATE remains UNAVAILABLE / owner_policy_not_defined
- Human Owner must define any hard monetary limit after real usage is measured


### Component inclusion claim guard

20260918105852 — feya_component_claim_precheck_v1  
20260918110039 — feya_component_claim_publish_cqa_gate_v2  
20260918110151 — feya_sco_component_claim_initial_state_v1
- deterministic precheck detects explicit unconditional inclusion claims for optional configurations / known non-components
- independent CQA remains required for broader semantic claims
- ready_for_publish now additionally requires qa_self_report.component_claim_truth=pass
- new SCO shadow drafts initialize component_claim_truth=not_checked rather than assuming PASS
- rollback regression fixture confirmed an explicit false inclusion claim becomes needs_review and leaves no persistent fixture changes
- STYLED_IMAGE_NOT_INCLUDED_COMPONENT latest Scenario Run = PASS

### Purchase / measurement reconciliation classifier

20260918110552 — feya_purchase_measurement_reconciliation_classifier_v1
- deterministic classifier keeps Commerce DB authoritative for completed-order truth
- GA4 purchase outage/missing measurement is classified as data quality / reconciliation failure, not business collapse
- classifier regression evidence recorded for GA4_PURCHASE_OUTAGE_IS_DATA_QUALITY
- latest Scenario Registry state after the regression wave: 15 PASS / 0 WARN / 0 NOT_RUN / 0 FAIL / 0 ERROR

### Internal RPC least-privilege hardening

20260918110651 — feya_internal_rpc_privilege_hardening_v1
- revoked anon/authenticated EXECUTE from internal SEO metric import/promotion, brief worker, keyword-plan, review, commercial-promotion and metric-batch mutation RPCs
- revoked browser EXECUTE from the internal component-claim precheck, admin-boundary preview, and internal trigger helpers
- retained service_role execution for internal workflows
- intentionally preserved public feya_commerce_create_order_draft_v1 because it is the storefront order-draft boundary
- post-migration audit: among SECURITY DEFINER FEYA Commerce/Growth functions containing DML, the public order-draft RPC is the only remaining anon/authenticated executable path in this audited scope


### Deterministic domain routing / historical component-check backfill

20260918110813 — feya_growth_domain_routing_policy_v1
- deterministic routing policy encodes the OSPM ↔ CPIM boundary for observable first-party states
- healthy organic acquisition + weak commercial response routes to CPIM rather than rewriting SEO
- low exposure + high conversion routes the acquisition opportunity to OSPM after CPIM identifies the commercial pattern
- protected winners are not opened to rewrite merely because another domain is weak

20260918111006 — feya_component_claim_backfill_rpc_v1
- service-role-only idempotent apply function for historical component-inclusion prechecks
- historical approvals are not reinterpreted as PASS
- current active-draft component check state after deterministic backfill: 40 PASS / 95 WARNING
- aggregate inspection found 0 explicit false-inclusion claims in current active drafts; all 95 warnings come from upstream Product Truth/component-review blockers rather than detected false prose

20260918111345 — feya_commercial_trigger_search_path_hardening_v1
- fixed mutable search_path warnings on the two commercial-keyword updated_at trigger helpers
- revoked browser EXECUTE from those trigger functions; service_role retained
- targeted post-migration security-advisor check returned no findings for the hardened functions


### Product Truth review visibility

20260918111828 — feya_product_fact_review_safe_view_v1
- sanitized read-only Product Fact review queue added for the admin cockpit
- excludes the raw fact_snapshot_json evidence payload from the browser-safe projection
- registered with the registry-backed Admin Data Boundary
- governed admin read surfaces = 40; all 40 remain browser-readable only because protected admin auth/hardening is intentionally not activated yet
- /admin/product-facts-review links directly to the existing Product Builder evidence surface; no write/resolution action is enabled


### Owner Attention cockpit activation

20260918112026 — feya_owner_attention_safe_view_v1
- sanitized read-only Owner Attention projection added and registered with the Admin Data Boundary
- raw context_json / resolution_json are not exposed in the browser-safe view
- two real PRE_LAUNCH owner items are now durable:
  - P1 POLICY_DECISION — confirm canonical return-policy wording
  - P2 STRATEGY_DECISION — real checkout/payment workflow remains absent
- the two return-policy launch signals are deduplicated into one Owner Attention item rather than creating duplicate decisions
- no synthetic Growth Case was created; Growth Cases remain 0
- /admin/owner-attention is read-only until protected admin auth and audited owner-resolution actions exist


### Owner UI safe projections

20260918124617 — feya_owner_work_safe_view_v1
- sanitized read-only projection over Growth Cases + latest workflow state
- excludes raw workflow state_json, leases and raw errors
- supports the Owner Work workspace without creating a parallel work entity
- current rows = 0, matching the intentional PRE_LAUNCH state

20260918124647 — feya_owner_attention_safe_view_v2
- adds stable source_code/source_type/source_scope to the sanitized Owner Attention projection
- raw context_json/resolution_json remain hidden
- enables deterministic Russian presentation without matching English free-text
- current open attention items = 2

Admin Data Boundary:
- governed admin read surfaces now = 42
- browser grants remain intentionally enabled until owner auth/allowlist verification and explicit hardening
