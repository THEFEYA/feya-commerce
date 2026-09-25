# C4.3-E12 — controlled two-product configuration identity repair

25 September 2026.

This package implements, but does not apply to production, the exact structural repair identified in E11.

It is intentionally narrow:

- product `057fbd51…`: separate Male Outfit and Female Outfit while preserving the existing owner Full Set;
- product `5602d557…`: separate Skirt, Top + Shoulders and Full Set.

The executor is gated by an approved Execution Request and an exact current-state evidence SHA. It hard-checks all six price-row IDs, current source option values, current configuration bindings and commercial amounts before any mutation.

The repair creates exactly three new stable sellable-configuration IDs and reuses the correctly anchored existing configurations.

It changes only configuration identity metadata/bindings:

- sellable configuration name/key/sort;
- three new sellable configuration rows;
- three price-row `sellable_configuration_id` bindings.

It does **not** change:

- source amount;
- public amount;
- manual override amount;
- currency;
- price review status;
- price status;
- offer/order/payment/indexing state.

A before/after commercial-value hash must match inside the same transaction or the executor raises and rolls back.

The two manual price decisions therefore stay exactly as already recorded; this repair only makes the option identities truthful enough for later governance.
