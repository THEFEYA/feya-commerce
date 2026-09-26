# C4.3-E5 — schema-only production decision

25 September 2026.

This checkpoint makes the promised binary decision for the **one migration only** production step. It does not apply that migration.

## Decision

**Schema-only migration: GO_PENDING_EXPLICIT_APPLY**

Allowed scope:

`supabase/migrations/20260925170000_price_baseline_adoption_v1.sql`

Everything after schema creation remains **STOP**:

- batch prepare — STOP;
- owner approval — STOP;
- batch execution — STOP;
- variant/offer/quote cutover — STOP;
- payment — STOP;
- indexing — STOP.

No production mutation was performed in this checkpoint.

## Why schema-only reached GO

All conditions that matter to a schema-only apply are now independently true:

1. Exact head `633c2bedcb0a44254fdbe76fca5416447ad0b0a3` completed FEYA validation run **36151129057 SUCCESS** with all 14 jobs green.
2. Exact-head Vercel build is SUCCESS.
3. The launch-scale isolated rehearsal proved **205 clean products / 850 price rows** can move through the baseline workflow with commercial values unchanged.
4. Production still resolves to **205 candidates / 850 rows / 0 hold / 0 already-ready**.
5. Production evidence SHA is still:
   `500c7c18cca25ecee33adb399dfa2380042ed4946775ef95c64f727a8e8e5c6f`
6. Migration `20260925170000` is not recorded in production.
7. The baseline preview/executor functions are absent, so this is a clean first apply rather than a conflicting re-apply.
8. Existing Execution Request and Owner Approval Core functions are present.

## Why execution remains STOP

The Vercel project reports:

- `live=false`;
- latest deployments have `target=null`;
- no production-target deployment was detected.

The current Vercel connector also does not expose the relevant owner-action environment values. Therefore we cannot yet prove:

- mandatory owner auth is active in the eventual production target;
- the owner allowlist is correct;
- `FEYA_OWNER_ACTIONS_ENABLED` has the intended production value;
- `FEYA_COMMERCE_PRICE_BASELINE_ADOPTION_ENABLED` begins false in the eventual production target.

This does **not** block adding the inert database schema by itself, because there is currently no live production application route to invoke it. It **does** block prepare/approval/execution.

## Production apply rule

When an explicit production schema apply is authorized, apply only the one migration above.

Immediately after apply:

1. Run `supabase/postflight/price_baseline_adoption_schema_postflight_v1.sql`.
2. Require preview/executor functions to exist.
3. Require service role execute permission and anon/authenticated denial.
4. Require exactly one active `ADOPT_SOURCE_PRICE_BASELINE` capability.
5. Leave the application feature flag disabled.
6. Recompute the 205/850 production evidence and compare its SHA with the checkpoint hash.
7. If any result differs, disable the executor and stop.

Do not apply variant, quote or offer migrations in the same change.

## Current state

The engineering decision is now unambiguous:

**database schema only = GO, but not yet executed; business/data adoption = STOP until owner-action production environment is proven.**
