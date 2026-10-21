# TheFEYA × Seller Online — payment provider installation, checkout and confirmation (v2)

Date: 2026-10-21. Supersedes the information/settings-only implementation of PR #195–#198
(`/seller-online-integration`, the "save settings" panel, unbound PayPal Standard IPN inbox).

## 1. Research facts that decide the architecture

### Seller Online (verified from their public help pages and ticket #738609 notes in this repo)
- Seller Online is a **PayPal-based payment intermediary**: the buyer pays to **Seller Online's PayPal account**; Seller
  Online credits the merchant in its cabinet and acts as payment recipient / reseller / shipper.
- How a store is connected, per platform:
  - **WooCommerce** — built-in PayPal Standard, *PayPal email = Seller Online receiving email*, API fields left empty,
    unique invoice prefix, plus an "Order created" webhook to Seller Online.
  - **OpenCart** — PayPal Standard, payee = Seller Online email, `custom = "<order>;opencart:<PERSONAL_KEY>"`;
    the personal key comes from `my.seller-online.com/personal_link.php` ("CMS and personal online stores").
  - **Shopify** — Seller Online staff log into the store and connect **their PayPal account** to it (Shopify's PayPal
    partner onboarding) and install the Seller Online Shopify app.
  - **Custom site ("Other")** — application at `my.seller-online.com/connect/other` (has optional login/password fields
    for staff access to the site). Support (#738609) names API v2 as the way for custom sites; public API v2 notes and
    third-party integrations describe it as **orders/parcels/shipping**, not payment sessions. The Swagger UI is not
    machine-readable from this environment (robots / proxy), so no API v2 call is invented.
- Conclusion: in every platform the *money path* is PayPal → Seller Online's PayPal account, and the *store
  identification* is the custom/invoice reference carrying the store's personal key.

### PayPal (official developer pages)
- **Website Payments Standard (the buttons Seller Online documents for WooCommerce/OpenCart) is deprecated since
  January 2026**; PayPal strongly discourages onboarding new merchants on it (developer.paypal.com
  `/limited-release/multiparty/wps-deprecation/`, `/upgrade/wps/overview/`). Third parties report end-of-life
  around January 2027.
- Current integration: **PayPal Checkout / Orders API v2**. "Pay another account" is part of standard checkout:
  `purchase_units[].payee.email_address` sends the money to a different PayPal account
  (`/docs/checkout/standard/customize/pay-another-account/`).
- Webhooks are verified server-side with `POST /v1/notifications/verify-webhook-signature`; IPN by echoing the message
  with `cmd=_notify-validate`.

### Shopify / WooCommerce / OpenCart (functional contract reproduced, not their UI)
| Capability | Shopify payments app | WooCommerce gateway | TheFEYA implementation |
|---|---|---|---|
| Install / authorize | OAuth app install → provider onboarding page → `paymentsAppConfigure(ready)` | plugin + settings | invitation link → technician enters PayPal REST app of Seller Online (write-only, Vault) → **automatic checks** |
| Provider account proof | provider-side | none | OAuth token + unpaid payee-verification order (PayPal validates the payee) |
| Notifications | Shopify calls the app; app resolves sessions | IPN / webhooks | webhook **auto-registered** in the PayPal app; IPN for the fallback |
| Activation | merchant enables method | toggle | **DB-enforced**: only after a verified **live** test payment of the current configuration |
| Payment | redirect to provider page | redirect / fields | redirect to PayPal hosted page (cards or PayPal), server-side capture |
| Confirmation | `paymentSessionResolve/Reject` (final) | IPN updates order | capture response + signed webhook, idempotent, exact match of amount/currency/payee/invoice/custom |

## 2. What runs where

```
Bag (/cart) ── POST /api/checkout/quote ──► server re-prices from published PDP read model (no browser money)
     │
     └─ Pay ── POST /api/checkout ──► feya_pay_order_create_v1 (immutable snapshot, idempotency, rate limit)
                                   └─► PayPal POST /v2/checkout/orders (payee = Seller Online, custom = FEYA-n;opencart:KEY)
Buyer pays on PayPal ──► /checkout/return ── POST /api/checkout/complete ──► PayPal capture ──► feya_pay_record_payment_v1
PayPal ──► /api/payments/paypal/webhook (signature verified with PayPal; APPROVED → capture; CAPTURE.* / REFUNDED / REVERSED)
PayPal Standard fallback ──► /api/commerce/paypal/ipn (VERIFIED postback → same record function)
```

- Engine `paypal_checkout` (default, recommended) or `paypal_standard` (fallback, exactly Seller Online's documented
  OpenCart/WooCommerce fields). Same orders, same verification functions.
- Credentials: Seller Online's own PayPal REST app (entered by their technician; Vault; never readable back), or an
  optional TheFEYA app via `FEYA_PAYPAL_PLATFORM_CLIENT_ID/SECRET/ENVIRONMENT` ("pay another account").
- Emergency stop: `FEYA_PAYMENTS_KILL_SWITCH=true`.

## 3. Prices charged (server authority: `lib/payments/pricing.ts`)
Product option price exactly as on the published PDP (`readCachedStorefrontProductPresentation` + `sortedOptions` /
`optionPrice`); Standard €19 / Express €35 per order; €5 for each additional distinct listing; +€20 for AU / MX / NZ;
made-to-measure €15 per piece; gift card €10; gift box €25 (the published V13 bag). EUR; no tax line (Shipping policy:
duties/local taxes paid by the recipient where applicable).

## 4. Security invariants (tested)
- `feya_pay_provider_active_requires_verified_live_test` CHECK: payments can be active only with environment = live and
  a captured, matched live test payment **for the current configuration version** (+ credentials, payee and webhook
  checks for REST). Any configuration change bumps the version and pauses payments.
- No table is readable/writable by anon/authenticated/service_role; only SECURITY DEFINER functions with pinned
  `search_path`. Secrets only via `feya_pay_provider_runtime_v1()` (service_role).
- A payment is "paid" only if amount, currency, payee (email or merchant id), invoice and custom all match the order;
  otherwise `needs_review`. Second different capture → flagged `duplicate_payment`. Events de-duplicated.
- Same-origin checks on every browser POST; invitation token stored as SHA-256; HttpOnly SameSite=Strict cookie
  scoped to `/api/partner/seller-online`. Owner console requires the allow-listed admin session.

## 5. Tests
- `tests/payments/*.test.ts` — pricing, request parsing, PayPal request/response contract, REST client, IPN.
- `tests/payments-db/run.sh` — 66 SQL assertions on PostgreSQL (privileges, activation guard, state machine, refunds,
  rate limit, grants, upgrade path from the old panel incl. carry-over of already-entered values and links).
- `tests/payments-e2e/run.sh` — 13 end-to-end scenarios: real SQL + real server modules + PayPal contract double
  (install, wrong credentials, sandbox/live tests, activation, buyer purchase, double click, webhook forgery/replay,
  closed browser after payment, amount mismatch, cancel, declined card, tampering, config change pause, PayPal
  Standard fallback with receiver check).
- `tests/runtime/payments-production-smoke.mjs` (CI on every main deploy) — real HTTP on thefeya.com incl. a forged IPN
  that production must verify with PayPal and reject, CSRF refusal, real-product re-pricing.

## 6. Operating it
1. Database: apply `supabase/migrations/20261021200000_payments_provider_checkout_v1.sql` (owner step; this
   environment has no Supabase write access).
2. Owner: `/admin/payments` → "Создать ссылку" → send the link to Seller Online.
3. Seller Online technician (one link): PayPal REST app (Live) + receiving PayPal email + store key →
   "Сохранить и проверить" → "Тестовый платёж €1,00" → "Включить оплату".
4. Buyers see "Pay securely with PayPal" in the bag; owner sees paid orders in `/admin/payments`.

## 7. Known open items (not blocking first payment)
- Seller Online API v2 order/parcel sync: needs their API key + readable spec; extension point = paid order snapshot.
- Order e-mails (buyer/owner): no e-mail provider configured; PayPal sends the buyer receipt; owner console shows orders.
- Legal: privacy-controller identity (`FEYA_PRIVACY_CONTROLLER_*`) is still the owner's open item from M2 #100.
