# TheFEYA — multi-domain data boundaries & Growth OS rollout

**Owner clarification:** 2026-10-17. **Status:** verified, owner-facing architecture supplement / dependency plan. **No permission to run destructive migrations, activate legacy collectors or publish commerce/AI changes.**  
**Authority:** official platform and current data truth > canonical Growth OS v1.0 role passports + Decision & Interaction Map > TheFEYA Storefront/Search/Performance MASTER Phase 13 > later owner-approved amendments. GitHub [#145](https://github.com/THEFEYA/feya-commerce/issues/145) remains the single operating tracker; [#166](https://github.com/THEFEYA/feya-commerce/issues/166) is the scoped P0 security workstream.

## 1. The owner's business topology

- **ACTIVE PRIORITY: TheFEYA storefront + Product OS + SEO + Growth OS**, including an eventual verified checkout and real conversion measurement. Reuse `THEFEYA/feya-commerce`, existing `/admin/company`, approved designs and authoritative Product Truth.
- **PAUSED/RETAINED: legacy FEYA Sales/CRM and costume business prospecting; real estate/relocation initiatives, including older geographic experiments; warehouse/equipment and older collection, portraits/classification/digest pipelines.** Keep these as independent business contexts, never as fabricated measurements for TheFEYA Commerce.
- **FUTURE PORTFOLIO OWNER VIEW:** may show each domain's own health, cases, permissions, source/AI budget and next decision through a *read-only aggregated control plane*, not by granting every agent access to every dataset. No new owner UI or autonomous team is justified merely by displaying avatars.
- **One logic ≠ one physical agent or database.** Canonical 8 Growth OS roles currently belong to the TheFEYA Commerce mission; adapting the same contracts for an unrelated line of business would need explicit domain identity, separate policy, case/approval/evidence namespaces and budget.

## 2. Verified physical baseline at this checkpoint

- The connected account exposes **one Supabase project** (`FEYA's Project`, ref `ysnizcgzhdwdfdkjkhud`, Postgres 17), database size about **304 MB**. The described business divisions are currently **logical/schematic**, not two independent physical Supabase projects.
- Existing namespaces include mixed `public` (about 217 MB of relevant relation storage), `feya_sales` (about 31 MB), `kz_warehouse` (about 11 MB) and a small `office` schema. The `public` schema contains both modern Commerce/Growth tables and several older families. A string prefix or schema name **is not an authorization boundary**.
- Current Growth OS has **8 logical registered roles**, **2 OPEN real cases**, **2 completed TSEO workflows and TSEO→GMEL handoffs**, but **no proven full experiment→measurement→learning production cycle**, no AI API invocations/spend budget and no working 24/7 agent swarm.
- **All 12 historic Supabase pg_cron jobs are inactive.** The separate Vercel GSC schedule is not permission to restart them. The first independent daily GSC receipt is still due for verification after Oct 18 local noon window.
- New `feya_growth_*` data and critical mutation RPCs follow reviewed private/service roles. Legacy access gates are **not uniformly safe** and need dependency-informed repair in #166; details of unpatched objects belong in the owner's private security audit, **not this public document**.
- No read-only connector currently proves a restorable owner backup/PITR point, or which optional custom schemas are enabled in the Supabase Data API. **Do not claim recovery is tested, or schema exposure is fully known**, from DB grants alone.

## 3. Intended ownership and boundaries

| Business scope | Operational owner / record | Data policy | Runtime policy |
|---|---|---|---|
| `THEFEYA_COMMERCE` | `feya-commerce`; canonical Product/SEO/Growth registries and approved server-only views | Real products, prices, copy, orders and analytics must come from their individual authorities; never infer sales from old lead data | Active development; public mutation exclusively through approved Gateway + Human Owner |
| `LEGACY_FEYA_SALES` | Existing historical Ops/CRM code and tables | Preserve source and contact records with lawful-purpose access, minimization and explicit retention | Paused; no newly enabled lead collection, messaging or model jobs |
| `REAL_ESTATE_RELOCATION` | Existing historical realty datasets/services | Independent data, geography, customer context and measurement; never shared as Commerce evidence | Paused; no live collector or cross-domain handoff |
| `WAREHOUSE_EQUIPMENT` | Existing warehouse namespace/workflows | Inventory/fleet/equipment truth separate from unverified storefront stock promises | Paused |
| `PORTFOLIO_OWNER_CONTROL` | Existing owner identity and narrow read projections | Safe aggregates only: business scope, freshness, permitted actions, audit receipts and spend | Owner-led, no cross-business write grant and no second Growth OS clone |

At case/worker boundaries, specify a `business_scope` and source/provenance using **existing, versioned** case `entity_scope_json` / `state_json` where policy permits. Do not invent a new column or silently rewrite older cases. Domain-specific source evidence, hashed approvals, ownership epochs, leases, idempotency keys, and execution receipts remain mandatory. No domain can reuse another domain's consent, RLS policy, pricing authorization, publisher scope or AI budget.

**Future physical split decision:** keep the current single project until measured reasons justify an additional one: independent teams/tenant trust boundaries, privacy/data residency obligations, sustained DB resource contention, independent RPO/RTO, cost or owner-approved isolation. A split must have an exact source/export manifest, destination parity, client cutover plan, controlled credential rotation, dual-read verification and rollback. Never rename or drop live relations merely to make architecture diagrams cleaner.

## 4. Safety-first Stage A — independent of storefront work

1. **Recoverability:** owner verifies the actual Supabase Dashboard backup status, restore date/window, Storage-object backup needs and, if appropriate, performs a scoped logical export/test restore without overwriting Production. `ACTIVE_HEALTHY` is not a backup receipt. No paid PITR/branch/add-on without cost approval.
2. **Consumers:** inventory each old Vercel/GitHub client, Edge Function and external integration; record exact authenticated role and dataset accessed. One old FEYA Ops codebase already demonstrably shares the database. Absence of code search hits is not proof of no consumer.
3. **Permissions:** inventory exposed schemas, `USAGE`, table/column/sequence privileges, RLS and routines. A positive grant does not prove a Data API endpoint is exposed; a missing log mention does not prove no historical use. Preserve currently approved storefront and privileged Growth routes.
4. **Bounded changes:** only after contract/backup/compatibility checks, stage isolated least-privilege migrations with exact positive/negative role tests, reversible grants, separate owner review and Postgres/Vercel smoke. Do not blanket-toggle schemas or reactivate anything.
5. **Records:** classify source vs derived vs transient/PII/consent-bound; preserve raw historical provenance and approvals. No `DELETE`, partition archival move, VACUUM FULL or data migration until retention, recoverability and business purpose are verified.

Supabase reference: [RLS & grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [custom schema exposure](https://supabase.com/docs/guides/api/using-custom-schemas), [database backup/restore](https://supabase.com/docs/guides/platform/backups).

## 5. TheFEYA Growth OS operational proof before visual agent office

**A — Guard baseline (in progress):** real dependency/backup evidence, roles and source-health, 207 owner-approved PDP/ACTIVE Search v12/V13 safety, paused legacy jobs.

**B — One genuine case (already partially verified):** real TSEO indexability cases, persisted workflow events and two bounded TSEO→GMEL handoffs. *Completed step is not a closed Growth Case.* Next proof must connect one actual owner-reviewed cross-role decision to independent QA and an honest owner next action.

**C — Durable resumability (partially implemented):** the existing safe bound workflow claim/completion and lease/epoch RPCs exist. Validate restart, duplicate, stale lease, cancellation, owner WAITING and no-write cases against a real scope. Do not add a second orchestrator or eight always-running processes.

**D — Independent QA & outcome (not proven):** verify role accountability, `OSPM → SCO → CQA` when a real content change is separately approved; GMEL only on measured evidence. If no actionable signal, produce `NOT_OBSERVABLE` / `DEFER`, not a new fake Growth Case.

**E — Bounded schedule/AI (gated):** official GSC daily receipt, proper production GA4 with consent, commerce truth, materiality thresholds and explicit model+budget admission. No paid LLM without owner consent and no autonomous price/SEO/indexation mutations.

**F — UI/mission control (HOLD until truthful C/D event stream):** reuse `/admin/company` and historical draft PR #149 as visual exploration, not backend. Real role/status/lease/handoff/event timeline first; optional avatars, pulse or graph later. No fake percentages or activity and no public V13 redesign.

## 6. Four-week checkpoint proposal (dependencies, not delivery promises)

| Time window | Main evidence | Parallel business track |
|---|---|---|
| Oct 17–24 | Stage A inventory, backup/restore proof, scoped ACL dependency matrix | Verify Oct 18 first actual GSC Cron receipt and keep Shop/SEO regression green |
| Oct 24–31 | Reviewed reversible permissions test candidate and real workflow restart/owner next-step receipt | Confirm GA4 history de-dup, privacy controller and consent readiness |
| Oct 31–Nov 7 | Complete independent QA/owner decision on one real non-destructive case; assess budgets only if trustworthy data exists | Seller Online technical review, carrier quote/rate approval and guest-order sandbox if provider ready |
| Nov 7–14 | Evaluate status-driven Mission Control read-only UI, *not* automatic LLM fleet | Measure first real funnel/CWV/GSC events and prioritize based on observed source maturity |

External Seller Online approval and data/consent conditions may shift the schedule. No fictitious completed orders, traffic uplift, SEO outcomes or user traffic; no mass Wave B indexation. **The website launch and checkout readiness continue independently of cosmetics for agent avatars.**

## 7. Freeze, accountability, handoff

- **FROZEN**: existing 207 original approved PDP descriptions and section order, Product Truth/DNA, V13 public visuals, price/configuration truth, Search Release v12 (18 index-allowed, 207 PDP noindex), shipping terms and code-only GA4 binding with live collection OFF.
- **PAUSED**: all historical prospecting/sales/realty/warehouse collectors, mail digests and Supabase pg_cron; old data not counted as TheFEYA organic, GA4 or purchases.
- **NEVER WITHOUT PROOF**: destructive data cleanup, public GRANT broadening, production table/role migrations, paid API calls, change of merchant/provider/legal truth or unsupported payment/index claims.
- **Single tracker**: issue #145; scoped security #166. At each release: exact `main`+Production SHA, DB receipt, CI/Preview result, rollback, what's DONE vs OBSERVED vs BLOCKED, and one next owner action.
- **Current owner action:** none needed to commit this non-executable architecture. Exact permission remediation, restore verification or paid services require their own future review.

This document records the owner's clarified long-term data intent; it does **not** change the canonical eight passports or give any role new privileges.
