# FEYA current work checkpoint — 2026-07-05

## Current branch

`rebuild/emergent-template-port-v2`

## Current focus

We are working on the admin Listing Master flow before generating final SEO packs.

Main path:

1. Select product in Listing Master.
2. Review auto focus from safe product view.
3. Manually adjust focus chips.
4. Apply keyword search and exclusions.
5. Save decision draft.
6. Open SEO brief.
7. Later generate SEO pack with QA and approval.

## Already implemented

- Listing Master reads `feya_commerce_v_listing_master_product_focus_v1`.
- Decision drafts are stored in `feya_commerce_listing_master_decisions_v1`.
- Product filters include operator section and work status.
- Keyword strategies can be combined: demand, opportunity, niche.
- Focus chips can be multi-selected.
- Default excluded terms include unrelated costume/pop-culture/noise words.
- Keyword table is compact and has expandable explanation details.
- SEO brief screen reads saved Listing Master decision.
- Guardrails exist for SEO pack generation.
- Vision focus agent plan exists as advisor, not automatic catalog truth.

## Known issue to fix next

If a chip is auto-inferred from the product, clicking it again can reappear because auto-focus fills it back in. Needed fix: support a `focus_off` URL state so the operator can turn off inferred chips per product. This is especially visible with persona such as `warrior`.

## Commercial keyword validation

The first Google Ads export showed that very long exact phrases often have no metrics, but Google suggested related commercial and broad terms with data. This means commercial expansion should be done in small batches and imported as validated metrics, not guessed.

Rules:

- Do not fake search volume.
- Do not mark commercial phrases as approved until Google Ads metrics are imported.
- Keep market settings English + US first, then UK, Canada, Australia.
- Use batches of about 10 seed phrases.
- Preserve source batch names when importing.

## Commercial seed batches still needed

Build future batches from base product groups:

- festival outfit
- rave outfit
- burning man outfit
- stage costume
- performance costume
- shoulder armor
- armor outfit
- harness outfit
- corset top
- bodysuit costume
- headpiece costume
- mask costume

Modifiers:

- buy
- shop
- order
- price
- cost
- custom
- handmade
- made to order
- shipping
- delivery

## Decision on dress wording

Do not use `dress-like outfit` as buyer-facing keyword. It is not natural search language. If the product is top plus skirt, use buyer language such as `two piece outfit`, `top and skirt set`, `costume set`, `festival outfit`, or `armor outfit`, depending on product facts and visual fit.

## Next actions

1. Fix inferred chip toggle with `focus_off` state.
2. Create commercial keyword batch tracker/import workflow.
3. Import the uploaded Google Ads keyword stats CSV as a first commercial batch if schema matches.
4. Add Vision Advisor route and button after Listing Master keyword flow is stable.
5. Build SEO Pack Draft storage and QA layer.
