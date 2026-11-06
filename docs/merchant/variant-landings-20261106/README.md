# Exact photographed-variant landing selection — draft, 6 Nov 2026

This prepares the next open catalogue task in issue #145. **Not deployed to Production; no Merchant feed, price, approved copy, source policy or database changes.** Current published feed remains196 products /1,372 offers,11 held. Seven missing pilot offer resources and the source-processing receipt remain a separate investigation (checkpoint6684344598).

## Resulting behavior

- A link can select an existing source configuration and a standard size on its first server render. Product Offer JSON-LD uses that same configuration, EUR price and exact variant URL; the canonical stays the existing base product URL.
- A real paired set accepts independent `women_size` /`men_size` and source-confirmed photographed partner colors. A shared `size`, partial partner selection, Custom sizing, foreign configuration, duplicate query values or unpriced White cannot become a selected Offer.
- This first lane accepts only the photographed default color/pair. Other colors need matching media evidence before feed distribution. Ordinary visits and UTM-only links retain current defaults.
- Query prices, discounts, currencies and audience cannot change the source quote. Cart/order creation is unchanged and still uses server-side repricing. Source selections are passed directly into existing controls; changing a valid incoming link remounts those controls so an earlier selection cannot leak into the new variant.
- Visible client JSX, helper markup, classes and control order are identical to the approved baseline. Existing review/purchase gates, metadata/canonical/release rules and the207 approved descriptions remain intact.

Query fields: `configuration`, `color`, `size`; genuine pairs use `women_color`, `men_color`, `women_size`, `men_size` instead of shared color/size. UUIDs are existing source configuration identities, not newly created SKUs. `pdpLandingHref` validates choices against the same public source before serializing a local `/shop/` link.

## Evidence and tests

`tests/fixtures/merchant-landing-products-20261106.json` is a small read-only projection of13 current public product payloads: five choose-first products, five paired products and three color-price harnesses. It records observation time, production deployment and source commit. These are deterministic test fixtures, not a current production feed or price authority.

`tests/search/pdpLandingSelection.test.ts` validates all options/sizes for the five choose-first products against the actual pure checkout helper, all49 independent size combinations for each of five paired sets, partner-only color choices, the three color-price exceptions, invalid/foreign/duplicate inputs and link round trips. The Offer tests were moved into the existing Search test directory so CI executes them too.

The existing route JSX hash remains unchanged after normalizing only functional data props. A second baseline now freezes the complete original `ProductDetailClient` JSX tree; source hashes in the UI manifest reflect only the state initialization/data-prop changes. The old purchase-binding audit is regenerated with only its client implementation fingerprint changed; original source facts, IDs, ranges and approval states are unchanged.

Local validation: TypeScript, Next production build,40 targeted tests and the complete Search suite. CI/preview receipts belong in #145. Browser click/hydration testing is not claimed while the local Chrome extension cannot attach; server-rendered preview selection must also be checked before a release decision.

## Remaining release/feed gates

1. Validate the exact draft head in CI and its protected preview, including ordinary/paired/invalid/no-query cases. Inspect the selected controls and matching Offer. No Production merge under the current read-only operations task.
2. For every new feed row, explicitly bind the purchased configuration and included pieces to an already reviewed matching image. Resolve intended audience from source evidence, not model appearance. The couple bundle's Merchant attributes and the final audience-only product still need that work.
3. After a separately authorized application release, capture the exact variant landing URLs and server checkout quotes. Only then prepare a reviewed static feed update with preserved accepted IDs. The current builder intentionally still holds these products; this change does not assert their Merchant eligibility or publish extra combinations.
4. Reconcile the Merchant source-processing receipt and seven missing pilot IDs. Do not overwrite the feed or request a Google account review to mask an unobserved ingestion problem.

Rollback after any future release: revert the application change; the current unmodified feed remains available. No paid services, new roles/schedules, supplier/customer messages or test payments are required.
