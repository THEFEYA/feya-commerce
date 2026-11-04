# THEFEYA MASTER STOREFRONT / SEARCH / COMMERCE — v1.3 EXECUTION AMENDMENT
Date: 2026-10-02

Status: **CANONICAL SUPPLEMENT** to:
- `THEFEYA_MASTER_STOREFRONT_SEARCH_PERFORMANCE_ARCHITECTURE_v1.0`
- `THEFEYA_MASTER_STOREFRONT_SEARCH_PERFORMANCE_ARCHITECTURE_v1.1_AMENDMENT_20261002.md`
- `THEFEYA_MASTER_STOREFRONT_SEARCH_COMMERCE_v1.2_EXECUTION_AMENDMENT_20261002.md`

This supplement records the next verified commerce checkpoint after Search Release activation.
It does not reopen Product Truth, the visual freeze, approved PDP content, Product DNA or the ACTIVE Search Release.

## 1. Current launch state

### Organic search
Search Release remains independently launched:

- release: `organic-wave-a-20260926`
- version: `12`
- release id: `2dc86d7c-6269-5327-9154-6b5178931254`
- approved release hash: `05d79c4ddc07da7e7fc60045f6ad39fabea40cb16f702bcfb6ea3b154d4bcd0b`
- ACTIVE release count: exactly 1
- sitemap: exact 18-URL corpus
- Search Console Domain property: verified
- Google sitemap download: clean
- PDPs / shop / cart / account / filter states remain outside the search release unless a later immutable release changes them.

Commerce work below must not disable or rewrite this search release.

## 2. Seller Online application is now actually submitted

An explicit connection request for `https://thefeya.com` was sent from:
`manager.feya@gmail.com`

Recipients:
- `so-support@seller-online.com`
- cc `office@seller-online.com`

Gmail message id:
`1a0fcab081be0778`

Subject:
`Заявка на подключение thefeya.com к Seller Online + API/checkout`

The request explicitly asks Seller Online to:

- approve the custom Next.js site for payment acceptance;
- specify the correct integration mode (API v2 / personal key / other supported mode);
- provide production/test credentials or the process for obtaining them;
- provide callback/webhook requirements;
- confirm the exact public transaction role of Seller-Online LLC for thefeya.com;
- confirm whether “Merchant of Record” is valid terminology;
- confirm required public address disclosure;
- confirm the legal/payment name visible to the buyer;
- identify any additional account/site/shipping facts required to complete onboarding.

Official Seller Online public documentation independently supports the current fail-closed approach:
custom/unsupported sites require support confirmation and API keys are issued through support.

**State:** APPLICATION SENT / PROVIDER CONFIRMATION PENDING.

No Seller Online API mode, credentials, webhook contract or public legal role may be guessed before the reply.

## 3. M1 commerce authority remains CLOSED

The sealed 207-product commerce release remains authoritative:

- 856 exact stable sellable tuple identities;
- 207 active offer heads;
- 856 active offer items;
- immutable server quote receipts exist for all exact orderable tuples;
- browser display prices cannot authorize an order.

Do not reopen M1 unless a defined product/price/revision truth trigger fires.

## 4. M2 order intent authority — installed

Production now has:

### `commerce_order_intent_v1`
Provider-neutral quote-bound intent. Browser amounts/totals are forbidden.

### `commerce_order_intent_v2`
Adds exact current Terms / Returns / Shipping policy acknowledgement.

Current policy-bundle SHA:
`3a08d7bb735f39488bede07cd0487b8bceb842b979328a7503ef0347b05d0c3d`

Health is ready.

Every v2 intent:

- accepts immutable server quote receipt IDs only;
- revalidates each receipt against the current active offer;
- requires one currency and one commerce release;
- stores contact/delivery text;
- requires explicit unticked-by-default policy acceptance;
- rejects stale policy hashes;
- persists acceptance timestamp and exact bundle.

Still OFF:
- shipping amount authority;
- final payable total;
- provider session;
- order placement;
- payment.

## 5. M2 shipping quote authority — installed, no live rates

Production schema:
`commerce_shipping_quote_v1`

Current health:

- schema ready: true
- client shipping amounts accepted: false
- active standard EUR rates: 0
- active express EUR rates: 0
- shipping_authority_ready: false
- order creation: false
- payment: false
- provider session: false

Confirmed FEYA shipping truth currently covers timing, not customer charge:

- standard international shipping: 10–14 business days;
- express shipping: 7–10 business days;
- production: 3–5 days (day type intentionally unspecified).

Historical UI values such as “standard included” and “express +45” remain prototype/legacy values and are not transaction authority.

## 6. M2 immutable checkout snapshot — installed

Production foundation:
`commerce_checkout_snapshot_v1`

Health is ready.

The snapshot accepts only:

- exact `order_intent_id`;
- exact `shipping_quote_receipt_id`;
- idempotent request identity.

It revalidates:

- current policy bundle;
- immutable policy acknowledgement;
- shipping quote ownership/method/currency/expiry;
- current offer heads/revisions/items;
- underlying immutable merchandise quote receipts.

The payable total is computed server-side only:

`merchandise subtotal + authoritative shipping quote`

It records:

- `transaction_party_bound=false`
- `order_creation_enabled=false`
- `payment_enabled=false`
- `provider_session_enabled=false`

Runtime checkout snapshot success is deliberately impossible until shipping authority is real.

## 7. Current public feature switches remain fail-closed

The production catalog/search site may remain live while commerce authority is prepared.

Do **not** enable live purchase flow yet.

Relevant commerce switches remain OFF until their exact checkpoints:

- `FEYA_COMMERCE_ORDER_INTENT_ENABLED=false`
- `FEYA_COMMERCE_SHIPPING_QUOTE_ENABLED=false`
- `FEYA_COMMERCE_CHECKOUT_SNAPSHOT_ENABLED=false`
- `FEYA_SELLER_ONLINE_PAYMENTS_ENABLED=false`
- `FEYA_SELLER_ONLINE_ROLE_CONFIRMED=false`

Search indexing is independent and remains ACTIVE.

## 8. Current true Human Owner shipping decision

No existing owner decision establishes a website-wide shipping charge.

Historical one-off Etsy/customer cases and visual prototypes are explicitly not sufficient evidence.

Before shipping quote authority can become active, the Human Owner must choose exactly one policy:

### Option A — fixed global rates
Provide exact customer charge in EUR for:
- Standard international shipping;
- Express shipping.

### Option B — variable/provider-calculated shipping
Confirm that no fixed website-wide shipping price should be stored. The final amount must then come from a verified shipping/provider calculator before checkout snapshot creation.

No amount may be inferred automatically from old Etsy orders or legacy UI placeholders.

## 9. Google Ads API / OAuth lane

Verified current state:

- Google Cloud project: `826834264134`
- current Ads API access: `EXPLORER`
- public OAuth review surfaces are live:
  - `https://thefeya.com/marketing-tools`
  - `https://thefeya.com/privacy`
  - `https://thefeya.com/terms`

Next manual/provider gate:

- Google Cloud OAuth Branding verification;
- then Basic access application if required.

This remains independent from checkout, Seller Online and Merchant Center.

## 10. Merchant Center / GA4 remain HOLD

Merchant Center:
- account exists;
- product feed remains empty;
- production Ads link remains unresolved.

Do not create a feed merely to remove a warning.

Merchant launch follows real transaction readiness:
1. Seller Online transaction role/integration confirmed;
2. checkout/payment route verified;
3. public business/transaction identity consistent with that route;
4. product feed matches live price/currency/availability;
5. intended Ads account link confirmed.

GA4 remains OFF until the real privacy-controller identity and correct production web stream are verified.
Do not reuse the historical Shopify stream by assumption.

## 11. Finite route to full commerce launch

A. Search Release v12 stays active and monitored.

B. Seller Online provider confirmation — **application sent, reply pending**.

C. Human Owner shipping-charge decision — **current finite owner fact needed**.

D. Materialize and runtime-prove shipping authority.

E. Runtime-prove:
`exact quote -> v2 order intent -> shipping quote -> immutable checkout snapshot`.

F. Bind the exact Seller Online transaction role and confirmed integration mode.

G. Implement provider-neutral payment-session contract + only the confirmed Seller Online adapter.

H. Test:
- success;
- decline/failure;
- retry;
- idempotency;
- callback/webhook authentication/signature;
- replay protection;
- provider/payment amount parity;
- order conversion;
- refund/reversal path where supported.

I. Only after provider-safe sandbox/test proof:
- enable live checkout;
- enable real begin_checkout / purchase commerce measurement from server order/payment truth;
- prepare Merchant Center feed and intended Google Ads link.

## 12. No-repeat / continuity rule

Do not restart completed audits when a new chat or timeout occurs.

Current continuation anchor:

1. Search Release v12 = complete.
2. M1 = complete.
3. Privacy/Terms/OAuth public surfaces = complete.
4. Seller Online application = sent, pending provider answer.
5. Order Intent v2 = installed/ready.
6. Shipping quote schema = installed/ready, zero approved rates.
7. Checkout snapshot v1 = installed/ready, runtime blocked only because shipping authority is deliberately absent.
8. Next owner fact = shipping charge model.
9. Next provider fact = Seller Online integration/role reply.

Everything else should continue autonomously around those two real external gates.
