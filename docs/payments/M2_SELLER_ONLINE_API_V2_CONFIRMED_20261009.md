# Seller Online — official Next.js API v2 role and legal-page checkpoint

Date: 2026-10-09. **Owner-linked official Seller Online email #738609 received 13:28:24, from Seller Online support.** This response updates the old 2026-10-02 / 2026-10-08 ticket #403264, which previously had only a "technical department will respond" status.

## New authoritative written facts

- Seller Online explicitly confirms that TheFEYA's custom Next.js thefeya.com **can be connected** to the Seller Online payment processing system.
- **API v2** is the *sole current supported way* to integrate this custom platform. [Official Swagger](https://api.seller-online.com/swagger-ui/) and [API v2 guide](https://seller-online.com/help/api-dokumentaciya-2/).
- **Formal activation is NOT yet complete.** Seller Online instructs the owner to submit the custom-site registration at [https://my.seller-online.com/connect/other](https://my.seller-online.com/connect/other). API-key creation requests are made by email or through the Seller Online account [contact form](https://my.seller-online.com/contact.php); public guide expressly rejects requests through Telegram/Viber/webchat. No production or sandbox key has been supplied in this email.
- Seller Online's self-description for the arrangement is **Direct Payment Recipient / Reseller / Shipper**, with the role of payment intermediary and authorized distributor/logistics partner. Support *specifically discourages* the term **Merchant of Record (MoR)**. Do not publish MoR or assume they assume all merchant-of-record legal/tax duties.
- Recommended buyer checkout copy exactly: **“Payments are securely processed by Seller-Online LLC, our authorized payment recipient and logistics partner.”**
- Required payment-operator address disclosure (not the brand owner's personal/business address): **Seller-Online LLC, 635 Somers Ave, Feasterville-Trevose, PA 19053, United States.** Their support requests placement in Footer, Contact Us, Terms & Conditions and Privacy Policy, with appropriate role text before payment.
- This email does **not** definitively settle the transactional invoicing seller identity, tax, duties, refund ownership, currency support, exact webhook signature format, API v2 endpoint schema and rate limit, production/sandbox credentials, or whether account/onboarding KYC is complete. These are still explicit merchant release gates, not excuses to present unverifiable detail.

## Implemented in bounded legal-copy PR

`lib/sellerOnlineProvider.ts` holds the provider-confirmed role, source date, exact checkout sentence and integration/application links. Existing `isSellerOnlinePaymentsEnabled()` **still requires both explicit environment flags**; no public payment switch is enabled by publishing the name/address.

`components/Footer.tsx`, `app/contact/page.tsx`, `app/terms/page.tsx`, `app/privacy/page.tsx` show the provider's required address with an **activation-pending** qualifier when payments are OFF. When payments eventually pass their release gates, the exact recommended checkout sentence can be used, but no order/payment route has been introduced. Preserve the existing public design and SEO/Search v12. This is not a claim TheFEYA itself is registered in Pennsylvania, nor a substitute for confirming the actual data controller/seller of goods.

## Project sequencing

1. Human Owner **one-time external action**: complete Seller Online custom-store connection application via https://my.seller-online.com/connect/other; authorize keys and contractual operator details in the Seller Online account, never share API tokens/passwords in ChatGPT.
2. Engineering: use **API v2 spec as source of truth** for order session creation, status/receipt reconciliation, authenticated webhook verification/idempotent replay and refunds. If Swagger is inaccessible to the current read-only environment, inspect via authenticated Seller Online documentation after approved connection; **do not invent field names/endpoints** from unrelated payment providers.
3. Bind immutable TheFEYA order snapshot and current basket/discount/tax/packaging (€5 per extra distinct listing) + approved carrier shipping receipt + accepted policy versions before any external payment attempt. The public payment remains default OFF until successfully testing full transaction state transitions in sandbox and then owner-reviewed production.
4. The live shipping prerequisites remain [M2 delivery #81](https://github.com/THEFEYA/feya-commerce/issues/81) and [carrier proof #91](https://github.com/THEFEYA/feya-commerce/issues/91); 207 product manufacture assignments are already saved and frozen, Search v12 stays ACTIVE.

Source: original official received message under **“Re: Заявка на подключение thefeya.com к Seller Online + API/checkout [#738609]”**, manager.feya Gmail on 2026-10-09 13:28:24, and official public [Seller Online API guide](https://seller-online.com/help/api-dokumentaciya-2/).
