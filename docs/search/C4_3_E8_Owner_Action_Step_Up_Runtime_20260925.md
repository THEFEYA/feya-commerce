# C4.3-E8 — real runtime proof for step-up owner actions

25 September 2026.

E7 introduced a narrow step-up authentication boundary so protected owner mutations can require an allowlisted Supabase Auth session without forcing login for the read-only owner preview.

E8 adds a real runtime/browser proof to the existing isolated Supabase + Next production-server CI harness.

The runtime starts a second owner-preview server with:

- `FEYA_ADMIN_AUTH_REQUIRED=false`;
- `FEYA_OWNER_ACTION_AUTH_REQUIRED=true`;
- `FEYA_OWNER_ACTIONS_ENABLED=true`;
- `FEYA_COMMERCE_PRICE_BASELINE_ADOPTION_ENABLED=false`;
- the exact authorized Vercel preview project/branch metadata.

It verifies:

1. anonymous GET of the owner preview remains available;
2. arbitrary preview writes remain 423 / `owner_preview_read_only`;
3. anonymous POST to the exact price-baseline endpoint reaches the step-up auth boundary and returns 401;
4. the existing no-signup login page can establish the allowlisted owner session even though global admin auth is false;
5. the authenticated price-baseline request reaches the protected route;
6. the action-specific baseline switch still returns 423 while disabled;
7. unrelated writes remain blocked even for the authenticated owner.

No production credentials or production data are used by this test.
