# C4.3-E15 — manual repair schema applied and exact request prepared

25 September 2026.

This checkpoint advances the two-product manual lane to the same authority boundary as the 205-product clean baseline: **everything deterministic is prepared; execution waits for the Human Owner.**

## Production schema

Exact head `b4d6119001b0c955368cd0ac0339d28f259377db` completed FEYA validation run **36160404427 SUCCESS** and Vercel SUCCESS.

Applied only:

`supabase/migrations/20260925193000_manual_configuration_binding_repair_v1.sql`

Supabase recorded it as remote migration:

`20260925162857 — manual_configuration_binding_repair_v1`

No variant, quote, offer, payment or indexing migration was bundled.

## Postflight

PASS:

- exact evidence function present;
- exact executor present;
- service role can read evidence and execute an approved repair;
- anon/authenticated cannot execute;
- one active `REPAIR_MANUAL_CONFIGURATION_BINDINGS` capability;
- security/performance advisors reported no finding tied to the new repair functions.

The production evidence remained exactly:

- 6 price rows;
- 3 current sellable configurations;
- SHA `19a84d86e52724753350d3c12d22ded4e6e19a0ab2c0dedb36a292a481e502ae`;
- commercial values unchanged;
- price-review statuses unchanged.

So the schema apply itself caused no business-data mutation.

## Agent preparation

The system created one idempotent Execution Request:

- ID: `3181a279-3f98-4faf-874f-788d20d8731a`
- Code: `EXE-20260925-162953-DE63C1`
- Action: `REPAIR_MANUAL_CONFIGURATION_BINDINGS`
- Status: `APPROVAL_REQUIRED`
- Requester: `agent`
- Human requester ID: none
- Request hash: `f5a54a543e518215ada01a71319d92dfbaa1d3ac7b8f5585152601feecb2f98e`

It has:

- no approval hash;
- no approved human user;
- zero execution receipts.

The evidence after request creation is still the same 6/3/SHA snapshot.

## Current authority boundary

There are now two production requests waiting at the same human boundary:

1. clean-source baseline — 205 products / 850 price rows;
2. manual-lane structural repair — 2 products / 6 price rows.

Neither has been executed.

The next operation requiring actual authority is not more data engineering. It is an authenticated allowlisted Human Owner approval through the step-up path. After that, execution remains a separate call and must still pass exact evidence revalidation.
