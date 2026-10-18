# FEYA Growth OS — Engineering Gap Register, Tracing и Release Gates v1.0 (DRAFT)

**Фиксация:** 2026-10-18; read-only live Supabase inspection + GitHub main 7d9ab6de... .  
**Нормативный источник:** оригинальные FEYA CANONICAL v1.0 и TARGET_OPERATING_BLUEPRINT в этом PR.  
**Определение статуса:** DONE_VERIFIED (проверено точным фактом), PARTIAL (фундамент, ограниченный scope), DATA_BLOCKED, AUTH_BLOCKED, EXTERNAL_BLOCKED, DESIGN_ONLY, NOT_BUILT, DEFERRED, STALE_REGISTRY. Нельзя пометить «сделано» по одному зелёному Preview или пройденной симуляции.

## 1. Live baseline / no invented capabilities

| Источник / сущность | Фактически в Production | Вывод |
| --- | --- | --- |
| GitHub | main 7d9ab6deaa3f1ca19cc57b2b43db70acc9a99911, PR #174 visual Mission Control merged | read-only UI projection DONE, operator/agent runtime не становится автономным |
| Product Truth | 207 approved bindings, active Search v12 | frozen; immutable reference for all content proposals |
| Growth Case | 2 cases, оба OPEN / TSEO | real persisted cases, Case CLOSED пока нет |
| Workflows | 2 runs / 6 events, technical step COMPLETE | not independent GMEL / not Case complete |
| Handoffs | 2 TSEO→GMEL | 1 deterministic SQL, 1 operator-assisted, no autonomous model execution |
| Owner Attention | 3 records, genuine TSEO L0 decision RESOLVED with audit event | owner decision gate реально работает scoped, но case state does not advance itself |
| Agent Role Activation | 5 SHADOW + 3 INACTIVE; registry updated Sep18 | permission/current-process state needs revalidation; 8 ≠ 8 constantly RUNNING |
| AI Model budget/usage | 0 budget policies / 0 invocation ledger rows | no unattended paid reasoning authorized |
| Metrics | 14 registry metrics, many UNAVAILABLE, old source implementation notes | definitions are not trusted fresh values |
| Objectives/initiatives/opportunities | 0 / 0 / 0 | growth portfolio stage not live |
| Measurement specs/outcomes | 0 / 0 | no verified measured outcomes, experimentation cannot claim win |
| Experiments / learnings | 0 / 0 | no organizational autonomy learning yet |
| Registry | 64 actions, 59 capabilities, 14 metrics, 52 policies, 10 sources | substantial foundation; many implementation_state entries Sep18 stale |
| GSC | 3 immutable receipts incl. official daily; canonical source health still UNAVAILABLE/UNKNOWN at Sep18 | first provenance, not fully promoted measurements |
| GA4 / orders / revenue | canonical effective states UNAVAILABLE/UNKNOWN | no funnel-to-purchase, ROI or contribution proof |
| Storefront payments | Seller Online custom-site pending technical approval | no purchasable production payment activation |
| Postgres Cron | 12 paused legacy jobs, 0 active | KEEP OFF until explicit approved isolation |
| Release safety | V13 and 207 copy pinned; active Search v12 18 indexable routes | protected acceptance gate |
| Backup/security | free-tier runbook prepared, actual restore not proven | before privilege / deletion / automation expansion |

These numbers are current snapshots, not immutable commitments. Every future work session re-queries owners of authority. Source Registry may disagree with actual recent GSC: classify STALE_REGISTRY, do not blindly overwrite statuses.

## 2. Capability traceability — process → data → owner → screen → gap → gate

| Work/owner request | Required data / existing state | Accountable + reviewer | Owner UX | Current gap → first safe move | Gate |
| --- | --- | --- | --- | --- | --- |
| «Что сейчас важнее всего?» | goals, cases, measures, capacity; no objectives or outcomes | Director + Human | Сегодня, Командный центр | define owner objective; no AI prioritization based on absent revenue | G0/G2 |
| «Найди недоиспользованные поисковые темы» | canonical page ownership, GSC qualified, Keyword Planner | OSPM + GMEL | Рост / спрос / SEO-портфель | source-health promotion + eligibility/demand marts | G1 |
| «Проверь индексирование» | Search v12 intended, HTTP/crawl, Google URL Inspection samples | TSEO + OSPM | Работа/Комната TSEO | source-specific observed/Google-known adapters; protect noindex | G1/G2 |
| «Создай описание» | frozen Truth, approved brief, keyword role, template | SCO → CQA | Product OS / SEO Studio | identify exact eligible draft + action contract, never rewrite approved 207 | G2/G3 |
| «Проверь текст перед публикацией» | proposal hash, Product Truth, CQA independent context | CQA | Комната CQA | guarded pass/revision policy + execution bundle, no self-review | G2/G3 |
| «Почему товар не продаётся?» | exposure, consent-aware GA4, completed orders, refunds | CPIM + GMEL | Рост / Товары / Результаты | DATA_BLOCKED → show NO_DATA; later commerce mart | G1/G3 |
| «Повышается ли конверсия?» | validated numerator/denominator, baseline, tracking/version | GMEL + GDAE | Результаты / Эксперименты | no measured spec/outcome; define versioned spec and sample policies | G1/G3 |
| «После правки стало лучше?» | execution receipt/version, qualified comparable metrics | GMEL | Кейс → Измерение | lock spec before change, false-causality/seasonality test | G3 |
| «Что можно автоматизировать?» | repeated distinct cases, decision receipts, measured outcomes | Core + GMEL + Director | Система / Learning / policy review | no learned examples; create policy candidates only after legitimate evidence | G4/G5 |
| «Где сейчас агент?» | case/run/events/lease/role registry | Core | Mission Control | no live autonomous actor; status read-only/replay, later lease truth adapter | G2/G6 |
| «Пришли недельный отчёт» | authorized KPIs, completed cases, source health | Director/GMEL with Core | Сегодня / Результаты | report must show missingness and NO_DATA, not fabricate commercial uplift | G1/G3 |
| «Подключи оплату и оцени доход» | Seller Online accepted, verified order+refund ledger | Human + CPIM/GDAE | Коммерция / Checkout | EXTERNAL_BLOCKED; no payment flags or fake GA4 purchases | parallel Commerce |
| «Действуй за меня в безопасных мелочах» | stable decision pattern+versions+budget+policy | Human authorizes Core | Система / Делегирование | L3 limited action allowlist absent; cannot infer blanket agency | G4/G5 |

## 3. P0 blockers to completing one Swiss-watch case

**GAP-001 — Source registry out of sync with real receipts.** GSC L0 exists but old Organic Search metrics registry reports gsc_not_configured/UNAVAILABLE. Build read-only reconciling evidence view and policy-defined freshness (do not UPDATE all rows) then versioned source promotion with validation/owner authority. Tests: late partition, missing dates, GSC 0 vs missing, source age and wrong property.

**GAP-002 — End-to-end measurable scope absent.** All 0 specs/outcomes. Implement one non-destructive measurement_spec for TSEO technical health *only if source & metric available*, with bounded window, source refs and NO_DATA state; before-commerce first project objective could be availability/index technical quality, not sales claims.

**GAP-003 — Case QA/outcome FSM incomplete.** Owner Attention RESOLVED while original Case OPEN (valid). Need exact lifecycle proposal for TRIAGED → INVESTIGATING → DECISION_READY ... with independent evidence, CAS epoch, idempotent result and owner/scope decisions. NEVER direct OPEN→CLOSED. Current workflow worker truth separate from CQA. Use existing Core functions and test signatures before adding narrow endpoint.

**GAP-004 — Durable unattended agent not demonstrated.** Current actions claim workflow primitive without worker. Define one always-resumable bounded executor with case/run lease, allowed action, retry/error cap, state_json output schema; start on explicit owner task or approved source event, never periodic invented AI work. Require duplicate/restart/expiry/stale epoch/incomplete receipt tests and Kill Switch. No Trigger.dev/Temporal migration until observed need.

**GAP-005 — Capability and role registry stale.** Sep18 role/metric flags conflict with later verified Vercel/GSC facts. Decouple last-written timestamp from latest independently observed capability proof; grey UNKNOWN when no proof. No role auto-activation from 'AVAILABLE' registry metadata.

**GAP-006 — Decision->Learning not connected.** Recording one user choice is useful but not proof repeated successful results. Build evidence join proposal: case fingerprint / approved decision / execution hash / outcome_spec / guardrails / comparable context / negative examples. Evidence Registry → Learning Registry → POLICY_CANDIDATE through exact approval, then scoped shadow test. Do not build policy adoption UI with enabled buttons until source valid.

**GAP-007 — Merchant and analytics prerequisites.** Seller Online pending; delivery approval & verified carrier method not complete; GA4 consent controller and page-history dedup unverified; keep GA4 purchase and ROI disabled. Shipping €19/€35 + remote +€20 / extra packaging €5 (owner policies) remain governed logic, NOT payable quote without carrier/source review.

**GAP-008 — Security and backup independence.** Shared Supabase with paused legacy businesses; one privileged owner service endpoint may reach older data. Audit RLS/view grants/SECURITY DEFINER and tests, actual backup+sample restore/provenance before any destructive cleanup or broad privileges. Do not auto-install additional infra.

**GAP-009 — Visual not yet functional terminal.** Mission Control v0 is read-only Graph/Office/Replay on six owner-safe projections. Need drilldown and case-graph/provenance, but no fake clickable actions, percentages or "all agents online". Tie every CTA to validated capability and source. Graphical link ≠ executed handoff.

**GAP-010 — Owner reports/priority policy not institutionalized.** KPI registry contains 14 metric definitions, business KPIs not approved targets; no structured weekly executive scorecard. Define metric authority and business guardrail before dashboard; interpret “nothing measurable yet” as valuable operational truth.

**GAP-011 — Attribution/Identity lineage.** Product Truth IDs, Search page IDs, ads and orders may be mismapped; a product can have multiple option/size/set variants and discount/region confounders. Add tested entity mapping and historical version continuity before SKU-level learning.

**GAP-012 — Cost, quota and alert fatigue.** Models can be called only after owner-defined role/action/day budgets, failure reconciliation and price catalog versions. Unknown provider prices/credits → DENY; duplicate retry must not create two billable/commerce side effects. Suppress irrelevant P3 and stale alerts; important risk must still surface.

## 4. No data → first data → operational → maturity transitions

**Stage A / Cold Start:** enabled: page truth, approved Product facts, Search v12, technical HTTP/crawl, manual-case + independent owner decision, user-declared business goals, data-quality failure alerts. Disabled: conversion rates, ROAS, “winner” labels and causal experiments. UI shows “Что можем узнать сейчас” plus precise prerequisites.

**Stage B / Qualified source:** when source identity, consent, freshness, sample and lineage are proven, start bounded GSC OSPM monitors and *eligible* GA4 funnel counters (not pretending 100% coverage). Suggested changes remain L1, with two-person independent QA before publish.

**Stage C / Real order:** once Seller Online signed payment, webhook signature, order identity and refund reconciliation pass, CPIM may classify demand/exposure vs purchase and GMEL can lock meaningful specs; do not use Etsy/legacy shop events as new store revenue.

**Stage D / Measurable learning:** after one real scoped execution+measurement window, outcomes classified with uncertainty; learnings require independent replication and negative evidence. Small traffic → often INCONCLUSIVE.

**Stage E / Limited delegated autonomy:** adopt only low-risk exact action class after owner policy and mature outcomes; interrupts, budgets and rollback mandatory; significant pricing/design/URL/indexing/marketing spend stays human.

## 5. Data model: reuse map, missing fields identified by tests, not guesses

- Case/Workflow/Events/Handoffs in canonical public.feya_growth_*; do NOT create new cases table for office rooms.
- Action registry 64 definitions, capability 59, metric 14, policy 52, source 10; several stale as-of Sep18. A proposed list of actions is not proof implemented.
- Existing measurement_specs_v1 already has primary_metric_code, guardrails, cohorts, comparison, minimum effect, window, contamination, evidence_ceiling, spec_hash, locked_at. Build actual validator and immutable use, not duplicate experiment table.
- Existing measurement_outcomes_v1 has spec_hash, version, primary/guardrail result and evidence level. Dry-run read now, no speculative INSERT to create “portfolio success”.
- Learning Registry has evidence count/distinct_context_count, candidate policy and adoption fields; reuse to implement repeated-decision promotion with policy gate.
- Owner Attention has dedup, audit and strict owner auth; use existing decision receipts and avoid separate “super approval” prompts.
- Future required linkages: source receipt watermark/coverage per metric, case-to-initiative/measurement/outcome exact refs, execution receipt to deployed version and rollback, owner decision to policy candidate; implement as validated payload/ref or schema migration only once queries/scale justify new columns.

## 6. UI action readiness states (required independent of appearance)

For every CTA:
- Source: action_code + current role + case/approval scope + intended subject/version.
- READY = verified capability freshness, actor permission, approved action class, known input and correct case state.
- NEEDS_OWNER = exact business decision, display clear consequence, alternative, expiry.
- MISSING_DATA = list missing sources/what will become possible.
- NOT_IMPLEMENTED = no endpoint; show prospective feature text, **no clickable button**.
- BLOCKED = deterministic veto with proof (protected winner, stale case, cost, policy).
- STALE = re-query and revalidate snapshot before action; no optimistic “applied” view without receipt.
- EXECUTING = lease/run ID, not “AI online” status badge.
- FAILED/RETRYABLE = explain rollback/idempotency and who can intervene.
- COMPLETE = event/receipt; only source-attested stage, not the entire business case automatically.

Graph edge styles: *possible permitted handoff* dotted static, *persisted handoff* solid dated, *current RUNNING lease* subtle animation with TTL and circuit stop, *historical replay* explicit replay color and timestamp, *blocked* dashed + message, *owner decision* gold via audit. No synthetic handoffs caused by hover.

## 7. Risk-weighted acceptance suite (proposed regression names)

| ID | Scenario | Expected invariant |
| --- | --- | --- |
| SC01 | No GA4/Commerce | order conversion=UNKNOWN, no fake low-conversion signal |
| SC02 | Late/revised GSC daily receipt | changed overlapping days reconciled; missing ≠ zero |
| SC03 | GSC endpoint swapped to legacy property | source identity mismatch blocks promotion |
| SC04 | Search v12 / live canonical drift | TSEO diagnosis, no automatic robots rewrite |
| SC05 | Product DNA says no holographic but SCO adds holographic | CQA BLOCKER |
| SC06 | Full Set copy loses component specificity | CQA content revision |
| SC07 | Existing winner shows transient traffic dip | protected_winner NO_CHANGE/measure before edit |
| SC08 | Low exposure / one order | don't label validated commercial winner |
| SC09 | Traffic rises, refunds rise more | GMEL MIXED/guardrail; Director not false win |
| SC10 | High impressions / low orders with consent gaps | insufficient coverage; CPIM hypothesis, not price change |
| SC11 | Duplicate owner button click | same Attention/Decision; no duplicate audits |
| SC12 | Stale ownership_epoch handoff arrives | quarantine, never changes current case |
| SC13 | Owner confirms internal L0 only | Attention resolved, Growth Case OPEN; no fake independent model |
| SC14 | Model provider timeout | bounded retry, no double charge/duplicate actions |
| SC15 | Worker dies between action and receipt | reconcile by idempotency key, no blind rerun |
| SC16 | Case waiting on owner over deadline | durable queue/expiry, safe wake/escalation |
| SC17 | Unauthorized client or expired JWT | 401/403; no hidden model call or service_role exposure |
| SC18 | Prompt injection in external page/keyword | treat as data, strip instructions, no privilege escalation |
| SC19 | Product/price change on old approved version | version/hash conflict and request re-review |
| SC20 | Metric primary chosen after seeing result | lock invalid; cannot claim L3/L4 |
| SC21 | Consent declined / history tracking duplicates | no optional analytics script; no duplicate pageview |
| SC22 | GA4 purchase received without confirmed Seller Online order | quarantine / no revenue |
| SC23 | Duplicate transaction/refund | count distinct signed order/refund idempotency |
| SC24 | Customer country unsupported by verified carrier | checkout preflight blocked, no invented ETA |
| SC25 | Read-only agent screen with no events | static UNKNOWN status; no animations of work |
| SC26 | Agent case technically COMPLETE but case OPEN | show two distinct states |
| SC27 | Same owner choice in multiple contexts, mixed outcomes | policy candidate not autopromoted |
| SC28 | High spend request without Budget Policy | DENY, Owner Attention not silent LLM call |
| SC29 | Old business pilot Cron unintentionally activated | release fails safety gate |
| SC30 | Data replay/rollout after new code version | deterministic idempotent history; previous receipts immutable |
| SC31 | Mobile zoom/pan + keyboard/reduced motion | fully usable no accessibility trap |
| SC32 | Search/Shop UX mutation side effect | exact 207 Product Truth + V13 + active Search v12 CI guards |
| SC33 | Client shows editable capability but backend disallows | button disabled with reason, no write |
| SC34 | Claim semantic CQA independence but same model state author | independent context verification rejects |
| SC35 | Source registry stale relative to GSC receipts | owner sees STALE_REGISTRY not green healthy |

Tests must be bound to fixture provenance and CI; no test is counted PASS unless an executable/assertion exists. The checklist above is **proposed acceptance suite**, not a statement they passed.

## 8. Incremental engineering PR plan (no broad rollout)

1. **DOC-SPEC (this PR):** target blueprint + role jobs + this gap and acceptance register + Claude independent review. No runtime changes, no production deploy.
2. **GAP-005/GAP-001:** source/capability observed status reconciler with read-only contract, timestamps and exact data health reason; safe production admin only.
3. **GAP-003/GAP-004:** one real bounded Case workflow from OPEN into allowed intermediate state with correct evidence, independent reviewer, human choice and CAS; replay/retry/race tests.
4. **GAP-002:** one user-approved measurable initiative and locked spec (subject technical/search-only until commerce authority).
5. **GAP-009:** Mission Control room, role job summaries, event/case route, help/recommendation state from current registry; no fake buttons, animations after real stage.
6. **GAP-006:** post-outcome learning/policy review. Grant no L3 autonomy without owner evidence.
7. **Parallel external:** Seller Online+shipping+checkout, GA4 controller/consent, GSC source maturity, CWV field evidence, privacy/security/recovery. Any blocker holds only the dependent branch.

## 9. Release authority / Definition of Done

For every PR record:
- which stage and gap IDs; expected exact files/data; NO CHANGE for public product/SEO, or explicitly authorized affected scope;
- source evidence/snapshot and who approved business target;
- failure injection/retry/owner permissions/privacy/budget tests;
- exact tested git SHA, GH Actions 26/26, matching Vercel Preview READY; guarded Product 207 and Search v12/CWV/checkout invariants;
- post-merge Production revision SHA, authenticated owner surface check as available, no new runtime errors;
- actual DB receipts and next owner action; roll back by revert exact PR or schema-approved replay.
- if no proof, status PENDING/NOT_OBSERVABLE (not “almost done”/fake done).

## 10. First proposed deliverables for independent Claude audit

Read ALL original twelve FEYA CANONICAL Growth OS artifacts (Architecture, Core, eight role passports, Decision Interaction Map, Implementation Prerequisites) plus MASTER and the four docs in this PR. Return: invariant conflicts; missing prerequisite; dead-end state edge; unauthorized action path; bad KPI formula; false source authority; poor UX action mapping; proposed tests with exact fail condition. No edits to Production or second architecture without agreement. See independent review brief.

**Versioning:** Next accepted revision is v1.1, with numbered ADR/decision diffs and link to approved source; keep this v1.0 candidate as audit trail. Not a new canonical master.
