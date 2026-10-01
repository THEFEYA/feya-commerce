# C4.3-E3 — isolated 205-product activation rehearsal

25 September 2026.

This checkpoint rehearses the exact clean-source baseline transition at launch scale without touching production.

## Isolated dataset

The rehearsal is rebuilt from the sealed closed-review source manifest and the E1 audit manifest:

- 205 clean-source launch products;
- 850 exact configuration-price identities and storefront amounts;
- original canonical product IDs;
- original configuration price IDs;
- original sellable configuration IDs;
- two manual-override products excluded by the audit manifest.

Synthetic provenance IDs are generated only for the isolated source-price / option-mapping rows needed to satisfy the database foreign-key contract. They do not replace or claim to be production provenance.

## Rehearsed path

1. Seed 205 products / 850 configuration-price rows in a dedicated empty PostgreSQL database.
2. Apply the unapplied C4.3-E2 migration.
3. Run exact preview: must return 205 candidates / 850 rows / 0 hold.
4. Create one `ADOPT_SOURCE_PRICE_BASELINE` Execution Gateway request.
5. Verify prepare stage writes no price governance change.
6. Apply human approval.
7. Execute the approved request.
8. Verify 850/850 rows and their sellable configurations pass the strict quote-readiness governance conditions.
9. Recompute a fingerprint over all stable price/configuration IDs, source/public amounts, currency and provenance bindings; it must be identical before and after.
10. Verify manual-override products, offer promotion, order creation, payment and indexing remain outside this transition.

## Meaning

This is a release-scale rehearsal of the governance cutover only. It proves that the 205 clean-source products can move from `not_reviewed/draft` to approved quote-ready price governance in one controlled execution while preserving commercial values and identities.

It does **not** apply the migration to production and does not prove that every product has an active variant/offer. Variant/offer promotion remains the next gate after price governance.
