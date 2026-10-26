# TheFEYA — bounded Production checkout wording correction

Date: 2026-10-27. Owner objective: launch all 207 approved products with live buyer checkout **without redesigning V13**.

## Observed user-facing inconsistency
The real Production buyer smoke after Vercel redeploy confirmed `checkout_active=true` and a visible buyer payment button, but all public footers still said “Checkout not active”; the otherwise-empty Privacy controller branch described checkout as not activated. The optional customer Account page incorrectly implied guest checkout was off. These descriptions were historical preparation text, not current commerce authority.

## Approved narrow correction
- Remove **only** the false checkout-off footer text. All original Footer nodes, layout classes, typography, visual hooks, menus, images and legal links are preserved.
- Keep privacy-controller identity **unclaimed** and data collection gates untouched. In Privacy display the real public payment-active state using the already existing `readPaymentsPublicActive()`; the payment recipient is Seller-Online LLC, not automatically the contracting seller or data controller.
- Pin the updated Privacy Git blob SHA and increment the accepted order legal policy bundle `thefeya-sale-policy-20261027-v2`. Existing versions and existing order snapshots remain historical.
- Clarify that guest shopping and optional account sign-in are distinct.
- Update **only** the Footer source SHA in the original visual-freeze manifest to enforce byte-for-byte integrity of this limited correction. The previous approved hash `0191332f3067405d4d653a68612c98a647578d0f` is retained here as the rollback anchor; new exact hash `57ff2007d49647cb599c2a7af70b8c337031e55f`.
- The already approved 207 PDP SEO blocks, Product DNA, prices, variants, image structure, header/gallery, LIVE PayPal credentials, database and ACTIVE Search Release v12 are unchanged. Search v13 K07/K20 remain OFF.

## Verification and rollback
Run FEYA CI: Search/legal and Payments policy-pin tests, Next build, V13 source freeze hash, PostgreSQL 17, browser auth and production smoke. After merge confirm exact Vercel main deployment, browser quote and checkout status. Rollback is the previous Footer and Privacy files **together with** the previous `checkoutPolicyEvidence.ts` version/hash, never a policy-file-only rollback. No live buyer order is created by testing.
