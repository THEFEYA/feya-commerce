# SEO Product Truth v2 external review

Date: 2026-07-10

Status: **NOT APPROVED FOR APPLY**

Reviewed file:

- `FEYA_Commerce_SEO_Product_Truth_v1_proposed_v2.sql`
- SHA-256: `188830f955f4692849bf621fa627bfb3eca7245f28293058eddedfc34ce6fac2`

The two uploaded files were byte-identical copies of the proposed CREATE VIEW SQL. The claimed read-only preview v2 file was not included in the upload.

## What v2 fixed correctly

- removes the simple union of mapped components;
- keeps the pilot `4348580005` unresolved;
- removes positional English/Russian pairing as an approval mechanism;
- makes review checks null-safe;
- preserves structured JSON evidence;
- uses deterministic ordering in the main JSON aggregates;
- separates direct and upstream provenance;
- keeps one row per Product Focus product in the reported preview.

## Blocking findings

### 1. The view is permanently non-generative

`review_status_contract.resolved_review_statuses` is hard-coded to an empty array.

At the same time:

- every option/configuration/price review check depends on membership in that array;
- `has_fixed_base_evidence` is hard-coded to `false`;
- `included_components` requires either resolved configuration review evidence or fixed-base evidence.

Therefore the SQL cannot produce a confirmed included component now or after future review-row edits. This is not only conservative; it is a dead end. The reported result `included_components = []` for all 243 products is structurally guaranteed.

The next revision must define an explicit operational approval contract. A review status such as `approved` may only be treated as resolved after the project formally adopts it and the selected rows are human-reviewed.

### 2. Catalog SQL contains a pilot-specific shoulder classifier

The blocker logic searches the source-description fragment for the literal substring `shoulder`.

A general Product Truth contract must not contain product-specific lexical classification. The view may preserve the fragment and emit a generic `source_description_indicates_component` evidence blocker. The pilot assertion may verify the shoulder text outside the catalog-wide component logic.

### 3. Variation/price alignment is hard-coded unresolved for every product

The SQL sets all derivation confirmation flags and `pairing_allowed` to `false`, without consuming the actual derivation payload to decide per product.

This is safe as a temporary diagnostic, but it is not an operational implementation. It creates `unresolved_variation_price_alignment` for every product with both variation and configuration evidence, including products where pairing may be unnecessary for Product Truth.

The next revision must distinguish:

- alignment required and unresolved;
- alignment not required;
- alignment confirmed by existing derivation evidence.

No positional guessing is allowed.

### 4. `optional_configurations` aggregates every option mapping

The aggregate starts from all rows in `option_base`, so non-configuration axes can be presented as optional configurations. Configuration choices must be separated from size, color, and other variants using the existing canonical-axis/derivation contract.

### 5. The current application contract still expects strings

The proposed SQL correctly returns JSON object arrays for optional configurations, available variants, and known non-components. The current TypeScript contract and server adapter still type/normalize these fields as string arrays. Applying the view before adapting the application would discard structured evidence.

## Required next revision

The next SQL revision must:

1. adopt an explicit, usable human approval status contract rather than an empty status set;
2. remain blocked until rows are actually approved;
3. remove the catalog-wide `shoulder` substring rule;
4. evaluate alignment only from existing derivation evidence and only when alignment is required;
5. keep configuration axes separate from size/color/other variants;
6. preserve structured JSON objects end to end;
7. identify a small set of low-risk products that can be human-reviewed and moved to READY for the first real AI draft;
8. include a real read-only preview file, not a duplicate proposed file.

## Pilot rule remains unchanged

For listing `4348580005`, before approved mapping and configuration repair:

- `included_components = []`;
- raw One Shoulder / Full Shoulders evidence remains visible;
- unresolved facts and review blockers remain non-empty;
- no inferred shoulder component is allowed.

## Practical milestone

The next milestone is not another catalog-wide audit. It is:

1. create an operational Product Truth contract;
2. human-approve one low-risk product through existing review fields;
3. produce the first real English SEO draft;
4. run deterministic QA;
5. review the result before catalog scaling.
