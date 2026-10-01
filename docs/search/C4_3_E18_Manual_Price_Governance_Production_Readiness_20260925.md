# C4.3-E18 — production readiness for post-repair manual price governance

25 September 2026.

E16 is safe to install as **schema only** once the exact repository head is green.

Current production still has the structural repair request `3181a279-3f98-4faf-874f-788d20d8731a` in `APPROVAL_REQUIRED`, with no approval hash and zero receipts. The manual lane therefore remains at six price rows / three collapsed configurations.

The E16 schema is intentionally inert in that state. Its evidence reader may exist, but its executor cannot become eligible until the E12 repair has actually produced the six expected sellable configuration identities.

## Current preflight

PASS:

- E16 evidence function absent;
- E16 executor absent;
- migration name `manual_price_lane_governance_v1` absent;
- active E16 capability rows = 0;
- E12 repair request still pending human approval;
- E12 evidence remains SHA `19a84d86e52724753350d3c12d22ded4e6e19a0ab2c0dedb36a292a481e502ae`;
- no repair receipt exists.

## Allowed engineering progression

After exact-head CI is fully green, applying only:

`supabase/migrations/20260925200000_manual_price_lane_governance_v1.sql`

is a schema-only operation. It does not alter a price, configuration binding, review state, offer, order, payment state or index state.

Immediately afterward run the prepared postflight. If the structural repair is still pending, governance evidence must remain **not candidate**. That is expected and is a safety property, not a failure.

No E16 Execution Request should be prepared until the E12 repair has a real human approval and a SUCCEEDED receipt.
