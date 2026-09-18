# FEYA Growth OS — Implementation Gap Map v1

Status: implementation planning baseline
Repository: THEFEYA/feya-commerce
Architecture baseline: FEYA Growth OS v1.0 CANONICAL
Branch: growth-os-implementation-v1

## 1. Purpose

Map the canonical FEYA Growth OS architecture to the current feya-commerce implementation.

Classification:
- REUSE — existing capability already matches Growth OS direction.
- EXTEND — existing capability should be evolved, not replaced.
- NEW — capability does not exist yet.
- DEFER — postpone until prerequisites or data volume justify it.

Primary rule:

Do not build a second parallel Growth OS. Extend the existing FEYA Commerce Product OS incrementally.

## 2. Current repository reality

Current stack:
- Next.js 15 + TypeScript + React 19
- Supabase/Postgres
- Vercel
- OpenAI Responses API
- Google Ads API integration scaffolding

Current public/admin surfaces found:
- /
- /shop
- /shop/[slug]
- /admin
- /admin/review
- /admin/products
- /admin/seo-keywords

Current internal APIs found:
- /api/internal/openai-health
- /api/internal/google-ads-health
- /api/internal/seo-keyword-cleanup
- /api/internal/google-ads-keyword-metrics

Repository docs still describe storefront/admin as read-only Phase A/B, but server-only automation has already begun.

## 3. Existing assets to REUSE

### Canonical product identity — REUSE

Existing storefront/admin data already exposes canonical_product_id, product_slug and matched_etsy_listing_id.

This aligns with Growth OS stable entity identity.

Do not replace canonical_product_id with URL, title or platform handle.

### Supabase safe-view pattern — REUSE

Existing design separates public safe views from raw evidence tables and server-only service-role access.

Keep lib/supabase.ts and lib/supabaseAdmin.ts as the current security boundary.

### Internal API authentication — REUSE / EXTEND

Existing FEYA_INTERNAL_API_TOKEN and lib/internalAuth.ts are useful for current private automation.

Later, add explicit service/action permissions only when required.

### Dry-run pattern — REUSE

SEO cleanup and Google Ads metrics routes already default to safe dry-run behavior.

Keep this pattern for shadow mode, recommend-only mode and controlled rollout.

### SEO keyword cleanup pipeline — EXTEND

Existing:
- feya_commerce_v_seo_keyword_ai_cleanup_report_v1
- feya_commerce_seo_keyword_ai_cleanup_v1
- /api/internal/seo-keyword-cleanup
- /admin/seo-keywords

The current OpenAI prompt already correctly forbids inventing search volume, competition, CTR, bids, trends, seasonality or ranking positions.

Future extension:
- map cleaned keywords to canonical query_cluster_id;
- add Metric Registry-backed external demand snapshots;
- separate semantic keyword state from market metrics;
- preserve prompt/model/version provenance.

Do not rebuild this pipeline.

### Google Ads metric request batching — EXTEND

Existing code references:
- feya_metric_request_batch_v1
- feya_metric_request_batch_keywords_v1
- /api/internal/google-ads-keyword-metrics

This already resembles future GDAE batch ingestion.

Current route:
- reads eligible metric batch;
- resolves keywords;
- obtains OAuth access token;
- calls generateKeywordHistoricalMetrics;
- sanitizes diagnostics;
- defaults to dry-run.

Do not create a second Google Ads integration.

### Product OS vision — REUSE

The current admin roadmap already contains:
- Command Center / attention queue;
- Product Builder;
- Product DNA;
- components vs configurations;
- SEO / AI cockpit;
- media QA;
- pricing/profit;
- change impact tracking;
- work queues;
- readiness.

Growth OS should extend this Product OS, not compete with it.

### Change-impact concept — REUSE / FORMALIZE

The existing roadmap already requires:
- change reason;
- before/after;
- who or what changed it;
- expected effect;
- later performance comparison.

This maps directly to Version Ledger, Change Registry, Execution Receipt and GMEL measurement.

## 4. Existing assets that need EXTENSION

### Google Ads access model — EXTEND

Current code still treats GOOGLE_ADS_DEVELOPER_TOKEN as required.

After the September 9, 2026 migration, access level is determined by the Google Cloud project that owns the OAuth credentials.

Required direction:
- OAuth Cloud Project becomes canonical authorization context;
- developer-token becomes compatibility configuration rather than access authority;
- Basic Access verification remains prerequisite for production Keyword Planning;
- do not block the rest of Growth OS on Basic Access.

### Google Ads metric persistence — EXTEND / NOW WIRED IN BRANCH

Supabase audit confirmed that a canonical snapshot layer already existed:

- feya_commerce_seo_keyword_metric_snapshots_v1
- feya_commerce_seo_keyword_metric_import_staging_v1
- feya_commerce_v_seo_keyword_metric_validation_queue_v1
- feya_commerce_v_seo_keyword_score_preview_v1
- feya_commerce_v_seo_keyword_recommendation_v1

Observed state during audit:

- 168 snapshot rows total;
- 150 placeholder rows with api_not_connected;
- 18 real Google Ads CSV imports.

Therefore no new snapshot table was created.

Applied additive migration:

- metric_batch_id
- metric_batch_keyword_id
- keyword_id
- source_request_id
- api_version
- ingestion_run_id
- targeting_context_hash
- access_model
- FK/index/idempotency support

The branch endpoint now persists successful Google Ads API historical metrics into the existing snapshot table and updates the metric batch result summary.

Existing downstream views continue to select the latest metric row and automatically distinguish placeholders from fresh metrics.

### Admin SEO Keywords page — EXTEND

Current page is an excellent seed for OSPM/GDAE cockpit.

Near-term additions:
- semantic cleanup status;
- external metric validation status;
- last metric snapshot;
- market/language;
- query-cluster mapping;
- hold/review state;
- provenance.

Do not turn it into the full Growth Director dashboard yet.

### Service-role write layer — EXTEND CAREFULLY

lib/supabaseAdmin.ts already enables server-only writes.

Next stage should introduce explicit write services rather than arbitrary direct table mutations in route handlers.

Target:
domain service -> validation -> policy -> write -> audit/change log.

Never expose service-role access to agents or browser code.

### CI — EXTEND

Current CI runs typecheck and build.

Later add:
- deterministic rule tests;
- schema contract tests;
- scenario regression tests;
- migration validation.

Do not add heavy CI before first canonical Growth OS schemas exist.

## 5. NEW capabilities required

### Growth OS core schema — NEW

Do not create every logical registry as a separate microservice.

Recommended physical grouping in Supabase:

Core case/workflow:
- growth_cases
- growth_investigations
- growth_hypotheses
- growth_initiatives
- growth_tasks
- growth_approvals

Evidence/versioning:
- growth_evidence_snapshots
- growth_change_events
- growth_execution_receipts
- growth_learning_records

Configuration:
- growth_registry_items

growth_registry_items can initially host logical registry types such as metrics, capabilities, policies, templates and action capabilities.

Avoid table explosion until usage proves a need.

### Query Cluster Registry — NEW

Current SEO cleanup works at keyword level.

Growth OS needs stable:
- query_cluster_id
- normalized_intent
- market
- language
- member keywords
- Product DNA relationships
- mapping version

This becomes OSPM's semantic unit.

### SEO Page Portfolio — NEW

Needed before serious OSPM automation.

Minimum:
- seo_page_id
- canonical_url
- page_type
- market/locale
- lifecycle_state
- indexation_intent
- owned_query_clusters
- related_product_clusters
- protected_winner_state

Initial portfolio can be bootstrapped before GSC history exists.

### Version Ledger — NEW

Required before controlled editing.

Track at minimum:
- content_version
- media_version
- offer_version
- technical_version
- template_version
- metric_version
- policy_version

Implement before autonomous optimization.

### Product / Business Truth governance — NEW / FORMALIZE

Product Truth already exists conceptually in product drafts/views.

Need explicit controlled mutation and audit rules before SCO/CQA become production-capable.

Business Truth should centralize:
- production timing;
- shipping;
- returns;
- personalization;
- approved policy claims.

### Content Brief Compiler — NEW

Deterministic service.

Inputs:
- OSPM intent/keyword roles;
- Product Truth;
- Product DNA;
- Business Truth;
- template;
- Content Policy;
- protected fields;
- experiment constraints.

Output:
seo_content_brief.v1.

Do not ask an LLM to reconstruct this context from chat history.

### Signal & Eligibility Engine — NEW

SQL/TypeScript service.

Initial responsibility:
- detect material deltas;
- protected-winner eligibility;
- case-admission eligibility;
- stale-data suppression;
- opportunity expiry.

No LLM required for raw anomaly detection.

### Metric Registry + Measurement Engine — NEW

Needed before GMEL can work safely.

Metric Registry separates semantic definition, source, version and measurement surface.

Measurement Engine performs deterministic/statistical calculations.

LLM must not calculate authoritative KPIs.

### Execution Gateway — NEW LATER

Do not build before controlled editing exists.

Once production mutations begin, add:
- permission;
- scope;
- approval;
- version lock;
- idempotency;
- receipt;
- rollback.

### Owner Attention Queue — NEW LATER

The existing Admin Command Center vision is the correct UI location.

Do not implement until Growth Cases actually exist.

## 6. DEFER intentionally

### Full BigQuery warehouse — DEFER FOUNDATION, NOT DESIGN

Reserve architecture now.

Do not block storefront/Product Builder work on a populated warehouse.

Enable when GSC/GA4 production data starts to exist.

### CPIM full commercial intelligence — DEFER

Needs real current Zofeya traffic and orders.

### Advanced GMEL experimentation — DEFER

Do not build an experimentation platform clone.

Start with change history, baseline, pre/post and simple cohorts.

### Founder’s Chief of Staff — DEFER

Useful later over Growth Cases and Owner Attention Queue.

Not foundation-critical.

### CRO/UX, Paid Growth, Sales OS, Inventory OS — DEFER

Only after real data/use cases justify them.

## 7. Phase plan from current repository

### PHASE G0 — Canonical implementation mapping

Goal: no production behavior change.

Tasks:
1. Preserve current storefront/admin.
2. Document actual Supabase schema relevant to keyword cleanup, metric batches, product IDs and content drafts.
3. Confirm actual table/view definitions before migrations.
4. Add Growth OS implementation contracts/docs.

Exit: actual schema mapped; no duplicate architecture.

### PHASE G1 — Keyword Demand Foundation

Goal: finish the already-started Google Ads pipeline safely.

Tasks:
1. Complete OAuth/Cloud Basic Access.
2. Update Google Ads authorization semantics.
3. Define metric snapshot table.
4. Save GenerateKeywordHistoricalMetrics responses.
5. Add market/language/source/version fields.
6. Show latest validated metrics in Admin SEO Keywords.
7. Keep dry-run capability.

Exit:
keyword cleanup -> metric batch -> Google Ads -> versioned snapshot -> admin visibility.

This is the first real GDAE/OSPM slice.

### PHASE G2 — Product Builder Read-Only + Truth

Goal: strengthen canonical business context before AI execution.

Tasks:
- Product Builder read-only detail;
- Product Truth;
- DNA;
- components vs configurations;
- content;
- price;
- media;
- readiness;
- provenance.

Exit: future agents can reference stable product facts.

### PHASE G3 — Controlled Editing + Version Ledger

Goal: enable safe mutation.

Tasks:
- content edit;
- approval;
- change event;
- before/after;
- actor;
- reason;
- version IDs;
- rollback data where feasible.

Exit: human edits are measurable and auditable.

Do this before agent publishing.

### PHASE G4 — SEO Portfolio Bootstrap

Goal: create OSPM foundation.

Tasks:
- query clusters;
- page portfolio;
- intended query/page ownership;
- page types;
- indexability intent;
- landing-page eligibility;
- protected-winner field, initially manual or empty.

### PHASE G5 — SCO + CQA Shadow Mode

Goal: canonical content workflow without production autonomy.

Tasks:
- Content Brief Compiler;
- SCO proposals;
- CQA independent review;
- proposal versions;
- human approval;
- no auto-publish.

### PHASE G6 — Technical SEO Production Readiness

Tasks:
- canonical;
- robots;
- sitemap;
- Product/ProductGroup/Offer where appropriate;
- URL registry/history;
- Shopify -> custom migration map;
- technical snapshots;
- basic TSEO incident rules.

### PHASE G7 — Production Analytics

Tasks:
- GA4 event contract;
- stable item_id;
- ecommerce events;
- commerce reconciliation;
- GSC verification/export;
- BigQuery enablement;
- marts.

Only here CPIM/GMEL become strongly useful.

### PHASE G8 — Growth Cases / Signals

Tasks:
- Signal Engine;
- Growth Case Registry;
- ownership;
- materiality;
- Owner Attention Queue;
- Growth Director views.

### PHASE G9 — Controlled Agent Execution

Goal: L2 autonomy.

Tasks:
- Execution Bundle;
- Execution Gateway;
- locks;
- approvals;
- idempotency;
- receipts;
- measurement loop.

Do not attempt before G3/G5/G7 are stable.

## 8. Immediate recommended next work

1. Do not build a new agent runtime.
2. DONE: inspect actual Supabase definitions for metric batches, SEO cleanup and snapshot pipeline.
3. DONE IN BRANCH: update Google Ads integration semantics for post-2026-09-09 Cloud Project access.
4. DONE: validate existing canonical keyword metric snapshot contract and add provenance/idempotency fields.
5. NEXT: controlled live API test on a very small metric batch.
6. AFTER LIVE TEST: extend /admin/seo-keywords with latest live metric status/provenance.

## 9. Current fit against canonical roles

| Role | Current implementation fit |
| --- | --- |
| Growth Director | DEFER — architecture only |
| OSPM | PARTIAL — keyword cleanup/admin exists |
| CPIM | DEFER — no production behavior/order history yet |
| GMEL | FOUNDATION ONLY — change measurement not implemented |
| SCO | PARTIAL — OpenAI integration exists, content workflow later |
| CQA | NEW — no independent QA gate yet |
| TSEO | PARTIAL — storefront foundation exists, SEO technical layer incomplete |
| GDAE | PARTIAL — integrations/batches exist, warehouse/marts missing |

## 10. Architectural conclusion

Current FEYA Commerce does not need a rebuild.

It already contains the beginning of the correct system:
- canonical product IDs;
- safe Supabase views;
- server-only service-role access;
- internal API auth;
- dry-run automations;
- keyword cleanup;
- metric request batches;
- Google Ads integration scaffold;
- admin review queues;
- SEO keyword cockpit seed;
- Product OS roadmap.

Correct implementation strategy:

formalize -> extend -> version -> measure

not:

replace -> rebuild -> create eight new services.


## 11. Implementation progress — 2026-09-18

### G0 — implementation mapping
STATUS: ACTIVE / CORE AUDIT COMPLETE

- actual GitHub application inspected;
- actual Supabase schema inspected directly;
- duplicate architecture avoided.

### G1 — Keyword Demand Foundation
STATUS: IMPLEMENTED IN DRAFT BRANCH / LIVE ACCESS TEST PENDING

Completed:
- reused existing snapshot layer;
- added API provenance and idempotency;
- Google Ads Cloud Project/OAuth access semantics;
- runtime default API v25;
- developer-token header removed after sunset;
- chunk-safe batch processing;
- bid currency context;
- existing metric validation/recommendation views preserved.

Remaining:
- controlled authenticated live API fetch once Cloud Project Keyword Planning access permits it.

### G2 — Product Builder Read-Only + Truth
STATUS: IMPLEMENTED IN DRAFT BRANCH

Completed:
- /admin/products/[id];
- existing safe Product Builder aggregate reused;
- identity/facts/configurations/prices/media/content/matching displayed;
- safe SEO brief readiness connected;
- restricted SEO Product Truth v4 intentionally not exposed through anonymous read client.

### Admin Auth Gate
STATUS: SCAFFOLDING IMPLEMENTED / ENFORCEMENT OFF

Completed:
- Supabase SSR auth;
- existing-user login only;
- no public signup;
- feature flag;
- server allowlist;
- logout;
- admin middleware.

Activation still requires explicit approved admin account allowlist.

### G3 — Controlled Editing + Version Ledger
STATUS: DATABASE FOUNDATION IMPLEMENTED / UI WRITE DISABLED

Completed:
- existing admin_review_events extended as server-only audit journal;
- generic entity version ledger created;
- content language surface_key versioning;
- atomic feya_fn_update_content_draft_v1;
- strict patch allowlist;
- mandatory reason;
- before/after snapshot;
- version chain;
- idempotency;
- rollback-only mutation test PASS;
- rollback-only idempotency test PASS.

No write route or edit form is enabled yet.

### G5 — SCO/CQA data foundation
STATUS: EXISTING FOUNDATION DISCOVERED

Existing feya_commerce_seo_pack_drafts_v1 already contains:
- Product Truth snapshot;
- keyword-role snapshot;
- agent input/output;
- validation snapshot;
- similarity snapshot;
- human review;
- publish guard;
- event history.

Future SCO/CQA work must extend this system rather than replace it.


### G4 — SEO Portfolio Bootstrap
STATUS: FOUNDATION IMPLEMENTED / CLUSTER REVIEW QUEUE NEXT

Completed:
- stable seo_page_id registry created;
- 243 current storefront product pages bootstrapped;
- 243 active URL-history rows created;
- all bootstrap product pages remain indexation_intent=candidate;
- no page was automatically promoted to indexable;
- Query Cluster Registry created but intentionally left empty;
- Query Cluster Members created but intentionally left empty;
- Page/Query Ownership map created but intentionally left empty;
- primary-owner uniqueness guard added by query cluster × market × locale;
- read-only safe SEO Portfolio view added;
- /admin/seo-portfolio added and linked from admin.

Verified bootstrap counts:
- seo_pages = 243
- url_history = 243
- query_clusters = 0
- cluster_members = 0
- page_query_ownership = 0

Applied Supabase migrations:
- 20260917235543 — feya_seo_portfolio_foundation_v1
- 20260917235623 — feya_seo_page_portfolio_safe_view_v1

Important:
The existing 1,918 keyword placement rows are not treated as canonical page ownership because some are explicitly deprecated and because keyword placement is not query-cluster ownership.

Next:
Create a reviewable semantic-clustering candidate queue. Candidate generation may use keyword master, axes/patterns, metrics and Product DNA as evidence, but it must not auto-create approved clusters or ownership.


### G4 — Query Cluster Review Queue
STATUS: IMPLEMENTED / APPROVED CLUSTERS STILL EMPTY

Applied:
- 20260917235944 — feya_query_cluster_review_queue_v1

Observed gating state:
- active keyword master rows = 458
- NEEDS_CLEANUP_REVIEW = 431
- NEEDS_CLEANUP = 27
- READY_FOR_SEMANTIC_CLUSTERING = 0

Implemented:
- deterministic safe review queue;
- explicit clustering lanes;
- cleanup/metric/membership gates;
- /admin/seo-clusters;
- no automatic query-cluster creation;
- no automatic ownership assignment.

This is the correct current state: semantic review is a real prerequisite, not something the system should fabricate.


### G6 — Technical SEO Production Readiness
STATUS: FOUNDATION IMPLEMENTED / LAUNCH OFF

Implemented in branch:
- global launch-safe metadata;
- public site URL configuration;
- admin noindex layout;
- robots.ts;
- portfolio-gated sitemap.ts;
- PDP canonical metadata;
- PDP robots gate;
- Open Graph/Twitter metadata;
- Product JSON-LD behind a separate feature flag and strict data-quality gate;
- docs/TSEO_SEARCH_LAUNCH_GATE_V1.md.

Hard safeguards:
- FEYA_SEARCH_INDEXING_ENABLED=false by default;
- current 243 product pages remain portfolio candidate, not indexable;
- global launch flag alone cannot index candidate PDPs;
- sitemap only includes portfolio rows explicitly marked indexable;
- ProductGroup/variant markup is deferred until real variant URL/model exists;
- fallback/range pricing is not pushed into simplified Product structured data.


### G7 — Production Analytics
STATUS: CONTRACT DEFINED / COLLECTION NOT ACTIVE

Audit found no current:
- GA4 instrumentation;
- GSC integration;
- BigQuery analytics export;
- authoritative completed-order system.

Added:
- docs/PRODUCTION_ANALYTICS_EVENT_CONTRACT_V1.md

Canonical future item_id:
canonical_product_id

Target ecommerce sequence:
view_item_list -> select_item -> view_item -> add_to_cart -> begin_checkout -> purchase -> refund

Current allowed implementation scope:
- contract/readiness only.

purchase/refund events remain prohibited until real commerce order/refund authority exists.

CPIM and GMEL production modes remain inactive until first-party production data exists.


### G5 — SCO / CQA Shadow Mode
STATUS: RUNNER IMPLEMENTED / FIRST LIVE DRY-RUN PENDING

Existing system reused:
- feya_commerce_seo_pack_drafts_v1
- feya_commerce_seo_pack_draft_events_v1
- feya_commerce_v_seo_pack_review_queue_v1

Observed active state:
- active drafts = 130
- openai_draft = 129
- human approved = 71
- ready_for_publish = 0
- independent CQA run count = 0

Applied Supabase migrations:
- 20260918081718 — feya_seo_pack_independent_cqa_gate_v1
- 20260918081947 — feya_seo_pack_cqa_event_type_v1
- 20260918082014 — feya_record_independent_cqa_result_rpc_v1

Independent CQA shadow classification:
- APPROVED_NEEDS_SIMILARITY_CHECK = 55
- READY_FOR_HUMAN_AND_CQA_REVIEW = 47
- READY_FOR_INDEPENDENT_CQA = 16
- NEEDS_PRECHECKS = 9
- REVISION_REQUIRED = 2
- BLOCKED_BY_VALIDATION = 1

Implemented:
- cqa_status/result/reviewer/policy/time fields;
- strengthened ready_for_publish database guard;
- cqa_checked audit event;
- atomic CQA result recorder with stale-state protection;
- rollback-only recorder validation PASS;
- /admin/content-qa safe read-only cockpit;
- /api/internal/content-qa independent runner;
- runner protected by FEYA_INTERNAL_API_TOKEN;
- dryRun=true by default;
- max batch = 5;
- compact independent review context;
- author agent input/reasoning excluded from CQA context;
- CI PASS;
- Vercel PASS.

Still intentionally blocked:
- no auto-publish;
- no strategy/keyword/page ownership mutations from CQA;
- no live CQA persistence before first authenticated dry-run is inspected.


### SCO Shadow Runner
STATUS: IMPLEMENTED / FIRST AUTHENTICATED DRY-RUN PENDING

New server-only route:
- POST /api/internal/sco-shadow

Selection:
- Content Brief Compiler can_generate_shadow=true;
- product has no active SEO pack draft;
- Product Truth v4 exists.

Current observed pool:
- 133 shadow-ready compiled briefs;
- 42 already have active SEO pack drafts;
- 91 have no active draft and are eligible candidates;
- canonical-ready briefs = 0.

Safety:
- FEYA_INTERNAL_API_TOKEN required;
- dryRun=true by default;
- default batch=2;
- max batch=3;
- per-draft generation_run_id;
- proposal hash;
- deterministic validation before persistence;
- blocked proposals are not recorded;
- no page intent/query ownership mutation;
- no publishing;
- newly recorded shadow drafts begin with prechecks/CQA not completed.

Database:
- 20260918083810 — feya_sco_shadow_draft_foundation_v1
- 20260918083850 — fix_sco_shadow_draft_product_slug_v1

Validation:
- rollback-only create PASS;
- rollback cleanliness PASS;
- generation-run idempotency PASS;
- first typecheck defect fixed;
- second typecheck defect fixed;
- final GitHub CI PASS;
- final Vercel PASS.

Business Truth:
- 20260918082819 — feya_business_truth_registry_v1
- CQA receives only ACTIVE scoped Business Truth.
- Returns policy remains REVIEW_REQUIRED and is excluded from AI context.

Content Brief Compiler:
- 20260918083239 — feya_content_brief_compiler_shadow_v1
- total candidates=313
- shadow-ready=133
- canonical-ready=0
- with Business Truth=313
- with stable SEO Page=239
- primary query ownership=0


### Deterministic Content Prechecks
STATUS: IMPLEMENTED / SHADOW DRAFTS ONLY

Applied Supabase migration:
- 20260918084759 — feya_content_prechecks_foundation_v1

Implemented:
- token_jaccard_v1 textual similarity precheck;
- Product Truth primary ALT exact-match precheck;
- preview RPC with no writes;
- apply RPC with atomic snapshot/event updates;
- internal protected runner /api/internal/content-prechecks;
- runner defaults to dryRun=true;
- runner only targets source_mode=growth_os_sco_shadow.

Similarity thresholds are data-derived from current FEYA drafts:
- p50 max similarity = 0.318
- p90 = 0.514
- p95 = 0.572
- max observed = 0.688
- pass < 0.50
- warning 0.50–<0.60
- review >= 0.60

Important:
Textual similarity is NOT called query cannibalization.
Query/page conflict remains owned by OSPM.

ALT policy:
- primary ALT must exactly reuse Product Truth primary_image_alt;
- if Product Truth has no primary_image_alt, SCO omits ALT candidate;
- empty SCO ALT candidates can pass because media ALT remains a separate task.

Rollback validation:
- old draft preview caught an ALT mismatch that legacy qa_self_report had marked pass;
- apply created exactly 2 events inside transaction and rolled back cleanly;
- end-to-end SCO -> prechecks -> CQA shadow test PASS;
- after passing prechecks, new draft state became READY_FOR_HUMAN_AND_CQA_REVIEW;
- cqa_status remained not_run;
- test drafts/events after rollback = 0.


### Action Capability / Metric Registry
STATUS: IMPLEMENTED

Applied Supabase migrations:
- 20260918085545 — feya_growth_registry_safe_views_v2
- 20260918085636 — feya_metric_registry_foundation_v1

Action Capability Map now distinguishes:
- dry-run agent-assisted actions;
- human-required actions;
- unavailable production actions;
- executor type;
- approval class;
- production-mutation boundary.

Current action states:
- AVAILABLE_WITH_LIMITATIONS = 6
- UNAVAILABLE = 3

Examples intentionally unavailable:
- PUBLISH_CONTENT
- CHANGE_PRICE
- UPDATE_CANONICAL

Metric Registry:
- AVAILABLE = 5
- AVAILABLE_WITH_LIMITATIONS = 1
- UNAVAILABLE = 8

Current operational values:
- SEO_PAGE_CANDIDATE_COUNT = 243
- QUERY_CLUSTER_READY_KEYWORD_COUNT = 0
- CONTENT_BRIEF_SHADOW_READY_COUNT = 133
- CONTENT_BRIEF_CANONICAL_READY_COUNT = 0
- CQA_READY_FOR_INDEPENDENT_COUNT = 16

Future GSC/GA4/Commerce metrics exist as definitions but remain UNAVAILABLE until their source systems exist.

Admin:
- /admin/metrics
- /admin/execution-map

### GMEL Measurement Spec Foundation
STATUS: SPEC/LOCK IMPLEMENTED / MEASUREMENT ENGINE UNAVAILABLE

Applied Supabase migration:
- 20260918085854 — feya_measurement_spec_registry_v1

Implemented:
- versioned Measurement Spec;
- measurement intent/mode/evidence ceiling;
- primary/guardrail/secondary/diagnostic metric roles;
- baseline/comparison/minimum useful effect;
- sample/stopping/window/segment/contamination/confounder fields;
- SHA-256 Measurement Spec Lock;
- trigger blocking material changes after lock;
- outcome registry foundation.

Rollback validation:
- lock created hash;
- material primary-metric mutation after lock was rejected;
- lifecycle LOCKED -> RUNNING remained allowed;
- test spec rows after rollback = 0.

Capability state:
- MEASUREMENT_SPEC_REGISTRY = AVAILABLE_WITH_LIMITATIONS
- MEASUREMENT_ENGINE = UNAVAILABLE

Reason:
GA4/GSC/Commerce analytical datasets are not active yet. Growth OS does not fabricate outcomes.


### Launch Readiness / Admin Data Boundary
STATUS: IMPLEMENTED / HARDENING PENDING

Applied Supabase migrations:
- 20260918090226 — feya_launch_readiness_gate_v1
- 20260918090634 — feya_launch_readiness_admin_boundary_v2
- 20260918090751 — feya_admin_data_hardening_rpc_v1

Launch Readiness scopes:
- PUBLIC_SITE = BLOCKED
- SEARCH_INDEXING = BLOCKED
- COMMERCE = BLOCKED
- MEASUREMENT = BLOCKED

Current hard blockers include:
- production domain not connected in Vercel;
- admin auth not enforced;
- internal admin views still browser-readable;
- no ACTIVE return-policy Business Truth;
- zero indexable SEO Portfolio pages;
- zero primary query/page ownership rows;
- zero ready_for_publish drafts;
- GA4 unavailable;
- GSC Bulk Export unavailable;
- Measurement Engine unavailable;
- real checkout unavailable;
- authoritative completed-order truth unavailable.

Verified current Vercel state:
- project=feya-commerce
- live=false
- domains contain vercel.app hosts only
- zofeya.com not attached

Admin data hardening:
- all admin pages now use getAdminReadClient()
- auth OFF -> current anon safe-view preview
- auth ON -> server-only service-role reads
- 24 allowlisted internal/admin views currently retain anon/authenticated SELECT
- hardening RPC exists but has NOT been executed
- hardening requires exact confirmation phrase and service role
- storefront API views are excluded from the hardening allowlist

Current capability:
ADMIN_DATA_BOUNDARY = AVAILABLE_WITH_LIMITATIONS
implementation_state=conditional_server_read_ready_anon_grants_pending

Hardening must occur only after:
1. approved admin account allowlist
2. FEYA_ADMIN_AUTH_REQUIRED=true
3. login/logout verified
4. unauthorized user blocked
5. protected server reads verified


### Pre-launch Signal / Objective / Handoff Core
STATUS: DATABASE FOUNDATION IMPLEMENTED / AUTOMATIC ORCHESTRATION OFF

Signal Engine:
- 19 real pre-launch signal candidates at implementation audit
- 9 P1 / 9 P2 / 1 P3
- no automatic Growth Case creation

Case Admission preview:
- CASE_CANDIDATE = 7
- OWNER_ATTENTION = 3
- WORK_QUEUE = 4
- DEFER = 4
- MONITOR = 1

Explicit admission RPC:
- CASE only for CASE_CANDIDATE
- OWNER_ATTENTION only for OWNER_ATTENTION
- DEFER/MONITOR/WORK_QUEUE cannot be force-promoted
- rollback idempotency/dedup tests PASS

Growth Case lifecycle:
- guarded status transitions
- expected status + expected ownership epoch required
- idempotent event history
- rollback lifecycle test PASS

Growth Objective Registry:
- no ACTIVE objectives currently
- feasibility can be analyzed by system/agent
- activation requires FEASIBLE/PARTIAL plus real human user id
- rollback activation test PASS

Objective-aware signal behavior:
- with zero active objectives, Commerce/Measurement pre-launch gaps remain deferred
- rollback activation of a COMMERCE objective thawed Commerce implementation signal only
- Measurement remained deferred
- rollback left active_objectives=0

Durable Handoffs:
- modes SERVICE / COLLABORATION / FACILITATION
- structured question/evidence/facts/unknowns/output contract
- source must be current accountable domain
- ownership epoch guard
- default per-case budget=8
- duplicate suppression
- unchanged reverse-loop detection
- stale result after ownership change
- simple output schema validation
- no free-form agent chat loop

Automatic orchestration remains OFF.


## Current engineering checkpoint — 2026-09-18 late implementation wave

This section supersedes older "next focus" notes where the corresponding foundation has already been implemented.

### What now exists beyond the earlier G0→G9 map

- durable Workflow Run/Event persistence exists; automatic worker/orchestration remains OFF;
- keyword-cleanup independent review foundation exists;
- semantic Query Cluster proposal + review/apply foundation exists;
- Page Ownership proposal/shortlist foundation exists;
- indexable-page eligibility/proposal foundation exists;
- Scenario Regression Registry + explicit run evidence exists;
- Source-of-Truth Registry + Data Source Health foundation exists;
- Incident + Change Freeze foundation exists;
- Execution Gateway request/receipt foundation exists, but no production dispatcher;
- Learning Registry + policy-adoption gate exists;
- Experiment Registry + contamination/change-event linkage exists;
- versioned Growth Strategy + Initiative foundation exists;
- event/opportunity registry exists;
- Role Activation Gate exists;
- Stabilization Window Gate exists;
- AI runtime token/latency usage metering exists.

### Current live-state counts

- Growth Cases: **0**
- active Growth Objectives: **0**
- active Growth Strategies: **0**
- Initiatives: **0**
- Opportunities: **0**
- Workflow Runs: **0**
- Execution Requests: **0**
- Experiments: **0**
- metered live AI invocations: **0**
- role runtime state: **5 SHADOW / 3 INACTIVE / 0 ACTIVE**

These zeros are intentional PRE_LAUNCH state, not missing seed data. Do not create synthetic business activity just to populate the system.

### Regression state

Latest Scenario Registry readiness:

- PASS: **10**
- WARN: **2**
- NOT_RUN: **3**
- FAIL: **0**
- ERROR: **0**
- CRITICAL not PASS: **2**
- registry release state: **BLOCKED**

Do not convert WARN/NOT_RUN into PASS without executing the invariant with real evidence.

### Admin boundary correction

The original hardening RPC used a fixed list of 24 internal views. Implementation continued after that migration, so the static list became stale.

It is now registry-backed:

- governed admin read surfaces: **38**
- anon-readable now: **38**
- authenticated-readable now: **38**
- hardening action: **NOT EXECUTED**

This is intentional until protected admin auth, owner allowlist and server-side reads are verified. The hardening RPC now iterates the registry and refuses empty/missing registry state, preventing a false "hardened" result on only a partial list.

### AI cost / token discipline

Private ledger:

- `feya_growth_ai_invocations_v1`
- `feya_fn_record_ai_invocation_v1`
- `feya_commerce_v_ai_usage_daily_v1`

Instrumented current OpenAI runners:

- keyword cleanup;
- independent CQA;
- SCO shadow;
- keyword cleanup review;
- query-cluster proposals;
- page-ownership proposals.

Rules:

- no prompt/response content in the usage ledger;
- provider token usage + latency only;
- current model output caps are **not** reduced blindly before real measurements;
- no hard-coded dollar estimate without versioned model-pricing truth;
- no autonomous budget limit;
- `AI_BUDGET_GATE = UNAVAILABLE / owner_policy_not_defined`;
- Human Owner owns any future monetary limit.

See `docs/AI_RUNTIME_COST_DISCIPLINE_V1.md`.

### Remaining real blockers before public/operational behavior

Still do not bypass:

1. protected admin auth + verified owner allowlist + explicit admin hardening;
2. public domain/Vercel attachment and launch verification;
3. ACTIVE Business Truth required for customer-facing policy claims;
4. SEO Page Portfolio / query-cluster / page-ownership review where still unresolved;
5. Google Ads Keyword Planning access after external verification/access is available;
6. GA4 production instrumentation and trusted commerce/order truth;
7. GSC after the public site is live/verified;
8. scenario gaps that genuinely require those missing sources;
9. Measurement Engine promotion only after real datasets exist.

### Engineering rule from this checkpoint

Do not keep adding foundations merely because a canonical noun exists.

Next work must close a real blocker, improve measurable reliability/cost, or connect a foundation to real data. Otherwise DEFER.
