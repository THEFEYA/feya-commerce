# FEYA Storefront Bundle Pricing Rules v1

Status: CANONICAL operational guidance  
Owner clarification: 2026-09-20

## Purpose

Prevent implausible Full Set pricing while preserving owner control over intentional bundle discounts.

## Canon

1. A Full Set must not silently inherit an imported price that is almost equal to one of its major individual options.
2. Compare Full Set against the minimum real set of current sellable selector choices needed to cover the same components. Do not sum overlapping bundle rows twice.
3. Approximate shared delivery/overhead guidance: individual option prices historically include about 30 USD/EUR-equivalent of delivery/overhead. When multiple independently priced pieces are combined into one shipment, repeated delivery/overhead should not be charged once per piece. This is a pricing guide, not a hard formula.
4. Typical intentional bundle discount can be around 20–25% from the true separate-purchase total. Larger discounts are allowed when the owner intentionally chooses them.
5. A price deeper than 25% discount is not automatically rejected; it must be surfaced for owner review.
6. A Full Set price too close to one major individual option must be surfaced for owner review.
7. Source/recovered prices remain provenance. Owner-reviewed manual overrides become public price truth without deleting historical source amounts.
8. Buyer-facing PDP:
   - Full Set first and selected by default when available.
   - Every selector option shows its own price.
   - Savings are shown beside the main price, not inside the option label/row.
   - “What’s included” names the currently selected configuration.
9. Admin Preview may show internal price-review warnings. Public storefront must not show internal QA warnings.

## Example: listing 4342770881

- Skirt: EUR 135.10
- Top + Shoulders: EUR 154.41
- True separate-purchase total: EUR 289.51
- Recovered Full Set source price: EUR 164.06 — rejected as implausibly low
- Owner-reviewed Full Set public price: EUR 260.00
- Buyer-visible saving: about EUR 30 (10.2%)

The original EUR 164.06 source amount remains preserved as provenance.
