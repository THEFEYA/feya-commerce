# C4.3-E7 — protected step-up owner actions without locking read-only Admin

25 September 2026.

The production baseline schema is now installed, but owner execution remains closed because the application-side owner authentication boundary has never been exercised.

A previous all-admin auth design conflicted with the current owner-review requirement: the read-only preview must remain directly viewable and must not force login merely to inspect Product OS.

E7 separates those concerns.

## New boundary

`FEYA_OWNER_ACTION_AUTH_REQUIRED=true` enables authentication only for the explicitly allowlisted protected owner-action endpoints. It does not turn on mandatory login for all `/admin` pages.

The narrow step-up endpoint list is currently only:

- `/api/admin/review/prices/baseline-adoption`
- `/api/admin/company/execution-approval`

All other preview writes remain blocked with `owner_preview_read_only`.

The existing `/admin/login` form is allowed to POST in owner preview so a Supabase Auth session can be established. Public signup remains absent.

## Required independent switches

Authentication alone still cannot mutate FEYA data.

For the price-baseline action all of the following must be true:

- valid Supabase public auth configuration;
- allowlisted authenticated owner session;
- `FEYA_OWNER_ACTION_AUTH_REQUIRED=true`;
- `FEYA_OWNER_ACTIONS_ENABLED=true`;
- `FEYA_COMMERCE_PRICE_BASELINE_ADOPTION_ENABLED=true`.

The database executor still requires an approved Execution Request whose approval hash matches its request hash.

## What stays open

Owner-preview GET/HEAD navigation stays unchanged and read-only. This preserves the direct visual-review workflow.

## What stays closed

- arbitrary admin POST/PUT/PATCH/DELETE;
- review-event logging as a substitute for canonical price adoption;
- offer promotion;
- order creation/payment;
- indexing.

The default values in `.env.example` keep every owner-action switch false.
