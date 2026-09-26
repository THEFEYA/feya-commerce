# C4.3-E16 — post-repair governance for the two manual-price-lane products

25 September 2026.

This package prepares the final price-governance step for the two products that were excluded from the 205-product clean baseline.

It is deliberately **post-repair**. The action cannot become eligible until E12 has separated the six price rows into six truthful sellable configuration identities.

## Exact lane

Product `057fbd51…`:

- Male Outfit — EUR 183.44 source/public;
- Female Outfit — EUR 327.00 source/public;
- owner Full Set — EUR 460.44 manual/public, already owner-approved.

Product `5602d557…`:

- Skirt — EUR 135.10 source/public;
- Top + Shoulders — EUR 154.41 source/public;
- Full Set — source EUR 164.06, owner public/manual EUR 260.00.

## Controlled effect

After exact human approval, the executor:

- approves the six post-repair sellable configurations;
- approves only the four unchanged source-price rows;
- preserves both manual override rows exactly as already owner-reviewed;
- preserves every price amount, currency and configuration-price ID;
- requires final strict quote-readiness = **6 / 6**.

It does not promote an offer, create an order, enable payment or enable indexing.

## Authority

Action capability: `ADOPT_MANUAL_PRICE_LANE_GOVERNANCE`.

Approval class: `HUMAN_REQUIRED`.

The migration is currently repository-only and unapplied. It can be installed independently of execution; before the E12 repair succeeds, its evidence gate remains closed.
