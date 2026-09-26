# C4.3-E2 — exact owner batch approval for clean source prices

25 September 2026.

This package implements the next bounded step after the audited 205/2 price partition.

## Flow

1. **Prepare exact batch**: server recomputes the current 205-product clean-source evidence and SHA-256 fingerprint. No write occurs.
2. Server creates one `ADOPT_SOURCE_PRICE_BASELINE` Execution Gateway request bound to release, exact product IDs, evidence hash and 850-row count.
3. **Human confirmation** uses the existing owner approval endpoint. Approval and execution remain separate backend states.
4. A dedicated executor accepts only an `APPROVED` request whose approval hash still equals request hash. It recomputes the evidence again under row locks.
5. Only when the exact evidence still matches are configuration review, price review and price status moved to `approved`.
6. A standard `SUCCEEDED` execution receipt is written; the existing receipt trigger records the change event.

The UI exposes this as two explicit owner steps: prepare, then confirm/apply. If execution fails after approval, the request remains safely retryable; evidence drift fails closed.

## Boundaries

The clean batch contains **205 products / 850 price rows**. The two manual-override products from the E1 manifest are physically excluded by the server route.

The client never submits price, currency, confidence, fallback or manual-override values. Those are re-read from the database.

The executor changes governance statuses only. It does not change source/public amounts and does not enable offer promotion, orders, payment or indexing.

## Activation

The migration is unapplied by default. The application route also requires:

- mandatory owner auth;
- owner allowlist;
- `FEYA_OWNER_ACTIONS_ENABLED=true`;
- `FEYA_COMMERCE_PRICE_BASELINE_ADOPTION_ENABLED=true`.

Until those conditions are deliberately enabled, production data is unchanged.
