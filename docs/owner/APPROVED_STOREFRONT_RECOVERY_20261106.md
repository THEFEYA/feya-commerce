# Approved storefront recovery — 6 November 2026

Owner explicitly supplied eight screenshots and requested recovery of the agreed colors, paired selection, cart and Contact presentation. This supersedes the historical restriction against these particular visible changes. It does not authorize a wholesale rollback to an old branch, new prices or invented product variants.

## Authority and cause

- Screenshot deployment: `feya-commerce-7d8pp5jl1-alexs-projects-5419f9ec.vercel.app`, Vercel `dpl_3QuC9t48DydNKCq5BwAhWkyL4xex`, Git `735e72988e7bb772371ecad6cae0f7e518f810f3`, PR #191, `work/bonanza-color-variants-20261020`.
- PR #191 remained open/unmerged. Its head at recovery was `88d6dfdbc12d8874f2e07ed59c8210f66084e7a9`. Some PDP/checkout portions were separately incorporated later; the catalog/filter and two-map presentation were not.
- Recovery starts from main `bfc98f433bd0d991f75a342a8383e72d0a17f4d9`, preserving subsequent payment, Merchant exact landing, source option and crawl pagination fixes. Never deploy PR #191 wholesale: it predates active payments and the 1,575-offer feed.
- Actual production browser `/shop?color=Silver%2CWhite` returned 404 before recovery; `/shop` offered only six single-select filter colors. The slim Shop and collection adapters omitted the already committed Bonanza color overlay. A matching JSX file alone is not rendered-page evidence: V13 wrappers and the exact preview branch gates matter.

## Reconciliation and acceptance contract

| Surface | Recovery / retained behavior |
| --- | --- |
| Catalog filter | Ten basic colors; multiple selections; URL reload/backed server parsing. Default photo mode matches all components of the reviewed main-photo colorway. `Include other available colors` matches any selected constituent of an approved available option. Other filter axes remain AND constraints. A valid zero-result color filter must reload as the filter page with the available-color suggestion, not 404; out-of-range pagination still returns 404. |
| Two/three-tone PDP colors | Already in main: complete approved combinations, not arbitrary independently mixed colors. Preserve the 20-code owner manifest, display overrides and stronger holographic swatch. |
| Product cards | Reveal all available base colors, separately as small circles; show a short explanation when an available-color match is not in the main preview. Keep the primary photo, video/hover, title, price and click tracking. |
| Shop/collections data | Attach the same approved color manifest to both independent card sources, without additional DB requests or membership changes. Transport remains lossless. |
| Three color-priced products | Catalog allows only the existing Brown/Black/Green lane, excludes unpriced White, and never invents payable configurations. Full PDP/checkout still validates three real price rows. Missing detail prices continue to fail closed. |
| Paired sets | Already in main: independent women/men colors and sizes, themed keyboard-accessible size controls, source-confirmed full-set identity, both fits in cart/order snapshot. A couples marketing title alone does not prove a genuine two-person SKU. |
| Custom measurements / gifts | Preserve working server charges and gift card/box options. Required Custom service cannot be unchecked to avoid payment; the old preview's removable required service is superseded by live checkout truth. |
| Cart | Restore gold required markers/native requirements and adjacent policy/news opt-ins. Keep live quote, real amounts, PayPal handoff, idempotency, paid-order persistence and optional measurement tracking unchanged. Privacy explanation remains available below the consents. |
| Contact | Restore the approved two-column Kyiv reference / US partner facility cards with exact existing Place IDs, direct map links and explicit qualifications. The US facility is not a TheFEYA showroom; US dispatch depends on verified stock. Kyiv visiting hours require confirmation. Public maps remain click-to-load, not automatic third-party requests. |
| Other V13 pages | Preserve Header, Footer, CSS, Events/Style/About/Shipping compositions; recovery preview must render the same V13 shell as Production. |
| Merchant | Preserve the static 207-product/1,575-offer TSV and all exact landing/configuration/size/media behavior. Broader website color availability does **not** mean every color/configuration is submitted to Google. No fetch/review or feed overwrite as part of recovery. |
| SEO / data | Preserve approved 207 PDP copy, source prices/SKUs, Product Truth, Search v13 authority, sitemap, canonicals and noindex filter utility URLs. No schema/data write, advertising, orders or offsite publications. |

## Verification and continuation

Regression tests cover all 207 slim-card projections, no source/price mutation, the three price exceptions, photo versus availability semantics, normalized multi-color reload/pagination, independent pair fits, Custom charges, payments and exact Merchant landing/media. Update only the explicitly changed visual baselines; retain the PDP JSX baseline unchanged.

Rendered QA must use the recovery's actual Vercel Preview/Production URL, check desktop plus mobile, Shop multi-selection and the availability toggle, one mixed-color PDP, a genuine pair with different partner sizes/colors, cart handoff data and Contact. Do not create an order or submit payment merely for visual QA. Record exact commit, CI, deployment and remaining gaps in issue #145. A passing build or historical screenshot does not certify the final rendered page.

Rollback is the preceding tested main commit through the repository's normal release process; never replace main with the historical preview branch. Future agents must start from this reconciled source plus the newest issue #145 checkpoint, not treat an older sparse fallback page as the approved design.
