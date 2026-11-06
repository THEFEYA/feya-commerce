# Last-four Merchant attribute mapping — 6 Nov 2026

This supersedes the prior assumption that a missing single gender always requires an owner decision. Google's current [free-listing guide](https://support.google.com/merchants/answer/13889434?hl=en), Gender row, explicitly allows `unisex` when no gender is specified. The detailed [gender specification](https://support.google.com/merchants/answer/6324479?hl=en) has no additional minimum requirements beyond format. This is a **Merchant transport mapping**, not a new claim about universal garment fit, a database audience edit, or a rewrite of the approved product copy.

The fallback is restricted to four exact configuration/source cases. Existing explicit female/male evidence always wins; all other ambiguous products still require review. Every case must have an exact selected Offer and an independently reviewed source photo binding. The three pair cases retain source facet `couples` plus explicit source-confirmed women/men bundle members; Witch retains the source's unspecified audience. A future source-audience change cannot silently reuse this mapping.

| Product | Selected source configuration | Merchant mapping | Size coverage |
| --- | --- | --- | --- |
|4488185754|6af8ef45-5709-4635-8149-e0254659fef5 — Paired Set|unisex; no single gender for the whole mixed-wearer set|49 independent women/men combinations|
|4489232697|619990bd-8e27-4996-bb32-2f1ca9a6c32f — Paired Set|same scoped mapping|49 independent combinations|
|4488971627|5f9235ae-80e4-483c-98b3-ae7a496dc47b — Paired Set|same scoped mapping|49 independent combinations|
|1780729637|0116cc20-c437-4e4c-a07c-1e753f7743fb — Full Set|unisex for unspecified source audience, per free-listing guidance|7 standard sizes|

The [size specification](https://support.google.com/merchants/answer/6324492?hl=en) permits slash-separated dimensions in one size value. Applying that general rule to the source-confirmed two-outfit sets is an engineering mapping, not a Google statement specifically endorsing couples' costumes: `XS/L` means women's XS and men's L. Each new title states both dimensions explicitly; the description explains their order. Its landing URL independently selects `women_size=XS` and `men_size=L`. All49 combinations are quoted through the existing server-owned pricing helper, retaining the pair and source colors without collapsing both wearers into one size. Google acceptance remains a separate observation after fetch.

These are manufacturer-defined TheFEYA sets already sold as one source configuration, not newly assembled third-party merchant bundles. The app's `is_bundle` field is not automatically mapped to Google's merchant-defined `is_bundle`; see Google's [bundle specification](https://support.google.com/merchants/answer/6324449?hl=en). Existing1,421 feed rows and the column schema remain byte-identical, including all84 pilot IDs. New row IDs are the existing configuration UUID plus `-W<size>-M<size>` (under50characters). No new images, invented prices, actual checkout/orders, paid API calls, Ads, public-copy or V13 changes are involved.

Publication gate: fresh207-PDP capture, exact selected photo/Product image/Offer parity for all14 reviewed landings, all49 independent quotes for each pair, no source/audience drift, deterministic exports and green regression/CI checks. Target is207 products /1,575 offers /0HOLD, one selected source configuration and photographed colorway per product. This does not claim all possible component/color combinations or Google eligibility.
