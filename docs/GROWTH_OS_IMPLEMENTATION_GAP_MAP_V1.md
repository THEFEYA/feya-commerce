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
