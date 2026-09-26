# Phase G — Organic Wave A draft release

Date: 2026-09-26

Release code: `organic-wave-a-20260926`
Release version: `1`
Release ID: `956c5d0f-7b6f-5489-ba24-2e48d5594509`
Release hash: `5e25b0125182dd56e58eb438520f1d0b8352f36c564fe3b8dab9914b8d5e534d`
Target origin: `https://thefeya.com`
Source commerce release: `feya-review-207-20260924`

Status: **GATE_FAILED / NOT AUTHORIZED FOR INDEXING**

This release is intentionally an organic-search wave. Checkout/order/payment is explicitly outside Wave A scope and does not become active through this release.

## Proposed index candidates — 18

Brand / navigation:
- /
- /collections

Commercial landing owners:
- /collections/shoulder-armor
- /collections/festival-outfits
- /collections/rave-outfits
- /collections/burning-man-looks
- /collections/stage-outfits
- /collections/bodysuits
- /collections/costume-masks
- /collections/costume-headpieces
- /collections/festival-skirts
- /collections/costume-belts

Trust / support:
- /about
- /size-guide
- /care
- /shipping
- /returns
- /contact

## NOINDEX dependencies — 210

- /shop
- /cart
- /account
- 207 exact sealed-release PDPs

The product pages remain crawlable dependencies of the collection graph but are not Wave A index candidates.

## Explicit future exclusions

Not in Wave A:
- /guides/what-to-wear-to-burning-man
- /terms
- /privacy

The Burning Man guide has passed the official-source research gate but has not been drafted/CQA-passed.
Terms/Privacy remain blocked by real missing facts rather than invented templates.

## K01–K20 snapshot

PASS:
- K03 reproducible immutable release scope
- K08 landing intent/ownership/inventory evidence
- K09 server-rendered main content/product links
- K15 current structured-data truthfulness

EXCLUDED_APPROVED:
- K06 checkout/order/payment: intentionally outside Organic Wave A

FAIL at v1:
- K01 exact deployment SHA not bound
- K02 canonical production host anonymous proof not bound
- K04 release-wide truth/media parity proof not attached
- K05 UI/server/order parity incomplete because order creation is off
- K07 Terms/Privacy/contracting-seller identity incomplete
- K10 exact anonymous crawl/reachability proof pending
- K11 release binding across all candidate page families incomplete
- K12 release-aware index-state activation not yet implemented at v1
- K13 release-aware sitemap activation not yet implemented at v1
- K14 full anonymous dead/private/soft-404 crawl pending
- K16 exact release auth/RLS/API CI proof pending
- K17 exact release mobile/keyboard/performance proof pending
- K18 measurement/consent/environment pipeline incomplete
- K19 domain/GSC property verification incomplete
- K20 Human Owner launch approval/receipt and activation postflight do not exist

## Code changes after v1 manifest

The implementation has since moved beyond the v1 gate snapshot:

- root metadata now fails closed to noindex;
- only an ACTIVE immutable release can opt an exact path into indexing;
- sitemap reads only ACTIVE release INDEX_CANDIDATE items;
- robots advertises sitemap only when an active release exists;
- Home, Collections and trust pages use release-aware metadata;
- Shop/PDP/cart/account remain noindex dependencies;
- /cart and /account now exist as truthful pre-launch routes;
- the public footer no longer links to private /admin;
- header/footer routes now prefer evidence-backed collection/trust owners instead of placeholder filters where ownership exists.

These improvements must be captured in a **new release version**, not silently back-written into v1.

## Next version rule

Create Wave A v2 only after:
1. exact-head GitHub CI + Vercel build pass;
2. anonymous preview crawl confirms all 18 candidate routes and 210 dependencies behave as intended;
3. release-aware metadata/sitemap behavior is proven;
4. any remaining K-gate evidence is attached.

Do not mutate v1 into a fictional PASS history.
