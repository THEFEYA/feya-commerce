# FEYA — agent entrypoint and continuation protocol

This file is an **operational index, not a new MASTER, agent passport, or permission grant**.

## Before doing any FEYA work
1. Read current `main` HEAD, the repository `docs/00_START_HERE.md`, and GitHub **issue #145**: "TheFEYA Growth OS live operations — canonical execution tracker". Use the newest verified checkpoint, not the last assistant's claim.
2. Read the relevant canonical owner-approved FEYA Growth OS role passports / Interaction Map / Core, and the current Storefront, Search & Performance MASTER. If they are not available in this repo, retrieve their authoritative copies rather than making a new substitute.
3. Check open/draft PRs and latest tested deploys, and **read actual linked Supabase state** when a task concerns runtime/data. A doc or passing scenario alone does not mean live automation is activated.
4. Choose the first open stage/gate from issue #145 that materially contributes to the current owner objective. Record assumptions and blockers; avoid redoing finished stages.

## Identity and frozen requirements
- Owner conversation: **Russian**; public storefront: **English**; admin: **Russian**.
- `THEFEYA/feya-commerce` is the primary commerce codebase. `/admin/company` is the Growth OS owner-facing surface; Product OS/SEO workspaces must be reused, never replaced.
- Respect frozen owner-approved **207 PDP descriptions, V13 presentation, Product Truth/DNA, live Search Release v12**, existing prices, variants, shipping and payment activation gates. No "helpful" regeneration or broad refactor.
- One shared Supabase project is acceptable for now, **but namespace labels never substitute for RLS, least privilege, typed authority and careful source separation**. Do not allocate paid services or move data without measured justification.
- Old pilot sales/real-estate/warehouse scheduling is **paused** unless owner authorizes reactivation. Do not delete business records without verified recoverable archive + exact manifest + review.

## Real work and resumable agents
- Eight canonical logical roles do not equal eight parallel 24/7 paid LLM instances.
- Runtime truth: existing Growth Case, Workflow Runs/Events, Handoffs, Role Activation, Scenario, Approvals/Owner Attention, AI invocation ledger and Execution Gateway. Inspect and **reuse**, not reimplement.
- For every task persist `case_id`, `workflow_run_id`, `ownership_epoch`, `role/passport/policy version`, source/evidence references + freshness/hash, decision/QA receipts, `current_step_code`, current action state, retry/wake/lease and **next step**. Serialize *compact, minimal* facts, never complete chat transcripts, untrusted external instructions or secrets.
- Event transitions are truthful: a transient model answer is not a completed DB action; a successful SQL rollback test is not a running AI employee; a UI animation is not proof of server work.
- Never mutate production through agent narration. Exact-scope owner approval, domain QA, Version/Execution Gateway, preflight and rollback reference apply. Keep API/model budgets disabled unless specifically authorised.

## Cross-chat restart and final response protocol
At start of a new chat, if owner says "продолжай TheFEYA", identify issue #145 / its successor and find:
(a) latest verified code + DB state; (b) current stage; (c) last safe checkpoint/receipt; (d) first actionable unfinished step; (e) any owner decision.
If earlier agent stopped mid-job, resume from durable run/checkpoint, not from imagined hidden chat context. If the issue is stale, refresh from source before acting.

After every substantive action update **issue #145** (or its documented successor) with:
- DONE / VERIFIED / BLOCKED / NEXT and exact PR/commit/run references
- What *actually* changed versus mere proposal/simulation
- Tests and evidence, potential costs and rollbacks
- Single next owner action, or **"от владельца сейчас ничего не требуется"**.
Speak to the owner in compact Russian, emphasizing results and next steps. Links are for audit, not a substitute for explanation.

## Current runtime rollout
The subordinate implementation plan is `docs/owner/THEFEYA_GROWTH_OS_RUNTIME_ACTIVATION_20261015.md` (introduced as draft PR #144). Plan: preserve baseline/security boundary -> one real **non-destructive** owner-initiated shadow work item -> durable resume/retry QA -> owner-visible results -> bounded schedules when analytics/commerce are proven -> optional animated avatar / flow graph. This is **not** license to delay storefront/SellerOnline release for an aesthetic office.

**Never add a new permanent role or workflow without a demonstrable unmet case, tested contracts and owner-aligned decision.**
