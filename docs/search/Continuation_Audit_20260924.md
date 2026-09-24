# FEYA continuation audit and C3.2a source manifest

24 September 2026. Baseline: PR #26 head `be77b761749876810953c3cc6fb4062a06688854`.

## Reconciled facts

- Read all 12 September 18 canonical documents, including eight role passports, Core, Architecture, Interaction Map and Implementation Prerequisites; reviewed the seven supplied research reports and the repository's existing A–K architecture.
- GitHub branch list and the current PR head do not contain the shared-release implementation reported at the end of the previous conversation. No corresponding newer deployment was found. That reported local work is NOT credited as implemented. The persisted baseline is C4.2.
- Fresh production SELECT: 243 product page records, all `candidate` / `active`; 208 approved latest drafts; 16 latest generated/unreviewed drafts; zero registered query clusters and zero ownership records. Prepared `feya_search_*` objects were not found. No production writes were performed.
- Fresh approved payloads match **208/208 existing pinned bindings**, including product/page/draft IDs, path, exact approved-copy hash and microsecond update time. This is stronger than a count-only check.
- Owner selection yields **208 source identities, 207 visible review candidates, one suppressed duplicate**. This is neither 207 distinct physical designs nor 207 commerce/index approvals.
- Return and discounted-return business truth are still `REVIEW_REQUIRED`. Owner-confirmed color/material-neutral base configuration pricing remains preserved.
- Existing baseline CI run `36050011543`: 10 successful jobs. These baseline results are not assigned to the new code. Hosted environment-to-database mapping and live Google Ads capability remain unverified.

## This bounded implementation

`lib/searchReviewRelease.ts` prepares a detached, deterministic, hash-bound closed-review source manifest. Product snapshots contain an explicit field allowlist; approved copy, images, configurations and source amounts are preserved. The duplicate is absent from visible entries but its identity remains recorded. Input mutation cannot change a prepared manifest; a separately trusted hash detects tampering. The manifest cannot enable publishing, indexing or checkout.

`scripts/prepare-closed-review-release.ts` is an offline writer with exclusive creation and distinct input/output paths. `tests/search/reviewRelease.test.ts` covers preservation, missing/duplicate sources, changed copy/routes/decisions, immutable input separation, trusted-hash tampering, private-field rejection and deterministic hashes.

`closed-review-source-manifest-20260924.json` was generated from fresh SELECT data. Its companion audit records the exact capture time and hash. **Raw source material/configuration values still require the already-approved exact-ID correction layer from the pinned code commit. `correction_overlay_applied=false`, `runtime_connected=false`.** Do not import this file into a client component, expose it publicly, or describe it as a public release. It is a private engineering input and contains review-only source prices and configurations.

## Historical C3.2 remainder at the source-manifest checkpoint

1. Build the public-safe projection after applying the existing owner correction layer; pin correction, truth, content and media versions. Never infer orderability from this source manifest.
2. Add the authenticated closed-review resolver, exact pinned-draft revocation checks and consistent request-scoped read. A newer unrelated draft must not silently substitute the approved snapshot. Archived/revoked approval fails closed.
3. Wire Home, Shop, PDP, related links and sitemap to that same release. A closed release must yield an empty sitemap even if global indexing is mistakenly enabled. Preserve the current layout and CSS.
4. Add real server pagination. Initial HTML currently exposes 20 cards and Show more is a client button. Resolve `/collections` links that currently target absent routes. This must be functional, not hidden crawler-only links.
5. Verify all 207 paths and exact copy/schema parity in the existing isolated Supabase/Auth/PostgREST/Next/Chromium runtime; include anonymous denial, new draft, revoked source, missing source, suppressed duplicate and environment flag failures.

Then C4.3 exact server quotes/orderability; independently C5 company/domain/privacy/returns and Google brand verification. Production indexing and payments remain separate launch gates. Do not ask the owner to repeat the five answered product decisions.

## Scope and rollback

No existing application route, component, font, CSS, visual contract, approved copy, stored price, DB schema or hosted flag was modified. This change is additive preparation. Rollback: revert this code/document commit or leave the prepared files unused; retain audit/history. No DB reverse migration is needed.

## Follow-up integration

The next C3.2 implementation is documented in `Shared_Review_Release_20260924.md`. The raw input manifest remains `closed_review_prepared`; a separate trusted presentation binding applies corrections and powers authenticated runtime. Do not rewrite the raw capture or treat the new closed runtime as public launch approval.
