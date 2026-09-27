# C4.3-E9 — price-baseline approval scope hardening

25 September 2026.

The E7 step-up boundary originally included the generic `/api/admin/company/execution-approval` endpoint. That was broader than necessary for the price-baseline cutover because a logged-in owner could potentially approve an unrelated Execution Request while the temporary owner-action window was open.

E9 removes the generic approval endpoint from the step-up allowlist.

The price workflow now uses:

`/api/admin/review/prices/baseline-adoption/approval`

Before calling the canonical owner-approval RPC, this route re-reads the Execution Request and requires:

- action code `ADOPT_SOURCE_PRICE_BASELINE`;
- mutation domain `COMMERCE_PRICE`;
- status `APPROVAL_REQUIRED`;
- human requester is the same authenticated owner;
- exact release ref;
- exact baseline contract version;
- exactly 205 clean product IDs in the request;
- exactly 850 expected price rows;
- request evidence SHA equals target-version evidence SHA.

The database executor still performs its independent current-evidence recheck immediately before any governance mutation.

In owner preview, the generic execution-approval endpoint and all unrelated writes remain `423 owner_preview_read_only`.
