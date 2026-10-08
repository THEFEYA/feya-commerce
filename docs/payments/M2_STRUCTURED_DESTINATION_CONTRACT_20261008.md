# M2 — structured destination → shipping-v2 precondition (slice 1 of Issue #81)

Date: 2026-10-08. Owner-specified business rates remain Standard **€19**, Express **€35**, AU/MX/NZ +€20 per eligible parcel, SA normal if served. All tariffs remain gated on exact approved owner delivery profile (currently 0 approvals). The active Search v12, Product DNA and visuals are frozen.

## Reuse instead of duplicating the older commerce flow

Existing `commerce_order_intent_v2` accepts one free-form address and policy bundle; existing `commerce_checkout_snapshot_v1` still binds the old non-geographic global shipping v1. They are not authorized successors for current destination-sensitive EUR shipping v2. The already-installed `feya_commerce_approved_shipping_quote_receipts_v2` privately stores country+postal+method+expiry+exact price/approval/basket evidence, but does **not** contain a full private customer postal address and is **not payable**.

## This PR's exact scope

- Pure deterministic `commerce_checkout_destination_v2` normalization for full recipient, email, optional phone, structured address line(s), city, region, ISO country and postal.
- Exact no-extra-field validation: browser must never pass tariff, price, discount, currency, tax, quantity, timetable, island surcharge or `payment_enabled` flags through destination input.
- Precondition checks with a **trusted service-only shipping-v2 row**: country, normalized postal, SHA256 of `{country,postal_code}`, chosen Standard/Express, EUR currency, expiry against server/DB time, and all three payment/provider flags still false. No use of buyer's browser clock or client-carried quote amount.
- Short deterministic failures without exposing recipient PII. Address fields do **not** enter destination hash used for shipping rate authority; complete contact/address stays private.
- Unit tests for shape, normalization/leading zeros, mismatch, expired quote, wrong method/currency, and nonpayable flags.

No new public API route or database mutation; no order, payment, merchant/webhook, GA4 event, or tax/discount assumption. This is **necessary but not sufficient** for checkout.

## Remaining Issue #81 milestones

1. New additive private data schema for complete address + service contact, exact country/postal/parcel/method policy acceptance evidence and binding to order intent and shipping quote v2.
2. Lock/revalidate current approval head, current offer head/variant, shipping-v2 expiry/basket/destination, consent/policy bundle **atomically** before writing immutable order intent and checkout snapshot successor; revalidate on future payment session.
3. Tax/discount/service authorities must be explicit by market and provider; do not silently substitute zero. Seller Online ticket #403264 remains pending.
4. Execute isolated PostgreSQL concurrency, private roles, authenticated browser and current Search v12 release tests, on exact commit; production flags remain OFF until independently reviewed merchant proof.

**Owner-only prerequisite** (not authorized to spoof): owner confirms final served countries, production cutoff and parcel capacity and saves/approves versioned EUR delivery profiles in `/admin/company/delivery`. Current production has 0 saved owner delivery drafts and 0 approvals.
