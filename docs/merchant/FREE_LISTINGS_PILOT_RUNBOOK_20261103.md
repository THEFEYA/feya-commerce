# TheFEYA — Google Merchant Center free-listings pilot | 2026-11-03

**Status:** SOURCE-VERIFIED PREPARATION ONLY, **NO PRODUCT FEED PUBLISHED**, **NO PAID ADS**, **NO CHANGES TO LIVE STORE**. This plan is subordinate to immutable approved Search v13 / 207 PDP copy, original V13 storefront visual, Product Truth, published EUR prices/options, Shipping V13 and Seller-Online LLC live checkout. Owner requested Merchant preparations, not permission for unverified pricing/content rewrites or paid campaigns.

## Production evidence

- GitHub main `fc4d77815e8cdd9cab4c73b58a15bad7fc8f5bfe` and matching Vercel Production READY. Supabase `ysnizcgzhdwdfdkjkhud`.
- Search v13 ACTIVE, 207 indexed-intent products and 18 other indexed-intent pages; this is Google crawl permission, not evidence 207 products are already indexed.
- Google Search Console owner property `sc-domain:thefeya.com` read-only, sitemap last downloaded Oct 31: 225 submitted URLs, 0 sitemap warnings/errors. Google had not yet indexed most product pages as of Nov 3.
- Seller-Online LLC is the **legal seller** in live /terms and PayPal payee, independently confirmed by service technician. Seller Online auto-imported original EUR1 live connection test as internal order `60173893`. No real paid merchandise customer order yet. No additional charged testing permitted.
- Live public `/shipping` is **NOT** legacy `app/shipping/page.tsx`: the explicit `next.config.ts` beforeFiles rewrite serves **`app/shipping-public-v13/page.tsx`** (owner-approved visual). Standard **EUR19** and transit **10–14 working days**, Express **EUR35** and transit **6–9 working days**, typical production **3–5 business days**. + EUR5 for every additional distinct product listing on a mixed order; only AU/MX/NZ remote + EUR20, enforced in current server `lib/payments/pricing.ts`.
- `/returns` preserves mandatory EU withdrawal for eligible standard products (typically 14 days upon receipt) and valid personalised/made-to-measure exceptions; it does **not** claim all standard-size handmade goods are exempt. Voluntary / defective returns differ.
- All 207 storefront product-card snapshots: EUR and original external image URL and price present. All 207 have **2–8 individual priced configurations** (856 rows total). Prior verified server price/checkout integration tests passed, but dataset `price_confidence_status=unverified` for those imported source-option price rows is an **evidence/provenance label**, not an assertion the checkout is wrong. Pilot products selected for Full Set displayed price = card display price only; per-variant URLs remain to be addressed.

## Google Merchant Center account and owner access

Historical account found in phase12 postflight (Oct 2): display name **FEYA**, Merchant Center account **5322859215**, historical products=0 and Google Ads not linked. Do not treat historical count as current.

**2026-11-03 updated after owner connected and selected the account in HYPD:** Direct HYPD Merchant account listing returned **FEYA** `5322859215` as the *selected and readable* existing account. Direct API readbacks: `merchant_center_list_products` returned **0 products**, `nextPageToken=null`; `merchant_center_summarize_issues` scanned 0 products, found 0 product issues; `merchant_center_list_account_issues` returned exactly **one issue**, `missing-ad-words-link` with title `No Google Ads account linked`, and `impactedDestinations=[]`; `merchant_center_list_ads_links` returned none. This account issue concerns **paid ads only**, not a reason to connect Google Ads or buy ads for FREE listings. There are currently **zero Merchant product listings**, so no free-product exposure should be claimed. The Google Search Console account is deselected in HYPD to fit the one-account Free plan but remains connected; this does not change Search v13 indexation. HYPD Merchant integration is **read-only**, so cannot verify or modify the Merchant business-address/domain claim, saved shipping/returns, free-listings opt-in, product sources, or submit products. Existing authenticated Merchant Center UI or a separate authorized Merchant API write capability is required for these actions. Do not create a new FEYA account, buy HYPD, or link Ads as a prerequisite.

**Free listings ONLY**, spend EUR0. Do not link Google Ads or start a Shopping campaign as a substitute for completing Merchant data checks.

## Source truth and actual Merchant blockers

1. **Account business/trader identity.** Google account's verified entity, domain, payments, customer-service email and physical seller address must agree with website and evidence. TheFEYA is PRODUCT BRAND / manufacturer. Seller-Online LLC = LEGAL SELLER, 635 Somers Ave, Feasterville-Trevose PA 19053, USA, `office@seller-online.com`, `+1 (267) 800-9048`; TheFEYA workshop/customer support `manager.feya@gmail.com`. Verify current account / domain claim rather than impersonate a registered LLC or replace product brand.
2. **Actual fulfillment and origin.** Goods manufactured in Ukraine, cross-border delivery through current carrier/Seller Online arrangements. Do **not** imply physically stocked/manufactured in PA just because seller's office is in Pennsylvania. Confirm handling + transit calendars and actual supported routes in Merchant account. For first **US** pilot, confirm EUR 19/35 + production 3–5 + actual transit 10–14 or 6–9 separately. EU/UK expansion after truthful destination-specific tax/import and returns review.
3. **Return-policy mapping.** Merchant policy settings must mirror /returns, including buyer-remorse return eligibility and an explicit window/cost/method, custom-made exclusions using appropriate exception labels where valid. Do not enter blanket `nonreturnable` for standard-size ready-to-order costumes; do not promise US free 30-day remorse returns that the store doesn't offer. International return-shipping costs may matter.
4. **The actual feed variant chosen must be selectable on landing at price advertised.** Current `components/ProductDetailClient.tsx` initializes a manual `configKey` selector for multi-option products. NO verified preselected-configuration public deep link. All 207 products offer 2–8 configurations; `Full Set` and `Top only` are **different pieces/bundles**, not automatically mere size/color variations. Do not create 856 guessed variants or advertise a Full Set if default PDP shows another variant price. Add *reviewed, no-visual-change* variant deep link using exact original source `configuration_id`, select correct color/size/price, and test both initial SSR metadata/JSON-LD and buyer-repriced cart. Consider only source-verified configurations and initial pilot 10–12 full-set offers.
5. **Structured data.** Current `app/shop/[slug]/page.tsx` Product + BreadcrumbList markup has no `Offer` `price`, `priceCurrency`, `availability`, or true variant linkage; leftover Phase11 comment says payments disabled even though payment is active. Merchant rich result markup must reflect actual purchasable configuration. Add only source-backed, reviewable JSON-LD after exact checkout price and availability are known. It must never invent "InStock" for custom made-to-order stock; follow Google's valid `PreOrder`/`BackOrder`/other applicable schema state as supported by actual product fulfillment.
6. **Sensitive imagery.** Mixed festival/drag/cosplay imagery may have suggestive poses or covered undergarments/harnesses; audit individual product photos; apply appropriate adult attributes to affected items without labelling whole brand as adult or uploading inappropriate listings. Preserve original approved photos unless the owner explicitly approves replacements. Google external image URL accessibility and absence of watermarks/advert overlays must be checked.
7. **Identifiers and apparel attrs.** `brand=TheFEYA`, assigned product `id` stable from canonical uuid/configuration ID. No invented GTIN/MPN. Only `identifier_exists=no` when these handmade products genuinely have no assigned GTIN or applicable identifier. Color/size/gender/age group as applicable, only exact selected SKU truth. Don't infer size and gender from a title for entire component set.
8. **Pricing.** Owner-approved buyer charges in EUR unchanged. Seller tax deductions do not mean `tax_minor=0` may be represented as no tax owed by seller. The user must see complete product + shipping/extras before paying; Merchant data price must reflect exact chosen offer, never a more expensive Full Set after click. Multi-product EUR5 handling is basket-specific, not universal per-offer shipping. Do not fabricate promotional `sale_price`.

## Existing approved, source-checked Full Set candidate shortlist (HOLD)

A separate four-sheet owner workbook, `TheFEYA_Google_Merchant_Pilot_2026-11-03.xlsx`, was generated in the user's conversation (NOT a live Merchant feed). It has **12 specific products with pinned canonical IDs, immutable links/images, Full Set configuration IDs and exact EUR product prices**, plus country-policy and source checks. Candidate identity keys are in the approved snapshot `public.feya_storefront_product_details_v1` joined to `public.feya_storefront_product_card_snapshots_v1`.

Two examples (NOT published as Merchant products):
- `best-festival-armor-outfit-leather-shoulders-skirt-gold-metallic-harness-rave-armor-wear-burning-man-clothing-festival-accessories-4340584466`: Full Set `aead53be-a274-40be-be01-fde8716f02f2`, exactly EUR 195.40.
- `gladiator-cosplay-costume-set-men-s-armor-outfit-desert-warrior-wear-golden-leather-shoulders-skirt-for-men-futuristic-male-armor-4352690758`: Full Set `579e883a-bb27-4b09-b38e-2bd38f67ec15`, exactly EUR 239.27.

Do not upload the owners' sample workbook as Google CSV: all rows HOLD until validation is completed. It is for data truth, not an activation artifact.

## Release checklist (sequential)

- **M0** DONE HYPD account selection: FEYA #5322859215 directly accessible, products=0, only `missing-ad-words-link` issue (Ads-only). **Still required in Google Merchant Center UI:** read registered legal seller/business identity, verify/claim `thefeya.com`, actual shipping/return policies, free-listings marketing method, product-source inventory. HYPD cannot edit these (NO Ads).
- **M1** Resolve country-specific Merchant policies against currently live `/terms`, `/returns`, `/shipping`; record seller account match and production/fulfillment time truth; avoid unapproved amendments to owner's policies.
- **M2** Implement controlled exact-variant deep link with validated option ID, truthful initial selected display price, real shipping/returns and Product+Offer schema. Preserve storefront visual/CSS, copy and pricing. CI tests for 12 pilots + 207 approved manifest + 856 existing priced configs, no new charged payment tests.
- **M3** Build validated feed for 10–12 qualified Full Set offers with stable offer IDs and no fabricated GTIN/attributes. Upload/activate only to free listings via authorized Merchant UI/API or user-authorized agent. Read actual product status and warnings; fix actual Google findings.
- **M4** Expand to permitted 207 products only once exact variant mapping, photo policy, shipping/returns, business identity and real product-status approvals are proved. The Merchant feed and organic Search Release v13 are independent. Only run paid Shopping after the owner explicitly chooses budget and targets.

## Google primary references (verified 2026-11-03)

- Free listings: https://support.google.com/merchants/answer/13889434?hl=en
- Website/return policies: https://support.google.com/merchants/answer/14011730?hl=en
- Misrepresentation: https://support.google.com/merchants/answer/6150127?hl=en
- Product price and click through: https://support.google.com/merchants/answer/4752265?hl=en
- Grouping real size/color variants: https://support.google.com/merchants/answer/6324507?hl=en
- Accurate Product/Offer markup: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Product data specification: https://support.google.com/merchants/answer/7052112?hl=en

**Never** infer current Merchant account approval from organic Search Console indexing, or run blind publication to satisfy a checklist. Keep approved marketing campaign spend EUR0.
