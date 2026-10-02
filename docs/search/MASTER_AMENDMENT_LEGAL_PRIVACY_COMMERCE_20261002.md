# TheFEYA Master Architecture Amendment — Legal / Privacy / Seller Online Separation — 2026-10-02

Status: **CANONICAL SUPPLEMENT** to `THEFEYA_MASTER_STOREFRONT_SEARCH_PERFORMANCE_ARCHITECTURE_v1.0`.

Purpose: correct an earlier coupling between public trust pages, Google/OAuth review, search indexing,
analytics privacy readiness and commerce seller identity. This supplement follows the Master's conflict
resolution rule: current official platform requirements and live FEYA state override earlier generic assumptions.

## 1. What this amendment changes

The earlier launch-track wording treated a fully identified public legal seller as a prerequisite for every
Company/API-review surface. That is too broad.

These are separate gates:

1. **Search indexing** — governed by the ACTIVE Search Release, robots/canonicals/sitemap and technical crawl.
2. **Google OAuth / Ads API brand review** — needs a truthful homepage on a verified domain plus accessible
   Privacy Policy / Terms and accurate disclosure of Google user-data use. It does not require FEYA to invent
   or publish an inactive sole-proprietor registration.
3. **Production analytics** — remains disabled until the actual privacy-controller identity, consent behavior
   and the production GA4 web stream are confirmed.
4. **Commerce / checkout** — remains disabled until the transaction party, exact quote/order authority,
   payment integration and required legal/payment disclosures are active and verified.
5. **Merchant Center** — remains separate from organic Search Release. Product feeds / Shopping activation
   require a real purchasable flow and consistent business/checkout information; zero-product Merchant state
   is not a launch defect for organic search.

## 2. Public Privacy / Terms policy

`/privacy` and `/terms` must be publicly reachable even when FEYA has no currently approved public legal
seller identity.

They must:

- identify TheFEYA as the storefront brand/studio contact;
- expose the current support/privacy contact email;
- state truthfully that online checkout/payment is not active when it is not active;
- not present an inactive former sole-proprietor registration as the current seller;
- not present Seller Online as an active transaction party before the provider role/integration is confirmed;
- remain `noindex,follow` unless a later Search Release explicitly promotes them;
- describe Google API/OAuth data use accurately enough for the actual internal Ads tool;
- never claim that optional GA4 collection is active while its privacy gate is closed.

## 3. Privacy-controller gate remains independent

Publishing a public Privacy page does **not** mean GA4 may be enabled.

Production analytics remains fail-closed until all are true:

- actual privacy-controller identity is confirmed for the active site;
- consent behavior is approved and tested;
- the correct production GA4 web stream / `G-...` Measurement ID is verified;
- environment isolation is proven;
- the existing FEYA analytics event contract passes runtime validation.

No old Shopify GA4 stream may be reused by assumption.

## 4. Seller Online role

Current provider evidence supports describing Seller Online LLC, when the integration is actually enabled,
as a buyer/reseller/shipper/direct payment recipient under the applicable Seller Online terms.

Do **not** label Seller Online `merchant of record` unless that exact role is confirmed for `thefeya.com`.

Activation now requires two independent production flags:

- `FEYA_SELLER_ONLINE_PAYMENTS_ENABLED=true`
- `FEYA_SELLER_ONLINE_ROLE_CONFIRMED=true`

A payment flag alone must not make Seller Online appear publicly.

## 5. Google OAuth / Ads API review

The current Ads API track is an internal TheFEYA tool, not a public advertising network.

For external production OAuth branding / Google Ads API access:

- homepage must be on the verified TheFEYA domain;
- Privacy Policy and Terms must be reachable on that domain;
- the homepage must link to the Privacy Policy;
- privacy disclosures must explain Google user-data access/use/storage/sharing truthfully;
- authorized domains must match the verified domain;
- production OAuth access level / Ads API access remains a separate provider review.

This review does not activate paid campaigns, Merchant Center or checkout.

## 6. Merchant Center

Merchant Center activation stays **HOLD** while any of the following remain true:

- product count/feed is zero;
- checkout cannot be completed;
- active Seller Online transaction role is unconfirmed;
- Merchant business identity would not match the actual transaction model;
- intended Google Ads account linkage is unresolved.

Do not create a feed merely to remove a Merchant warning.

## 7. Frozen visual contract

No visual redesign is authorized.

The only owner-approved storefront change in this amendment is a minimal footer legal-link update:

- expose `Privacy` and `Terms`;
- replace the stale `Pre-index storefront` text after Search Release activation;
- keep the existing footer composition, typography, spacing and visual language.

## 8. Current execution sequence

1. Keep Search Release v12 active and monitor GSC propagation.
2. Publish truthful noindex Privacy / Terms without forcing an inactive seller identity.
3. Keep GA4 disabled until controller identity + correct web stream are verified.
4. Obtain Seller Online confirmation for thefeya.com role/integration before checkout activation.
5. Finish quote -> cart/order -> provider-safe payment tests.
6. Only then prepare Merchant feed/linking and commerce analytics.
7. Phase 13 search decisions use measured GSC/GA4/commerce evidence; zero-day indexing data does not trigger rewrites.

