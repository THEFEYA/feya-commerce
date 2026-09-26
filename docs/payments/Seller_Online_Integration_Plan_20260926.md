# Seller-Online payment integration plan — 26 Sep 2026

Status: provider candidate prepared, credentials/application not yet active.

## Official provider facts

Legal entity: Seller Online LLC, registered in Pennsylvania, USA.

Seller-Online's current payment/CMS instructions state that merchants using its payment setup should display this contact address in the store footer or Contact Us area:

Seller-Online LLC
635 Somers Ave
Feasterville-Trevose, PA 19053
United States

US office:
+1 (267) 800-9048
office@seller-online.com

Support:
so-support@seller-online.com

Official documentation:
- https://seller-online.com/help/prijom-platezhiv-z-shopify/
- https://seller-online.com/help/integraciya-z-cms/
- https://seller-online.com/contacts/
- https://seller-online.com/privacy/
- https://seller-online.com/help/api-dokumentaciya-2/

## Commercial/payment role

Seller-Online's user agreement describes Seller Online LLC as a buyer/reseller/shipper of handmade goods and says customers may pay Seller Online directly, after which the seller's internal balance is credited.

Do not label this relationship as "merchant of record" in the FEYA UI or legal pages unless Seller-Online confirms that exact legal/payment role for thefeya.com application.

## Custom Next.js integration strategy

TheFEYA is not Shopify/WooCommerce/OpenCart/Tilda. Public Seller-Online docs confirm:
- custom/personal internet stores are supported through Seller-Online account configuration/personal keys;
- API keys are requested from support;
- Seller-Online publishes API v2 documentation;
- payment links can support PayPal and card/Stripe options;
- for other platforms, Seller-Online asks merchants to contact support to confirm technical compatibility.

Therefore the safe implementation path is:

1. FEYA finishes server-authoritative cart/order draft from exact quote receipts.
2. FEYA creates a provider-neutral payment-session interface.
3. Seller-Online adapter remains disabled until approval/credentials are issued.
4. After Seller-Online confirms thefeya.com integration method, implement either:
   a. hosted/personal payment link redirect; or
   b. direct provider/API integration if Seller-Online supplies an appropriate endpoint/credentials.
5. FEYA never sends client-entered price or currency as authority; the payment amount comes only from FEYA's persisted authoritative quote/order record.
6. Provider transaction/order references are stored with the FEYA order.
7. Payment webhooks/status callbacks must be idempotent and signature/auth validated according to Seller-Online's final integration contract.
8. Order/payment activation remains OFF until sandbox or provider-safe end-to-end verification succeeds.

## Provider disclosure gate

Code contains FEYA_SELLER_ONLINE_PAYMENTS_ENABLED.

Until Seller-Online actually approves/activates the store:
- TheFEYA /contact displays only the store contact email;
- Seller-Online LLC address is not presented as an active payment-service disclosure.

Once Seller-Online confirms this is required for thefeya.com and the integration is active, enable the flag and expose their official address/contact block.

## Dispute evidence

Seller-Online's dispute guidance emphasizes shipment tracking and evidence that the goods match the description. FEYA should retain:
- exact product/variant/configuration identity;
- authoritative quote receipt and amount;
- accepted policy versions/timestamp;
- customer measurements/customization request where applicable;
- order confirmation;
- pre-shipment QC/photo evidence when available;
- tracking/delivery evidence.

This complements, rather than replaces, mandatory consumer-law remedies.

## Human Owner contact

TheFEYA public store email:
manager.feya@gmail.com
