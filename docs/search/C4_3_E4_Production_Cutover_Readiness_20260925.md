# C4.3-E4 — production cutover readiness package

25 September 2026.

This package does **not** perform the production cutover. It defines the smallest safe production change, the binary gates that must pass before owner approval, and the stop/rollback sequence.

## Current production state

Read-only production checks on project `ysnizcgzhdwdfdkjkhud` show:

- no Supabase migration with version >= 24 September 2026 is recorded;
- C4.1 variant tables are absent;
- C4.3 quote tables are absent;
- C4.3 offer tables are absent;
- C4.3-E2 baseline preview/executor functions are absent;
- the existing Growth OS Execution Request and Owner Approval core functions are present.

The clean launch lane still resolves to **205 products / 850 price rows / 0 hold / 0 already-ready** with exact evidence SHA-256:

`500c7c18cca25ecee33adb399dfa2380042ed4946775ef95c64f727a8e8e5c6f`

Therefore the current blocker is **deployment/authorization**, not missing price data.

## Minimal production change

For the price-baseline cutover, apply **only**:

`supabase/migrations/20260925170000_price_baseline_adoption_v1.sql`

Do **not** bundle the variant, quote or offer migrations into the same production window. They are separate commerce gates and increase blast radius without being required to move the 205 clean-source products from draft review state to approved price governance.

This means the production sequence is intentionally:

**price-governance schema → exact preview → owner approval → price-governance execution → postflight**

and only later:

**variant → offer → server quote → cart/order/payment**.

## Binary GO / STOP gate

Production execution is **STOP** unless every condition below is true:

1. PR exact head has green CI and Vercel.
2. Target migration `20260925170000` is not already present.
3. Schema migration applies successfully with no unrelated migration bundled.
4. After schema apply, anon/authenticated cannot execute the baseline executor; service role can.
5. Action capability is present exactly once and remains limited to price-baseline adoption.
6. Dedicated application flag starts **OFF**.
7. Owner authentication, allowlist, service-role executor and global owner-actions switch are verified ready.
8. With the dedicated flag enabled, GET preview returns exactly **205 candidates / 850 rows / 0 hold / 0 already-ready**.
9. Preview evidence hash equals `500c7c18cca25ecee33adb399dfa2380042ed4946775ef95c64f727a8e8e5c6f`.
10. The two manual-override products are absent from the clean batch.
11. Payment, order creation, offer promotion and indexing remain OFF.

Any mismatch is STOP. Do not “fix forward” by weakening the gate.

## Feature-flag sequence

The production feature sequence must be:

1. Apply schema while `FEYA_COMMERCE_PRICE_BASELINE_ADOPTION_ENABLED=false`.
2. Run schema postflight.
3. Verify the owner-action auth/allowlist/service-role boundary. Current connector visibility did not expose the relevant Vercel env values, so this gate is **UNKNOWN / blocking** until verified.
4. Temporarily set `FEYA_COMMERCE_PRICE_BASELINE_ADOPTION_ENABLED=true` only for the controlled owner review window.
5. Prepare exact batch. This must perform no governance mutation.
6. Human owner approves the generated Execution Request.
7. Execute once and require a `SUCCEEDED` Execution Receipt.
8. Re-run quote-readiness counts.
9. Set `FEYA_COMMERCE_PRICE_BASELINE_ADOPTION_ENABLED=false` again after the one-time adoption.

The global owner-actions switch should not be enabled merely for this cutover unless the rest of the protected owner-action surface is already ready.

## Expected post-execution result

For the clean lane:

- 205 products remain the same identities;
- 850 configuration-price rows retain the same IDs, source/public amounts, currencies and provenance bindings;
- those 850 rows become `review_status='approved'`, `price_status='approved'`;
- associated public/non-sampler sellable configurations become `review_status='approved'`;
- strict price-governance readiness becomes **850 / 850**;
- manual-override products remain outside this batch;
- no active offer is created;
- no order/payment/indexing is enabled.

## Backup / rollback policy

This cutover changes governance statuses only; it does not rewrite amounts. Before execution, preserve:

- exact evidence SHA;
- exact 205 product IDs;
- exact 850 row IDs;
- pre-cutover review/status values;
- Execution Request hash.

If the schema itself causes a problem before any owner execution, disable/revoke the new executor using `supabase/rollback/price_baseline_adoption_v1_disable.sql`.

After a successful owner execution, do **not** silently mass-revert statuses. A business rollback must be an explicit compensating Execution Request with its own evidence and audit trail. Immutable request/receipt/change history stays intact.

## Prepared operator artifacts

- `supabase/preflight/price_baseline_adoption_preflight_v1.sql` — read-only pre-schema checks.
- `supabase/postflight/price_baseline_adoption_schema_postflight_v1.sql` — read-only checks immediately after schema apply.
- `docs/search/price-baseline-production-cutover-readiness-20260925.json` — machine-readable gate state.

Current overall state: **HOLD_NOT_AUTHORIZED**. The package is ready; production mutation is not authorized by this checkpoint.
