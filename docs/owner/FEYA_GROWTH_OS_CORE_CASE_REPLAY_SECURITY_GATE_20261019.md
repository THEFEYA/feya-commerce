# TheFEYA Growth OS Core — idempotency and null-CAS hardening (PROPOSED)

**Issue:** [#181](https://github.com/THEFEYA/feya-commerce/issues/181) · **MASTER:** [#145](https://github.com/THEFEYA/feya-commerce/issues/145) · **Dependent owner action:** [G2b PR #180](https://github.com/THEFEYA/feya-commerce/pull/180).

**Status:** DRAFT / GOVERNED PROPOSAL. No migration was executed against live Supabase. No current Case states, Product Truth, Search Release v12, storefront, budgets, model calls, customer data or auth grants have been changed.

## Root causes verified in live read-only pg_get_functiondef()

The canonical service-role-only function \`feya_fn_transition_growth_case_v1\` is responsible for the Case status FSM and immutable event. Two boundaries needed hardening:

1. On an idempotency-key hit, it returned a prior event **before** comparing current input target status, expected status, ownership epoch, actor ID/type or human-readable reason. Reuse of one key for a different intention could yield a false-positive response without executing the new action.
2. Historical \`IF v_case.case_status <> p_expected_status THEN\` and \`IF v_case.ownership_epoch <> p_expected_ownership_epoch THEN\` are SQL three-valued comparisons: when a supplied value is NULL, the IF condition evaluates UNKNOWN rather than TRUE. That is not a valid CAS. A missing actor type also must explicitly fail.

These issues do not prove that unauthorized Production changes occurred. Current records show two OPEN TSEO Cases and zero Core \`STATUS_TRANSITIONED\` events at the audit checkpoint.

## Exact changes

- ONE \`CREATE OR REPLACE\` for existing \`public.feya_fn_transition_growth_case_v1(uuid,text,integer,text,text,text,uuid,text)\`. Same return type, same original allowed FSM edges, same \`SECURITY DEFINER SET search_path TO ''\`, same service_role-only EXECUTE.
- Acquire per-Case \`FOR UPDATE\` lock before replay selection. Exact replay still returns the same old receipt even if the Case subsequently progressed; a **different request using the same key raises \`growth_case_idempotency_intent_mismatch\`**. Multiple historical events with the same key are quarantined via \`growth_case_idempotency_ambiguous_event\`.
- Compare both CAS fields with \`IS DISTINCT FROM\` and reject NULL actor types.
- Keep original \`p_idempotency_key=NULL\` compatibility (non-replay, still guarded by CAS).
- No table, index, workflow or role registry additions; no new model/API/payment/CRM paths.

## Test evidence and negative scenarios

The isolated \`tests/search-db/growth-case-transition-idempotency-intent.test.mjs\` builds its own empty fixture and supports PostgreSQL 17 native CI via \`FEYA_TEST_DATABASE_URL\` restricted to local host and \`/feya_test\`. It also supports PGlite locally. Tests include:

- service_role-only function ACL and stable signature;
- first OPEN→TRIAGED, exact retry: only one persisted event and same receipt;
- reuse of one key with different target/status/epoch/actor/reason: reject, no new writes;
- old exact replay after later unrelated Case advancement;
- stale status and stale ownership epoch under a new key;
- forbidden OPEN→CLOSED, OPEN→ACTIONING and other skipped stages;
- malformed NULL expected status/epoch/actor: reject;
- ambiguous historical duplicate-key events: reject;
- allowed BLOCKED→TRIAGED recovery remains functional;
- original system actor and NULL idempotency-key semantics preserved.

## Rollout and recovery gate

1. Review migration SQL against \`pg_get_functiondef\` and verify **exact expected function source**/signature and grants on the current production project. Confirm no other pending migration or competing Case mutation branch.
2. Run native PostgreSQL 17 regression + browser security checks, exact tested SHA, Vercel Preview READY, and preserve the 207 PDP/V13/Search v12 invariants.
3. **Before any Production migration:** capture the current function source, grants, dependency callers and a verified restoration plan in an owner-controlled secure location. Avoid reverting to the vulnerable function merely to undo a later unrelated feature; prefer a forward fix or, if required, freeze the G2b write capability and execute an owner-approved rollback.
4. Apply migration **only after separate explicit owner approval**. Use supported Supabase migration mechanism, no direct live test inserts, no broad grants. Verify \`anon/authenticated\` EXECUTE remain false and \`service_role\` remains true.
5. On Production, check unchanged Case/status/event counts and run SELECT-only health readback. For write-path assertions rely on native isolated PostgreSQL CI, not fabricated live Growth Cases. Start no agent, background Cron or payment.
6. If any preflight, CI, role grant, schema, Git SHA or owner auth proof drifts, fail closed and postpone. A future G2b real owner click requires **its own** explicit approval after release.

## Dependency management

G2b PR #180 already binds its human-case intent to a SHA fingerprint and validates an exact immutable event/current Case after Core RPC. This Core fix complements the G2b boundary and protects all present/future callers rather than duplicating the FSM. Merge order recommendation, once individually approved: **Core first**, then owner triage (both with separate release and auth gates). G2c independent QA and G2d locked technical measurement remain downstream; neither is represented as already executed.

**This document does not confer write or budget authority.**
