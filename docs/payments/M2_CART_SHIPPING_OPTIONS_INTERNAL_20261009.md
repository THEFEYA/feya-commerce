# M2 — cart-level shipping choices from approved owner prices and per-product manufacturing

Date: 2026-10-09. Internal slice of [Issue #81](https://github.com/THEFEYA/feya-commerce/issues/81). Public shop visual, Search Release v12, Product Truth and 207 saved manufacturing assignments remain unchanged.

## Contract

`lib/commerceCartShippingOptions.ts` is an internal, **not mounted to a route**, owner-approved shipping preview for a **single basket and destination**. Browser-shaped input has only `quote_receipt_ids`, `country`, `postal_code`, and an exact contract ID. Browser may NOT provide shipping currency/amount, quote IDs for a different basket, product quantities, production readiness, preferred dates, or rate approvals.

For the same immutable merchandise receipt IDs + normalized destination, request current service-only `resolveApprovedDelivery` twice, once for `standard` and once for `express`. Both resolutions must:
- reference the same exact approved delivery ID/revision/workspace version, same current offer/product basket hash and same destination fingerprint;
- use an approved EUR currency and protected server amount, rather than client money;
- calculate manufacturing readiness from all selected products and their actual saved production profiles, waiting for the **slowest ready item in a shared parcel**, then dispatch and method transit working days Mon–Fri;
- present `estimated_arrival` as a **non-guaranteed window**; never guarantee event-day arrival;
- refuse any stale/offline approval, price, current quote or country/method serviceability drift. A specifically unavailable method may be omitted, but never replaced with a guessed rate.

Return a **draft_only, payable=false** comparison of Standard/Express options, with all payment/provider/public-rate flags false. No provider session, order creation, tax calculation, discount, handling fee, or customer-side route is enabled here. The existing full-country served allowlist must be verified from actual carrier coverage before this can serve any destination publicly.

## Additional listing fee

Owner proposed an extra 5 for each **distinct listing** beyond the first, NOT per variant and NOT per parcel. Currency is not resolved: last conversation said $5 while merchandise and confirmed shipping base are EUR. No handling amount or extra fee is invented in this module. Store and tax the fee only after explicit currency and versioned owner-price approval; apply exactly once per order to authoritative canonical product IDs.

## Next milestone

Only after approved rate/serviceability and precise owner parcel capacity: private durable checkout intent with structured address, current policy acceptance, explicit tax/service/discount eligibility and independent immutable order snapshot; recheck everything in one DB transaction at provider handoff. Until Seller Online #403264 confirms actual merchant/tax/webhook model, purchases stay OFF. The new cart selector is a nonpayable server abstraction, not a live shopper widget.
