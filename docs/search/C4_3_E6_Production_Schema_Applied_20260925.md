# C4.3-E6 — production schema applied, execution still closed

25 September 2026.

This checkpoint completed the schema-only production action authorized by E5.

## Exact-head gate

Repository head before production apply:

`f9b51eb3cfee81bc1e8138aa5ae0b74d9106b8eb`

FEYA validation run **36152898672** completed **SUCCESS**. Vercel exact-head status was SUCCESS.

## Production action performed

Applied exactly one migration to Supabase project `ysnizcgzhdwdfdkjkhud`:

Repository file:
`supabase/migrations/20260925170000_price_baseline_adoption_v1.sql`

Supabase migration API recorded it remotely as:

`20260925153503 — price_baseline_adoption_v1`

The remote timestamp differs from the repository filename timestamp because the migration API assigns the remote version. For future drift checks, use the migration **name** plus the remote ledger mapping, not an equality check against the repository filename timestamp.

No other C4.1/C4.3 migration was bundled.

## Immediate postflight

PASS:

- baseline preview function present;
- baseline executor function present;
- service_role can preview;
- service_role can execute the approved executor;
- anon cannot execute;
- authenticated cannot execute;
- exactly one active `ADOPT_SOURCE_PRICE_BASELINE` capability;
- capability remains `AVAILABLE_WITH_LIMITATIONS / internal_price_baseline_adoption_only`;
- no advisor finding was returned for either new baseline function.

The exact production preview after schema apply remains:

- 205 clean-source candidate products;
- 850 candidate price rows;
- 0 hold;
- 0 already-ready;
- evidence SHA `500c7c18cca25ecee33adb399dfa2380042ed4946775ef95c64f727a8e8e5c6f`.

Therefore schema application caused no price-data drift.

## What was NOT executed

No Execution Request for the 205-product batch was created.
No human approval was recorded.
No baseline executor was run.
No price/configuration governance row was changed by the batch workflow.
No offer was promoted.
No order/payment/indexing capability was enabled.

## Remaining execution blocker

The application side is still not ready for a trustworthy human-owner execution:

- Vercel project reports `live=false`;
- no production-target deployment is detected;
- production owner-action environment values are not visible through the current connector;
- Supabase currently has two confirmed Auth users but **zero users with a recorded sign-in**;
- owner-action audit rows remain zero.

This confirms that the secure owner-action path has not actually been exercised yet.

Current state:

**database schema = APPLIED + postflight PASS**  
**205-product adoption execution = STOP**

The next useful engineering step is to resolve the owner-action authentication boundary without unnecessarily locking the read-only admin experience, then test the protected action path before any batch prepare.
