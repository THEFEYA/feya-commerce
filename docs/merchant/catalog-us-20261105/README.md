# US free listings — complete catalogue readiness, updated 2026-11-06

Owner decision: issue #145, comment 6663461672. Export every currently safe product in one batch; no artificial 12/24-product limit. This is free-listing distribution, not paid advertising or proof of Google Search indexing.

## Result

- Exact frozen corpus: **207 canonical products**, all public PDPs returned 200, `index, follow`, self-canonical on production `dpl_HFDV5CDE1xBDmcqHqJyQHyQBLFmA` / code `25f621dbce376298109d2cdca5530fe5c37a99b7`. Fresh capture completed 2026-11-06 11:15UTC; approved copy, selected offers, seven-size checkout quotes, colors and ordered image URLs are unchanged from the prior capture.
- **193 READY products / 1,351 offers**: one preselected Full Set, photographed default color, seven standard sizes XS–XXXL. Custom measurements excluded. This is not every possible configuration/color combination.
- **84 existing accepted pilot offers remain byte-identical at the row-value level**, including IDs, item groups, price, links, labels and approved copy. The original pilot feed remains available for rollback.
- **14 HOLD products**, each with reasons and a practical remedy in `readiness_manifest.tsv` / JSON. Primary blockers: eight lack an exact preselected Offer; five are paired sets requiring independent partner choices; one otherwise ready product lacks a confirmed intended audience. Per-product reasons overlap. No invented prices, audience, identifiers or partner sizes.
- Two previous audience-only holds are resolved from explicit original listing tags: tail 1885178663 (`female_armor`) and 1786396925 (`burning_man_women`). Source row IDs, hashes, full tag arrays and observation time are recorded in `source_audience_confirmations.json`. No database audience or public copy was rewritten. Tail 1780729637 remains unconfirmed.
- All 207 primary images visually reviewed. Four close portraits replaced in the new feed with existing full-outfit gallery images of the same default color (tails 1890486664, 4297325260, 1899634207, 1899491479). New products include only their reviewed main image; accepted pilot additional images are retained. Internal image QA is not a Google policy approval.

## Authority and safeguards

`source_live_readback.json` records the public projected ProductDetail payload's selected offer/price, exact approved H1/meta, ordered images and checkout parity. Capture uses the **same pure `priceCartLine` helper as checkout** for all seven sizes; no order, checkout request or payment is created. Public Offer JSON-LD is compared to the current shared offer helper. All 207 share the existing standard made-to-order / international shipping profiles.

`source_audience_readback.json` is a read-only snapshot of the existing storefront facet authority `feya-n7-20260928-v3`. Its intended audience resolves otherwise ambiguous copy; conflicting evidence fails closed. Missing audience is not guessed from a model's appearance. Original approved text remains unchanged. Existing AI-assisted approved copy is submitted verbatim with Google's `structured_title` and `structured_description`, `digital_source_type=trained_algorithmic_media`.

`source_audience_confirmations.json` supplies narrowly scoped evidence for the two missing audiences from `public.feya_commerce_source_listings`. The builder requires exact canonical product/listing identity, source row/hash, original tag membership and a reviewed explicit audience tag. It rejects duplicate, ambiguous or contradictory evidence. These records supplement the feed only; they do not replace the canonical facet authority. Re-read the source when refreshing these confirmations. A regression test preserves all previously published 1,337 TSV rows byte-for-byte, in addition to the original84 pilot-row contract.

No materials, GTINs, MPNs, adult-content flags, delivery promises or variant combinations are invented. `age_group=adult` describes sizing, not adult content. EUR currency, existing US shipping policy and FREE_LISTINGS source destination are retained; each XML item explicitly excludes `Shopping_ads`.

This is a versioned **static feed snapshot**, not a live database endpoint. Daily Merchant fetching reads the committed snapshot; it does not refresh prices by itself. Any production pricing/options/color/copy change requires a new public capture, renewed image review for changed URLs, rebuild, tests and source fetch. Do not imply that a scheduled Google fetch makes an old snapshot current.

## Reproduce / refresh

```sh
node --experimental-strip-types scripts/merchant/capture-catalog.mjs --deployment-id CURRENT_PRODUCTION_DEPLOYMENT --git-sha EXACT_SOURCE_SHA --output docs/merchant/catalog-us-20261105/source_live_readback.json
# Re-read the existing canonical audience snapshot, refresh changed-image QA.
node scripts/merchant/build-catalog-feed.mjs --publish-preflight
node --experimental-strip-types --test tests/search-db/merchant-catalog-feed.test.mjs
node scripts/merchant/build-catalog-feed.mjs --check
```

Capture is read-only and uses a six-request concurrency limit. Resume accepts only matching deployment/code/pin/URL observations less than one hour old, preserving original observation times. `--publish-preflight` rejects any PDP observation older than 24 hours. Offline `--check` remains deterministic for historical CI and does not pretend to check today's live prices.

## Merchant publication and rollback — configured URL retained

Account 5322859215; existing primary source 10790734908 / PRODUCTS SOURCE 2. **Use the already configured TSV URL** so a browser settings change is unnecessary:

`https://raw.githubusercontent.com/THEFEYA/feya-commerce/main/docs/merchant/pilot-us-20261103/thefeya_us_free_listings_pilot_20261103.tsv`

The bulk builder also writes that historical path as a **1,351-row current TSV** with `structured_title` / `structured_description`, using Google's documented `trained_algorithmic_media:"content"` syntax (embedded quotes doubled). The XML is an equivalent deterministic companion export, not a second Merchant source. The old pilot builder now verifies/writes the separate frozen snapshot and cannot accidentally overwrite the active catalogue URL.

Keep source/country/language/schedule/shipping/account policies. A source fetch can be triggered in the UI, otherwise the existing 00:00 America/Los_Angeles daily fetch collects the committed TSV (next after this update: 7 Nov 2026 08:00UTC /09:00Madrid). Publication is **not a fetch receipt**: verify actual count/errors and preserved pilot IDs after Google fetches. Report submitted, processed and eligible separately. Record receipt in issue #145. No account review request is needed.

Observed on 6 Nov at approximately 11:10UTC after the 08:00UTC fetch of the previous 1,337-row snapshot: product API enumeration completed both pages with **499 unique offers across179 products; 493 eligible, six image-crawl pending, zero disapproved**. All84 original pilot IDs are present, and every observed offer's ID/group/price/currency/color/size/link matches the committed feed. The remaining838 previous feed rows were not observable in that response; the source-processing reason is unconfirmed. Do not label the full feed accepted, infer a500-item limit, or count the two new products as processed before a new fetch/readback.

Rollback: copy the frozen 84-offer TSV back to the active historical path in a reviewed commit, then let Google fetch (or trigger Update). Alternatively, change the source URL to the frozen file and fetch:

`https://raw.githubusercontent.com/THEFEYA/feya-commerce/main/docs/merchant/pilot-us-20261103/thefeya_us_free_listings_pilot_20261103_frozen.tsv`

Never run the old pilot builder to "refresh" the active bulk source. It is intentionally a historical compatibility check only.

## Next open work

Resolve the 13 configuration/partner-selection holds with exact purchasable landing choices, and the one missing audience from reliable source evidence. Refresh this same feed without changing accepted IDs. Keep Google Search discovery/URL inspections separate from Merchant ingestion. Expand useful guides and social distribution after this source is actually fetched; do not report a feed build as a publication or an approval.

Primary specifications: [product data](https://support.google.com/merchants/answer/7052112?hl=en), [description provenance](https://support.google.com/merchants/answer/6324468?hl=en), [color](https://support.google.com/merchants/answer/6324487?hl=en), [adult attribute](https://support.google.com/merchants/answer/6324508?hl=en).
