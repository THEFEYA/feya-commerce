# C4.3-E11 — pending clean-baseline request + two-product structural repair plan

25 September 2026.

## Clean 205-product lane

After the baseline schema postflight passed, an **agent-prepared** Execution Request was created in production:

- Request ID: `9ebd0414-3547-4d21-8d71-82d1f2173e81`
- Request code: `EXE-20260925-154756-AA5DE6`
- Action: `ADOPT_SOURCE_PRICE_BASELINE`
- Status: `APPROVAL_REQUIRED`
- Requester: `agent`
- Human user ID: none
- Request hash: `3959d0c8289c67e7724abc35633580cd19e8a32f29e3a5a5a034e13ac1ebe923`

This is proposal/preparation state only. It has **no approval hash, no receipt and no price-governance mutation**. The 205 clean products still have 0 approved baseline price rows from this request.

This matches the Growth OS authority model: deterministic system/agent preparation may create the exact request, while only an authenticated allowlisted human can approve it.

## Why the remaining two products are not merely “manual price review”

Read-only production inspection found a structural binding error in both excluded products.

### 057fbd51…

The source contains distinct options:

- Male Outfit — EUR 183.44
- Female Outfit — EUR 327.00
- owner-authorized Full Set — EUR 460.44

But the male and female source-price rows currently share the same sellable configuration ID. The Full Set already has its own approved configuration.

### 5602d557…

The source contains distinct options:

- Skirt — EUR 135.10
- Top + Shoulders — EUR 154.41
- Full Set — source EUR 164.06, owner override/public EUR 260.00

All three rows currently share the same sellable configuration ID. The manual EUR 260 price itself is preserved; the structural configuration identity is what is wrong.

## Proposed repair

The machine-readable repair plan is:

`docs/search/manual-override-configuration-repair-plan-20260925.json`

It preserves every configuration-price ID and every source/public/manual amount.

It reuses the correctly anchored existing configuration where possible and proposes only three deterministic new configuration IDs:

- one Female Outfit configuration for 057fbd51…;
- one Skirt configuration for 5602d557…;
- one Full Set configuration for 5602d557….

This repair **does not approve** any unreviewed configuration or price. It only separates identities so later human governance can reason about the correct option.

Current two-product evidence SHA before repair:

`19a84d86e52724753350d3c12d22ded4e6e19a0ab2c0dedb36a292a481e502ae`

No structural repair has been applied to production yet.
