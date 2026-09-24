# C3.2 — shared closed review and server pagination

24 September 2026. Parent: `dbc46e33d88a541ee75a4186ff7861fe98c0f3d1`, PR #26.

## Outcome and authority

Home → Shop → eleven server-paginated pages → 207 PDPs now share one sealed review presentation. All 208 original source identities remain in the raw manifest, including the suppressed duplicate. This implementation is a closed review, not a public commerce release. `FEYA_CLOSED_REVIEW_RELEASE=off` is the default; only the exact release ID in an authenticated preview/development environment enables it. Hosted flags were not changed.

Trusted source SHA256: `6842ff45e4380758216f74cb309e557d68d5f6692a1206254beef954eab07440`.

Trusted corrected presentation SHA256: `28339e854bf9a1579d74284aa00bff1ade0ea75e18a6ac12929da2ca237230c3`.

The existing exact-ID correction layer is applied to detached snapshots. Recorded owner material for a83b1b51 is `Glossy Vegan Leather`; historical acrylic/plastic is not offered as a current material. Approved title/H1/description bodies remain exact. Configuration IDs, source amounts/currency, images and gallery order remain preserved. Per-product right-panel hashes and doctrine version bind the existing care/fulfillment rendering. This is not price verification, tuple availability or permission to purchase.

## Data flow and failure behavior

`readClosedReviewPresentation` authorizes the current user through Supabase Auth `getUser` and the existing allowlist before privileged reads. Each request revalidates all 207 exact draft IDs, page identities, current source product existence/path and product holds. The complete request is cached only within React's request scope; no cross-user cached authorization or shared live-state result exists.

A newer unrelated draft is ignored. Revoked/archived approval, microsecond version drift, direct approved-copy mutation, moved/removed product/page, hold, missing row, duplicate identity or query error blocks the whole release. A blocked active review never falls through to the legacy catalog. Off mode retains the prior path.

The public prop payload contains corrected product fields and approved prose, not raw draft rows, reviewer notes or agent snapshots. Source manifest and resolver stay server-only. Products remain preview-only with no Offer assertion and disabled purchase. Home and Shop also require authorization. Sitemap is empty for any requested closed release, including an unknown ID or mistaken production/index flags. Global indexing gate also recognizes closed review; robots cannot become permissive merely because another flag is enabled.

## Navigation and visuals

- Stable manifest order; 20 cards per page, 7 on page 11. Next/previous are real HTML anchors and work without JavaScript.
- `/shop?page=1` redirects to `/shop`; invalid/ambiguous or out-of-range pages return 404. Each valid pagination URL has its own canonical. All closed-review URLs remain noindex/nofollow.
- Existing filters are initialized on the server and retained in next/previous links. Filter changes reset to page 1. Unknown collection keys are rejected. Filtering uses the existing review semantics, not a DNA/intent approval system.
- Existing broken `/collections` links now point to the existing Shop and `/shop?collection=…` filter. No collection landing page is created or made indexable by this change.
- The ProductCard, ProductDetailClient, Header, global CSS, fonts and animations are unchanged. Existing Home/Shop/PDP/ShopClient class/style expressions and literal JSX text are checked against the parent baseline. The original PDP JSX baseline remains intact with only the explicitly normalized href repair. The full-file freeze hashes change only for the four authorized integration surfaces.
- Pagination reuses `btn-ghost`; the prior Show 20 more action retains its label. Previous 20 is available after page 1.

## Verification

Local: 14 targeted scenarios pass, including raw source integrity, all 207 corrected projections, preserved source prices/approved bodies, full pagination coverage, stale/revoked/missing sources, environment gates and visual contracts. Full exact-head CI and runtime evidence must be attached after the commit run finishes.

The existing real isolated Supabase/Auth/PostgREST/Next/Chromium suite is extended to crawl every page, render all 207 PDPs, deny anonymous/outsider access, test new drafts, direct mutation, revocation/archive, missing/moved products, no-JS navigation, hover/gallery interaction, mobile/desktop screenshots and hostile production flags. The existing 208-copy compatibility suite still runs separately in its prior mode.

Runtime uses loopback fixtures and pinned real copy/media URLs. Browser image responses are deterministic stand-ins; this verifies layout and URL/interaction behavior, not live CDN delivery, actual photo quality or production deployment. No tests write production. Exact source amounts are preserved but not certified as checkout quotes.

## Remaining limits and next dependency

The frozen review is not a DB release publisher or a variant-outbox consumer. Admin variant drafts do not silently alter this presentation. Next C4.3 must bind explicitly available configuration/color/size/material tuples and base-price/exception revisions to server quotes, then connect UI selections and cart. Source prices and historical option-color rows must not be treated as live sellable inventory.

Legacy review filters still contain prior taxonomy/time/sort labels. Their truth/DNA rewrite and unsupported bestseller/newness claims remain a separate pre-index gate; they are not endorsed by extracting their behavior for server parity. Domain/company/policies, actual checkout/payment, hosted schema/permissions and production GSC/GA/Ads capability still require their existing gates.

No production DB/schema mutation, merge, deployment promotion, source-price edit, description generation, indexing or payment activation.

## Rollback and completion

Disable the closed-review flag to leave the previous private review paths available; do not enable public indexing as part of rollback. Revert this code package for implementation rollback. Retain all source manifests, bindings and evidence; no reverse SQL migration exists. A new source/correction/metadata/media revision requires a newly prepared and verified presentation binding.

Done for this package only when its exact commit passes CI, the isolated browser crawl reports 207 pages/11 pagination steps, all negative scenarios pass, and screenshots are inspected. The authoritative variant/quote/payment/production rollout remains the next package.
