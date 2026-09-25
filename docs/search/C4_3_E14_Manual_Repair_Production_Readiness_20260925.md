# C4.3-E14 — manual-lane production schema readiness

25 September 2026.

The two remaining launch products are held by a **configuration identity problem**, not by missing price values.

A fresh read-only production preflight confirms:

- six price rows still exist;
- only three sellable configurations currently exist across the two products;
- exact evidence SHA remains `19a84d86e52724753350d3c12d22ded4e6e19a0ab2c0dedb36a292a481e502ae`;
- none of the three proposed new sellable-configuration IDs exist;
- no conflicting `female_outfit`, `skirt` or `full_set` normalized key exists in those products;
- the E12 evidence/executor functions are absent;
- no active `REPAIR_MANUAL_CONFIGURATION_BINDINGS` capability exists;
- the migration has not been applied.

Therefore the database state still matches the reviewed E11 repair plan exactly.

## Allowed next database step

After exact-head CI is fully green, it is safe to apply **schema only**:

`supabase/migrations/20260925193000_manual_configuration_binding_repair_v1.sql`

That schema does not itself rebind a configuration. It only installs:

- exact evidence reader;
- approval-gated executor;
- limited action capability.

After apply, run `supabase/postflight/manual_configuration_repair_schema_postflight_v1.sql` and stop again before creating/approving/executing a repair request if any result differs.

## Human authority boundary

The actual repair remains HUMAN_REQUIRED.

The system may prepare the exact request after schema postflight, but it must not approve or execute that request without an authenticated allowlisted human approval.

The repair itself changes no amount and no price-review state. It only separates six already-known price rows into six truthful sellable configuration identities.
