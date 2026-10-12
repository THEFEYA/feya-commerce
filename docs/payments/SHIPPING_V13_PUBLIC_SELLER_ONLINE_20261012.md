# TheFEYA — 2026-10-12 owner-authorized public Shipping V13

Owner authorization: publish the already approved full-width/mobile Shipping & Delivery V13 with Seller-Online LLC partner details ONLY inside Shipping & Delivery, not the global Footer, not Contact. Prior erroneous PR #116 was closed without merge.

## Scope
- Source UI is the owner-approved shipping review exactly as found in PR #115 commit d3b3d0f23e00d8c61f96d045c6c3ca921e19752e.
- Shipping route `/shipping` is served by `app/shipping-public-v13/page.tsx` via a single explicit beforeFiles rewrite. The public URL, canonical, release-aware robots and 18-URL sitemap stay unchanged. Unapproved direct extra route must not be advertised, see below.
- Old v12 source `app/shipping/page.tsx`, historical Phase 12 source-pinning migration and immutable published legacy visual contract are left unmodified; this is an explicit presentation-level version supersession, not an alteration to the historical release or product data. Owner approval is the gate to this routing layer. A future governed release should version the live page content binding rather than rewriting prior migrations.
- Contains user-approved Standard €19 / 10–14 working days, Express €35 / 6–9 working days (priority production), manufacture 3–5 working days, €5 per each additional DISTINCT listing and possible destination-verified €20 remote surcharge, no live order/payment.
- The prepayment operator disclosure is accurate: planned/authorized Seller-Online LLC, 635 Somers Ave, Feasterville-Trevose, PA 19053, United States. Not a legal-seller claim, not Merchant of Record. Located before the ordinary site Footer, within Shipping content only.
- No changes to Contact, global Footer, catalog/product variants, public SEO/PDP indexation, privacy, search release, payment environment flags, API sessions or customer data.

## Operational gate
1. Exact-head CI 19/19, Vercel READY.
2. Public `https://thefeya.com/shipping` returns HTTP 200 and visible Shipping V13 headings/rates and Seller-Online address without authentication.
3. Public `/contact` and Footer have no NEW seller block; Search v12 exact 18 indexable canonical URLs, 207 PDP noindex remain.
4. Only after public-origin postflight, reply to existing Seller Online ticket #264386 with `https://thefeya.com/shipping`. Do not claim the payment is activated or that Seller Online approved it.

The rest of owner-approved V13 across other routes stays tracked in PR #115 and requires a distinct production adaptation/approval gate; this short shipping-only release does not claim the entire storefront visual release is deployed.
