# C4.3-E13 — protected two-product repair workflow

25 September 2026.

The structural repair from E12 now has the same protected application boundary as the clean-price baseline workflow.

New protected endpoints:

- `/api/admin/review/prices/manual-configuration-repair`
- `/api/admin/review/prices/manual-configuration-repair/approval`

They are admitted by the narrow owner-action step-up allowlist only.

The flow is:

**exact evidence → prepare Execution Request → human approval → separate execute call**

The server never accepts replacement prices or arbitrary configuration IDs from the browser. It is hard-bound to:

- the two known manual-lane product IDs;
- six known price rows;
- expected three-current / six-target configuration shape;
- evidence SHA `19a84d86e52724753350d3c12d22ded4e6e19a0ab2c0dedb36a292a481e502ae`.

Default feature flag:

`FEYA_COMMERCE_MANUAL_CONFIGURATION_REPAIR_ENABLED=false`

The step-up runtime test now verifies that both price-baseline and manual-repair endpoints require an authenticated owner, while unrelated preview writes remain locked.

This package still performs no production repair and no human approval.
