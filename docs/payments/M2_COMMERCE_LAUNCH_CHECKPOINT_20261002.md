# M2 Commerce Launch Checkpoint — 2026-10-02

> Current continuation: [2026-10-07 launch checkpoint](../search/LAUNCH_READINESS_AND_NEXT_STEPS_20261007.md). Checkout snapshot is installed in production; Seller Online acknowledged ticket #403264, with technical confirmation pending. Human Owner chose calculated shipping before payment on 2026-10-07. Next dependencies are the verified dynamic shipping calculator/adapter and provider integration/role confirmation; do not seed fixed rates or repeat the snapshot merge task. Older owner-fact sections below are historical.

Status: **CHECKOUT AUTHORITY CHAIN IN PROGRESS / LIVE PAYMENT OFF**

This checkpoint is the continuation anchor for the finite launch objective. It must be read together with:
- `docs/search/FEYA_Launch_Critical_Path_20260925.md`;
- `docs/search/MASTER_AMENDMENT_LEGAL_PRIVACY_COMMERCE_20261002.md`;
- `docs/payments/Seller_Online_Integration_Plan_20260926.md`;
- Phase 12/13 post-launch search checkpoints.

## Finite launch objective

The commerce launch is complete only when a customer can:

1. choose a real sellable FEYA configuration;
2. receive an exact server-authoritative merchandise quote;
3. accept the exact current Terms / Returns / Shipping policy bundle;
4. receive an authoritative shipping quote;
5. receive an immutable exact checkout total;
6. enter the confirmed Seller Online payment flow;
7. complete a provider-safe sandbox/test purchase;
8. produce a persisted, auditable paid-order/payment result;
9. pass callback/webhook replay, signature/auth and failure recovery checks;
10. only then expose live checkout.

Organic Search Release is already active independently and does not wait for this commerce lane.

## Closed foundations

### M1 — product / variant / offer / quote authority

Closed for the sealed 207-product release:

- 207 product heads;
- 856 exact sellable tuples;
- 856 active offer items;
- 856 server quote paths;
- browser prices cannot authorize an order.

### Search / public trust

- Search Release v12 is ACTIVE;
- exact 18-URL sitemap submitted and downloaded by Google;
- strict ACTIVE production crawl passes;
- Privacy and Terms are public noindex/follow trust surfaces;
- GA4 remains disabled until the real privacy-controller identity and production web stream are confirmed.

## M2 authority chain installed

### 1. Quote-bound order intent v2

Production database health: ready.

It accepts only:
- quote receipt IDs;
- customer contact/delivery text;
- shipping method choice;
- exact current policy-bundle hash;
- explicit true policy acknowledgement.

It rejects browser prices/totals and revalidates current offer authority.

Current policy bundle SHA:
`3a08d7bb735f39488bede07cd0487b8bceb842b979328a7503ef0347b05d0c3d`

Order/payment/provider session remain OFF.

### 2. Server-owned shipping quote authority

Production schema is installed and healthy.

Current deliberate state:
- active standard EUR rate count: 0;
- active express EUR rate count: 0;
- shipping_authority_ready: false;
- client shipping amounts accepted: false.

Historical UI values such as “standard included” and “express +45” are not transaction authority.

### 3. Provider-neutral checkout snapshot

Engineering package exists and is under CI.

The snapshot accepts only:
- order intent ID;
- shipping quote receipt ID.

It revalidates:
- current policy bundle;
- immutable order-intent policy acceptance;
- shipping quote ownership/method/currency/expiry;
- current offer heads/revisions/items;
- exact merchandise quote receipts.

The exact total is computed server-side only.

It still records:
- transaction_party_bound=false;
- order_creation_enabled=false;
- payment_enabled=false;
- provider_session_enabled=false.

## Seller Online external lane

A written support request was sent from `manager.feya@gmail.com` to:
- `so-support@seller-online.com`;
- cc `office@seller-online.com`.

Requested confirmations include:
- custom thefeya.com support;
- payment-links vs API v2 mode;
- API/test credentials and callback/webhook documentation;
- exact Seller Online buyer/reseller/shipper/payment-recipient role;
- whether “Merchant of Record” is valid terminology;
- required public address disclosure;
- receipt/card-statement seller identity;
- Google Merchant Center requirements.

Do not guess the adapter until this reply arrives.

Current official public Seller Online documentation confirms:
- API keys are issued through support;
- API v2 exists;
- unsupported/custom marketplaces/sites require support confirmation;
- Seller Online contact disclosure is required for supported payment integrations.

## Current Human Owner fact still required for shipping

The active FEYA business-truth registry confirms timing only:
- standard international shipping: 10–14 business days;
- express: 7–10 business days.

It does not contain a canonical storefront shipping charge.

Before a fixed-rate shipping quote can become active, the Human Owner must decide one of:

A. exact global EUR flat rates for standard + express; or
B. no fixed rate — shipping varies and must come from a verified provider/calculator.

No amount will be inferred from old Etsy orders or historical UI placeholders.

## Google Ads API parallel lane

Public OAuth brand-review surfaces are live:
- `/marketing-tools`;
- `/privacy`;
- `/terms`.

Google Cloud project:
`826834264134`

Current documented API access:
`EXPLORER`

Owner/Google Cloud UI action remains:
- External + In production;
- Branding home = `https://thefeya.com/marketing-tools`;
- Privacy = `https://thefeya.com/privacy`;
- Terms = `https://thefeya.com/terms`;
- authorized domain = `thefeya.com`;
- Verify Branding -> Publish branding;
- then apply Explorer -> Basic.

This lane does not activate campaigns or commerce.

## Merchant / GA4 holds

Merchant Center:
- account exists;
- zero products;
- no production Ads link;
- feed activation stays HOLD until live checkout/business identity/payment truth exists.

GA4:
- code contract exists;
- production measurement remains OFF;
- old Shopify stream is not reused by assumption.

## Next execution order

1. Finish/merge provider-neutral checkout snapshot package.
2. Materialize exact shipping authority after owner/provider rate decision.
3. Create and runtime-prove checkout snapshot.
4. Bind confirmed Seller Online transaction role + integration mode.
5. Add provider-neutral payment-session contract and exact Seller Online adapter.
6. Sandbox/test purchase + callback/webhook failure/replay proof.
7. Activate live checkout only after postflight.
8. Then Merchant Center feed/linking and production commerce analytics.
