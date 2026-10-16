# TheFEYA Growth OS — GMEL atomic spending gate v1

Status: IMPLEMENTATION FOUNDATION / all model executions disabled until owner approval.

## Why

Extend canonical cases, roles, handoffs, workflows and usage metering. Do not create another AI office or pay for orchestration infrastructure. The existing personal ChatGPT/Claude subscriptions are separate from server-side API billing.

## Required owner approval (NOT GIVEN YET)

One explicit, audited owner action must define model provider, exact model, immutable price-contract version, input/output price per million tokens, total dollar cap, cap per model call, maximum input/output tokens, approval identity and expiration time. The new database migration inserts **zero approved policies** and does not enable a scheduled or manual model executor.

## Atomic PostgreSQL contracts

- feya_growth_ai_budget_policies_v1: private owner-authorised policies; RLS, no anon/auth grants, disabled unless explicitly enabled by the owner.
- feya_growth_ai_spend_reservations_v1: a cost reservation tied to one role-scoped GMEL handoff, open case, owner epoch, running workflow lease, worker identity, request hash and token ceilings.
- feya_fn_reserve_gmel_ai_spend_v1: lock policy, compute maximum possible USD cost and ensure concurrent reservations cannot exceed approved cap. Persist model/price-version/rates snapshot.
- feya_fn_submit_gmel_ai_spend_v1: only one real provider-send permission, guarded again by current case/role/lease/policy. A replay has may_call_provider=false.
- feya_fn_settle_gmel_ai_spend_v1: settle trusted token usage against snapshot pricing, or mark outcome UNCERTAIN and keep the entire reserved charge.
- feya_fn_release_unsent_gmel_ai_spend_v1: release ONLY when the provider request was definitely never submitted.

All functions are service_role-only. They create no provider requests or auto schedules. Do not expose the service-role key to browser agents.

## Future server worker order

1. Validate real meaningful new GMEL question and passport/role capability.
2. Validate GSC/GA4/orders source health and evidence freshness (not historical Search Release intent).
3. Claim exact handoff + workflow with correct epoch, lease and stop condition.
4. Verify auditable owner budget, versioned pricing and model token limits.
5. Atomically reserve cost and obtain one-time send permission.
6. Call provider with bounded payload, then validate schema and record provider usage.
7. Settle bill, record invocation in existing ledger, attach verified receipt and complete canonical handoff.
8. Treat ambiguous provider outcomes as blocked, not automatic free retries; retain the reserved worst-case charge.

A successful SQL simulation does NOT mean autonomous model work or measured business uplift. Do not label missing GSC/GA4/order data as zero results.

## Deployment and acceptance

Isolated PostgreSQL 17/PGlite tests cover no-policy denial, grants, nonce replay, one-time submit, frozen price settlement, uncertain outcome, role revocation, expired lease and definitely-unsent cancellation. A separate guarded owner UI must be completed before any policy is enabled. Do not touch approved 207 PDP descriptions, Search v12, V13, checkout or the 12 old paused Cron jobs.

Current execution tracker: GitHub issue #145. This document is subordinate to approved MASTER and eight canonical passports.