# TheFEYA Growth OS — Runtime Activation Checkpoint
**Date:** 2026-10-15  
**Status:** IMPLEMENTATION PLAN / NO AUTONOMOUS EXECUTION AUTHORISED  
**Primary source:** existing FEYA Growth OS v1.0 CANONICAL role passports, Growth OS Core, Interaction Map, Implementation Prerequisites and the current Storefront/Search MASTER.  
**Governance:** subordinate to current owner-approved Search Release v12, Phase 13 mainline, Product Truth / Product DNA, 207 pinned PDP copies and frozen V13 visuals.

## Decision (owner direction, 2026-10-15)
**Do not build a second Growth OS or buy more infrastructure by default.**
- Reuse **THEFEYA/feya-commerce** and its existing **/admin/company** owner surface. The Product OS, public storefront and existing SEO Studio remain separate *workspaces inside the same product*, not competing sources of truth.
- Reuse **the existing Supabase/Postgres project**, using canonical prefixed identities, server-side privileged paths, RLS, restricted grants and safe read projections. Logical naming is not a security boundary. No new paid Supabase project, warehouse or agent microservices merely for the concept.
- Reuse the existing **cases, workflows, workflow events, durable handoffs, role activation, Owner Attention, approvals, execution receipts, scenario tests and model-usage ledger**. Do not duplicate these registries.
- Supabase Cron plus bounded server/Edge workers is the **default scheduling path**, conditional on execution constraints. It does not imply that old paused jobs should resume. A separate durable worker/Trigger.dev is **HOLD** until a real case proves necessary; n8n and the Pixel Office runtime are not dependencies.
- All eight passports remain **logical roles**, not eight continuously consuming AI processes. Run a role only on admissible, meaningful work.
- Data retrieval and deterministic validation precede any paid reasoning. ChatGPT/Codex/Claude interactive subscriptions are primarily owner/development tools; unattended API usage is a **separately budgeted capability**, currently not enabled by this plan.
- Frontend design for agent avatars, animated handoffs or draggable graph starts only after there is a real event stream to represent. No fake live presence, percentage or success state.
- Legacy sales, real-estate and warehouse pilots remain paused. They are not baseline evidence for the public TheFEYA store. Retain source code and approved business decisions. Archived data must be recoverable.

## Read-only verified live baseline
Evidence date: 2026-10-15, GitHub main + linked Supabase project (FEYA's Project).
- Main commit at audit: `09b32043afcf941f4b1a8348c149a6655a05f712` (Phase13 P0B: 207 exact pinned owner-approved PDP descriptions, V13 protected; payments not activated; noindex constraints preserved).
- DB: **0 live Growth Cases, 0 handoffs, 0 workflow runs, 0 workflow events, 0 AI invocation records** in corresponding canonical tables. Role activation registry: **8 roles** (some SHADOW, some INACTIVE). Scenario runs: **24 stored**; the scenario release view reports PASS on the then-listed active scenarios. A passing scenario is not proof of an active production agent.
- DB: previously active **12 legacy cron jobs paused**; at audit **0 active cron jobs**. Do not reactivate them.
- The base has historically mixed legacy sales / real-estate data with FEYA Commerce tables. Database size approx. **304 MB**. Separate future access by permissions and product prefixes; migration to dedicated paid projects remains a future measurement-based decision.
- **Security blocker:** legacy API-accessible table permissions/RLS and several older privileged database surfaces need a scoped review. Do not grant broad anon/auth access, expose raw personal data, or assume name prefixes alone provide isolation. Do not rewrite public data-access rules without a compatibility test and rollback plan.
- Source of truth for analytics is not yet proven end-to-end: GSC, GA4, payments and commerce event reconciliation must be checked live before decisions on organic conversion or sales.

## Runtime architecture / the smallest correct executable organism
1. **Owner UI** `/admin/company` -> authenticated commands, approval queue, actual work, role state and event timeline; existing Product OS screens remain unchanged.
2. **Control Plane** = current Supabase Growth Case, workflow, role, handoff and event registries. Persist owner, versions, locks, evidence links, retry/wait status and immutable approval/receipt snapshots. **Never rely on a long-running chat as the sole memory.**
3. **Dispatcher** = deterministic code: classifies new signal/manual request, admission materiality, role capabilities, ownership_epoch, existing result cache, budgets and authorization; then creates/reuses an idempotent workflow step.
4. **Executor** = narrowly permitted server worker that leases an eligible step, reads a compact `resume_packet` (case/run, passport_version, master/policy_versions, evidence hash, completed-step receipts and outstanding question), performs one bounded action, validates output, writes a receipt/event and releases or extends the lease. No concurrent worker can silently own the same step. Stale ownership_epoch results are recorded but cannot mutate the current case.
5. **Model Adapter** only for semantic analysis; chooses provider/model by quality evidence and owner-defined spend policy. No invented prices, no unlimited subscription-based background automation, no silent model downgrade.
6. **Execution Gateway** is the sole path for mutations to Product Truth, SEO copy, page ownership, price, site routes or indexation. Exact-scope owner approval, policy and hash match, preflight, receipt and rollback reference are required; agent output alone never authorises publication.
7. **Visibility** from persisted events (QUEUED / RUNNING / WAITING / BLOCKED / REVIEW / COMPLETE / ERROR), not animations or free-form narration. Alerts surface only important owner decisions and incidents.

### Minimal handoff contract
Each work item needs the canonical `case_id`, `workflow_run_id`, `current_step_code`, `current_accountable_domain`, `ownership_epoch`, `idempotency_key`, `passport/policy version ref`, evidence source/ref/hash, required output contract, `wake_at/lease`, last-error and result/QA reference. Use already present DB fields where possible; keep any missing step metadata in versioned, validated `state_json` until an identified query/performance need justifies a migration. Never serialize entire conversation transcripts or credentials as agent memory.

## Stage gates and acceptance
| Gate | What gets done | Exit evidence | May touch production? |
| --- | --- | --- | --- |
| **A. Protect baseline** | Verify legacy paused state; audit auth/RLS/grants and schema isolation; review old lead-data backup/archive plan; verify pinned PDP/V13/SEO invariants; inspect source readiness | Exact-head CI + DB inventory + identified security findings/remediation with rollback | **No commerce mutation** |
| **B. Prove one real work item** | Manually open a genuine, attributable `Growth Case` or readiness incident from live data; persist provenance, accountable role, handoff, owner-facing result in **SHADOW** | A real case, event and readable owner report; repeat command creates no duplicate; missing data yields NOT_OBSERVABLE | **No** |
| **C. Make it resumable** | Add the smallest durable dispatcher/worker (if currently missing), step lease, bounded retries, wake-up and recovery; validate output schema, stale epoch, failure and cancellation | Tests for restart, duplicate, stale result, approval wait, timeout, quota outage; durable final checkpoint | **No** |
| **D. Close independent QA loop** | Run applicable OSPM/TSEO/CPIM analysis, GMEL evidence check and CQA for publishable content; one decision object, one accountable owner, explicit escalation | Independent review receipt, truthful WAITING_OWNER / REJECTED / APPROVED statuses | **Only already approved controlled paths** |
| **E. Activate modest schedules** | After payments, GSC/GA4 and accurate source freshness are verified, collect data at source-appropriate cadence; call AI only when material evidence changes | Measured false-alarm rate, usefulness, spend, run duration and data freshness; owner-approved budgets | **No autonomous content/pricing writes** |
| **F. Owner visual office** | Extend existing `/admin/company/work` with real role/step statuses, then an optional lightweight avatar view and React Flow graph. UI writes route through guarded actions and must validate graph edits | Owner can see work, blocker, evidence, costs, ask for change and review result without raw SQL | **Subject to role/action gates** |

**Scope boundary:** SellerOnline/payment connection, public shop/index readiness, approved SEO and Phase13 go forward on their own release track. Growth OS cannot block commerce launch merely to polish avatar graphics.

## First implementation batch (next)
1. **Security + legacy cleanup preflight:** make a private, recoverable, verified backup strategy; protect explicitly reviewed/qualified sales contacts, outcomes, tokens/linked records. No bulk DELETE or uncontrolled CASCADE. Quantify reclaimable table/index bloat; use approved maintenance window. Check public API exposure for legacy tables, repair with rollback after impact test.
2. **Contract-to-code audit:** map all 8 passport capabilities to real DB functions/views and server endpoints; distinguish AVAILABLE, SHADOW, LOCKED, NOT_OBSERVABLE and IMPLEMENTATION_REQUIRED. Flag zero-run status honestly.
3. **One end-to-end manual SHADOW scenario:** owner submits a small real request -> deterministic admission -> persisted case/run -> bounded role analysis -> independent QA -> Owner Attention -> close without production change. Do not use mock progress or fake customers.
4. **Then** durable recovery, budget guard and reliable background eligibility; do not enable automatic paid models until owner budget and provider capability are documented.
5. **Then** owner visual cards/workflow graph. Every animation must be a projection of canonical event state.

## Negative rules / no scope drift
- Do **not** edit 207 pinned PDP copies, approved Product Truth / variants, V13 visual appearance, Search Release v12, payment flags or customer checkout as part of this runtime track.
- Do **not** reactivate old event/lead/real-estate crons, expose secrets in GitHub, or link untrusted external content to tool instructions.
- Do **not** provision paid services, build a second agent office, add new autonomous roles, or infer that a completed chat equals completed code.
- Do **not** delete old pilot data until a verified recoverable archive and exact deletion manifests pass owner review.
- After each change publish checkpoint: **what changed, where, exact commit/PR, tests, blockers, next owner action**.

## References
- `docs/GROWTH_OS_IMPLEMENTATION_GAP_MAP_V1.md` — historical implementation map; must be interpreted against this live checkpoint.
- `docs/GROWTH_CASE_CORE_V1.md`, `docs/DURABLE_HANDOFF_REGISTRY_V1.md`, `docs/AI_RUNTIME_COST_DISCIPLINE_V1.md`, `docs/OWNER_FUNCTIONAL_COVERAGE_2026-09-20.md`.
- Existing canonical eight role passports and MASTER Storefront/Search/Performance Architecture have priority over this checklist.