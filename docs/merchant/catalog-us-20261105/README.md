# TheFEYA US free listings — complete207-product export, 6 Nov 2026

## Scope and result

- Exact approved corpus: **207 READY /0HOLD /1,575 offers**. One reviewed source configuration/default photographed colorway per product;204 single-wearer configurations ×7sizes plus3 genuine paired configurations ×49 independent size combinations. This is not every possible component/color combination, nor evidence of Google eligibility, indexing, traffic or orders.
- New source capture: current Production `dpl_2aARVxaduQz3zGGUSrdHx5UqT2da`, app/code `86944eb3e6cdcee1aa005c21492696554abb4cc3`.207 public PDPs have approved identity/content pins, HTTP200, index/follow and self-canonical. All14 reviewed selected landings have matching displayed main image, first Product image and exact Offer. All seven standard sizes (and all49 independent size pairs) match server-owned quotes. No checkout/order/payment writes.
- **All previous1,421 feed rows are byte-identical** when reconstructed, SHA256 `c425b50c9cb3b1941e6d4527b30e6ded0083df31b5d68f31f4c7210794e09495`; all84 original pilot IDs/values preserved.154 rows added:147 for three genuine couples' sets and7 for the source-unspecified-gender full set. New TSV SHA256 `4b28ed35c07043524937ea111c1a3015f382e43c3dccc48a34087da17f7ddc89`.
- Last-four hold correction is documented in [merchant attribute mapping](../variant-landings-20261106/merchant-attribute-mapping.md). Google's free-listing guide permits `unisex` when no gender is specified. This narrow mapping applies only to four exact source/configuration cases and never overrides an explicit source audience. It does not change database audience, Product Truth, universal-fit claims or approved public copy.
- Pair size `XS/L` explicitly means women's XS /men's L. The title/description state the two dimensions; each URL independently sets women_size and men_size. Source-confirmed pair membership and existing reviewed photographs are mandatory. Source colors, selected prices and existing V13 controls are preserved. No invented shared pair size.
- Google structured copy fields retain trained_algorithmic_media provenance; Shopping_ads remains explicitly excluded. Static reviewed feed, not a live database export. Price/availability drift requires controlled reconciliation.

## Publication and observation

Account5322859215; existing source10790734908; en/US FREE_LISTINGS. Keep the configured historical TSV URL:

https://raw.githubusercontent.com/THEFEYA/feya-commerce/main/docs/merchant/pilot-us-20261103/thefeya_us_free_listings_pilot_20261103.tsv

The XML is a deterministic companion, not a second Merchant source. Existing daily source schedule stays unchanged. A successful publish is not a fetch/approval receipt. Source/row-level observation belongs in issue145. A controlled fetch after a genuinely new payload is distinct from repeatedly retrying the same file; never reset image-processing status by arbitrary URL edits.

[Full Google reconciliation at16:00UTC](google-reconciliation-20261106T1600Z.json) covers the **previous203-product/1,421-row snapshot**: all IDs present,25 checked fields match,1,406 US approved,7 image-crawl pending,8 image-processing disapprovals. The morning896 absent-offer failure no longer exists in actual API coverage. This receipt does **not** cover the154 rows added by this commit. The15 unresolved image offers use3 direct HTTP200 JPEGs; Google reports retry within3days. Its official help says typical3days, up to30days. Preserve truthful images and reconcile by ID; NOT_IMPACTED labels do not mean disapproval.

## Reproduce

With Node24, run capture-catalog.mjs for the actual Production deployment/code into a temporary JSON, then capture-selected-landings.mjs input.json output.json. Review and copy the refreshed capture and exact existing photo decisions into this directory. Build with `node --experimental-strip-types scripts/merchant/build-catalog-feed.mjs --publish-preflight`. Use `--check` for deterministic historical CI. Regression tests: `node --experimental-strip-types --test tests/search-db/merchant-catalog-feed.test.mjs`.

Freshness rejects observations older than24hours at publication; offline checks remain reproducible. Source photo/config/color drift, missing partner sizes, incomplete49-size quote matrices and contradictory explicit audience fail closed. Missing single gender alone is not a blocker for the four specifically reviewed Google mappings.

## Completion and rollback

The owner-requested condition watch signals once only when all207 products are READY and every expected offer is present, field-matched and approved for US FREE_LISTINGS, with zero missing/pending/disapproved. It does not signal from file existence, a transient zero-error UI, sitemap count or partial API pages. No extra GSC collector, order-email worker, paid service or Production cron was introduced.

Rollback this feed commit to the previous203-product snapshot, retaining PR237 exact landing support. Never run the old84-row pilot builder against the active source. Detailed current commit, tests, Google receipt and next task: issue145.
