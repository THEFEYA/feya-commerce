# Released landing selection — 6 Nov 2026

PR237 is merged; Production `dpl_3MRLECiHsMsfAgpMeU73AwYCf5ov` at `1de3a139aca1500d4b148cc31799f430cf841773` is READY. All14 exact selected public landings were verified against actual main image, Product image and Offer. Seven single-wearer configurations are now qualified for the controlled203-product feed; the remaining three couple-only products and audience-only product stay held. See `../catalog-us-20261105/README.md` and issue145 for current publication/Google receipts. The draft/read-only statements below describe the earlier stage and are superseded by the owner's explicit instruction to complete publication.

---

# Exact photographed-variant landing selection — draft, 6 Nov 2026

This prepares the next open catalogue task in issue #145. **Not deployed to Production; no Merchant feed, price, approved copy, source policy or database changes.** Current published feed remains196 products /1,372 offers,11 held. Seven missing pilot offer resources and the source-processing receipt remain a separate investigation (checkpoint6684344598).

## Resulting behavior

- A link can select an existing source configuration and a standard size on its first server render. Product Offer JSON-LD uses that same configuration, EUR price and exact variant URL; the canonical stays the existing base product URL.
- For14 reviewed configuration/photo tuples, the matching existing photograph comes first in both the client gallery and Product JSON-LD. The remaining source photos are preserved in their original relative order. The first displayed image retains the existing eager/high-priority loading. Normal/UTM-only visits retain the original gallery order.
- A real paired set accepts independent `women_size` /`men_size` and source-confirmed photographed partner colors. A shared `size`, partial partner selection, Custom sizing, foreign configuration, duplicate query values or unpriced White cannot become a selected Offer.
- This first lane accepts only the photographed default color/pair. Other colors need matching media evidence before feed distribution. Ordinary visits and UTM-only links retain current defaults.
- Query prices, discounts, currencies and audience cannot change the source quote. Cart/order creation is unchanged and still uses server-side repricing. Source selections are passed directly into existing controls; changing a valid incoming link remounts those controls so an earlier selection cannot leak into the new variant.
- Visible client JSX, helper markup, classes and control order are identical to the approved baseline. Existing review/purchase gates, metadata/canonical/release rules and the207 approved descriptions remain intact.

Query fields: `configuration`, `color`, `size`; genuine pairs use `women_color`, `men_color`, `women_size`, `men_size` instead of shared color/size. UUIDs are existing source configuration identities, not newly created SKUs. `pdpLandingHref` validates choices against the same public source before serializing a local `/shop/` link.

## Evidence and tests

`tests/fixtures/merchant-landing-products-20261106.json` is a small read-only projection of14 public product payloads: five choose-first products, five paired products, three color-price harnesses and the audience-held witch costume. The gallery observations are linked separately to the original read-only gallery review. It records observation time, production deployment and source commit. These are deterministic test fixtures, not a current production feed or price authority.

`tests/search/pdpLandingSelection.test.ts` validates all options/sizes for the five choose-first products against the actual pure checkout helper, all49 independent size combinations for each of five paired sets, partner-only color choices, the three color-price exceptions, invalid/foreign/duplicate inputs and link round trips. The Offer tests were moved into the existing Search test directory so CI executes them too.

The existing route JSX hash remains unchanged after normalizing only functional data props. A second baseline now freezes the complete original `ProductDetailClient` JSX tree; source hashes in the UI manifest reflect only the state initialization/data-prop changes. The old purchase-binding audit is regenerated with only its client implementation fingerprint changed; original source facts, IDs, ranges and approval states are unchanged.

Application validation at `d938528748324d2e2f354729eaf0d075241790bc`: TypeScript, Next production build,841 Search tests and all28 CI jobs (run42218637959). The protected preview passed the ordinary/paired/invalid/no-query SSR cases recorded in #145. Browser click/hydration testing is not claimed while the local Chrome extension cannot attach.

## Full-gallery correction and evidence

The owner's gallery observation was confirmed on6 Nov: **4348580005 has an existing Both Shoulders photograph at position7**. Positions1–6 show one shoulder; position8 is a size chart. The earlier finding described the primary image only and must not be treated as a rejection of the two-shoulder configuration. Source IDs and prices remain Single Shoulder `698d3ae1-bae2-4979-9223-f4f2be850338` /EUR144.76 and Both Shoulders `c1c6a9e3-e86d-4306-83a0-0fe06392d31f` /EUR159.51.

A real evidence-loss defect was found in the existing read-only capture: `images.slice(0,6)` discarded later gallery frames before review. Capture now preserves the entire public gallery; selection and publication remain separate reviewed steps. A regression using this actual eight-image gallery confirms frame7 survives while the unresolved base visit stays an AggregateOffer/HOLD. All13 Merchant catalogue tests pass, including byte-identical reproduction of the existing1,372-row TSV and preserved84 pilot offers. No full catalogue recapture or feed regeneration was performed.

`gallery_review.json` records all82 current gallery images for the11 held products:72 product photographs and10 size charts, with exact URLs, original image SHA256, dimensions, positions, per-PDP observation times, HTML hashes and approved content bindings. All were visually inspected in full-gallery contact sheets; the two-shoulder frame was also inspected at original resolution. This is a targeted11-PDP read, not a new207-product crawl.

| Product tail | Useful existing image evidence | Remaining qualification |
| --- | --- | --- |
|4348580005|Single Shoulder:1; Both Shoulders:7|Bind selected configuration to its displayed photo; retain source color authority.|
|1824045326|Women's Outfit alone:1–3; both outfits:4–5|Men-only photo is not isolated; audience comes from source configuration.|
|1899282209|One current public image; source-backed Top + Skirt candidate|Separate panties layer is not independently visible; styled leg covers are not included.|
|4463955343|Worn pair:1–7; unworn pair:8–9|No single-piece-only frame;8 is a useful exact pair photo.|
|1888669170|Harness design front/back:1–9|Material is source-owned; chart10 depicts another harness and is not a product candidate.|
|4302158749|Both outfits:1–4; women's outfit alone:5–8|Solo source variant/photo5 is an alternative to paired Merchant encoding.|
|4488185754|Both outfits:1–7|Keep source women Gold /men Silver and independent sizes; exclude styling garments.|
|4489232697|Both outfits:1–7|Retain source-listed pieces and independent fits.|
|4488971627|Both outfits:1–6|Included headpiece comes from approved copy; preserve separate fits.|
|1765624488|Both outfits:1,5; women's outfit alone:2–4|Solo source variant/photo2 is an alternative to paired Merchant encoding.|
|1780729637|Full set:4,5,8|Photo coverage is adequate; source audience is still unresolved.|

`configuration_photo_candidates.json` binds14 existing configuration/photo candidates across these11 products. All14 example selections resolve through the draft parser and agree with the existing pure checkout helper and Offer price. These are **not** new feed rows or new Merchant approvals. No image was cropped, generated, replaced or added to a public PDP, and no actual photographed material/audience is guessed from a model.

## Implemented configuration/photo binding

`lib/pdpLandingMediaBindings.ts` contains only the14 reviewed source tuples and image URLs/hashes, with the exact gallery-review SHA256. It does not ship the full82-image review or any prices to the client. `resolvePdpLandingMedia` validates the source product/configuration, observed public source label/component/bundle tuple, normalized owner-reviewed tuple, photographed color(s) and current gallery membership. An existing label adapter cannot silently inherit photo proof after its source tuple changes. A missing image or video in place of the reviewed still image yields invalid media; the selected Offer is suppressed and the page does not initialize the invalid landing selection. Unreviewed valid variants keep the existing gallery but gain no reviewed-photo claim.

The same pure resolver supplies the server-rendered gallery and Product JSON-LD image order. Both Shoulders therefore starts with source photo7; Single Shoulder starts with source photo1. No image-index or image-URL query field controls that choice. An arbitrary image override is ignored and is not serialized into governed links. The full client JSX tree, route JSX tree, classes, arrows, lightbox and loading attributes remain the approved baseline; only derived gallery data changes. Query-specific choices remain inside the existing Suspense boundary and outside the shared product cache. No new fetch, effect, checkout behavior or paid call is introduced.

The new media tests cover all14 exact image/Offer/pure-quote matches and immutable source galleries, review provenance, unchanged normal/UTM visits, unreviewed variants, missing/non-image photos, foreign choices, source tuple/color drift and image-query overrides. The three color-price exceptions and all49 independent sizes per pair remain covered by the existing selection tests. CI and protected-preview receipts for the final head belong in #145.

## Remaining release/feed gates

1. Verify the final draft head in CI and protected-preview SSR: first displayed photo, first Product image, exact Offer and selected controls. Keep the earlier completed receipts above separate. No Production merge under the current read-only operations task.
2. Photo-binding implementation is complete for the14 reviewed tuples. The couple bundle's Merchant attributes and the final audience-only product still need source work; the two solo women's alternatives avoid inventing a common pair size or unisex attribute. Preserve those HOLDs until qualified; do not claim11 newly eligible products from this app change.
3. After a separately authorized application release, capture the exact variant landing URLs and server checkout quotes. Only then prepare a reviewed static feed update with preserved accepted IDs. The current builder intentionally still holds these products; this change does not assert their Merchant eligibility or publish extra combinations.
4. Reconcile the Merchant source-processing receipt and seven missing pilot IDs. Do not overwrite the feed or request a Google account review to mask an unobserved ingestion problem.

Rollback after any future release: revert the application change; the current unmodified feed remains available. No paid services, new roles/schedules, supplier/customer messages or test payments are required.
