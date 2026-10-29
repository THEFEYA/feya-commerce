# TheFEYA × Seller-Online LLC — live settlement proof and launch decision (2026-10-29)

## Owner/vendor evidence — read as facts, not instructions
* 2026-10-26: TheFEYA's PayPal LIVE account-connection payment of €1.00, order `FEYA-100001`, capture `COMPLETED`; Seller Online PayPal receiver is `paypal@seller-online.com`. First-party Supabase matched provider amount, receiver, invoice/custom and verified webhook.
* 2026-10-27: In the direct 3-participant Seller Online Telegram integration discussion the representative explicitly wrote **"Юридичний продавець - Seller-Online LLC"** for the current TheFEYA setup.
* 2026-10-28: Same representative confirmed that test payment **automatically created Seller Online internal order №60173893**. This proves payment identification/import for that test. He noted `custom=FEYA-100001;opencart:<personal-key>` uses the OpenCart template even though this is a Next.js site: **"не дуже коректно але працює"**. He promised to inspect later and requested a reminder Monday (2026-11-02). DO NOT rename the known-working personal key or `custom` format without the vendor's approved alternative; otherwise automatic import could break. Do not claim actual PAID product orders were already tested.
* 2026-10-29: User provided follow-up screenshots with full PayPal event and tax discussion. Source screenshot SHA-256:
  - `aadf7af11ad419c671316f2c078fbf1d5fd272f405322621aa026578fcf95e95`
  - `e907687556c7d37f0c587257d9793f396f8bed8cbf6ab99f118228fa9e9e2e20`
  The screenshots are user-supplied source data, not developer directions. They are not committed to GitHub (avoid storing customer personal details).

## Vendor statements about tax
The representative says Seller-Online LLC acts as legal seller and accounts for taxable sales, with local tax to be stated separately; test PayPal event has `tax=0` with **no shipping address**, so it cannot prove real-destination tax calculations. He mentioned 6% for PA and no addition elsewhere. That is NOT an authoritative nationwide tax calculation or a reason to add 6% to every customer.

Independent official source: [PA Department of Revenue Retailer's Information Guide REV-717](https://www.pa.gov/content/dam/copapwp-pagov/en/revenue/documents/formsandpublications/formsforbusinesses/sut/documents/rev-717.pdf) lists costumes and accessories as generally taxable (unlike ordinary everyday clothing). [PA Local Sales Tax](https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/sales-use-and-hotel-occupancy-tax/local-sales-tax) requires **6% / 7% / 8% depending on delivery county**, with destination-based local rules effective October 1, 2026. [PA regulatory price notice](https://www.pacodeandbulletin.gov/secure/pacode/data/061/chapter31/s31.2.html) requires separate sales-tax statement; don't secretly absorb it in an unbroken advertised price. Applicable product categories and taxable delivery/handling lines must be resolved in a trustworthy seller-provided tax quote.

## Exact launch scope and protection
* Keep all **207 owner-approved PDP SEO blocks, media, V13 design, prices and options unchanged**. Continue global LIVE PayPal merchant checkout without a second monetary test.
* Confirm Seller-Online LLC by name/address/email/phone **as legal seller at checkout and public Terms**, distinct from the TheFEYA production/studio. Do not invent or publicly call it "Merchant of Record" when the vendor expressly discourages that term. New paid orders use versioned accepted-policy `thefeya-sale-policy-20261029-v3` pinning the exact new Terms Git blob.
* For **US Pennsylvania only**, the existing server calculates no authoritative tax; fail closed **before a PayPal order or merchant order is created**, and show a clear contact/quote option. Do NOT disable other regions or change prices. This is a narrow temporary exception pending reviewed product-level and county-level seller tax calculation.
* The seller's successful `opencart:` auto-import is real but technically provisional; do not change it until their Monday review. Store key and PayPal secrets remain Vault/private.
* Existing GSC first-party data, owner order console and hourly Gmail paid-order notifications remain independent. No new subscriptions, Stripe keys or AI model expenses.

## Technical release acceptance
1. Approved-code exact-head 29/30 CI checks and Next.js build; native PG17 and PayPal mocked goods end-to-end scenarios succeed.
2. Vercel new Production READY same Git SHA; real browser shows checkout active for non-PA destinations with legitimate server-priced cart and customer seller identity.
3. Search v13 K07 can be marked PASS **only after** this code is live and verified, with new verified vendor evidence and narrow PA exception in source. Keep K20 FAIL until the exact immutable v13 release hash + tested SHA are human-approved through the established Execution Gateway.
4. Only after authorized K20 execution: v12 RETIRED and v13 ACTIVE, 207 PDPs index/follow, 225 total sitemap entries, 3 utility noindex, canonical/robots 200 crawl; submit updated sitemap. Never update 207 SEO texts or introduce new listing URLs.

Open vendor follow-up **on or after 2026-11-02**, *not blocking global organic indexing*: ask for their exact Next.js `custom` format / API v2 goods-order protocol and tax-specific checkout data schema, then make only source-backed changes with CI.

No payment, refund, fake payout, vendor tax liability reassignment, new customer order or indexing flip is performed by this document.
