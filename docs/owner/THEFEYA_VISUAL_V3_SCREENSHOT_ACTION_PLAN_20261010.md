# TheFEYA — screenshot-reconciled visual & commerce plan (10 Oct 2026)

**Status:** OWNER REQUIREMENTS + IMPLEMENTATION QUEUE, not a completion claim. Scope is owner-only Vercel SSO Preview `work/owner-visual-commercial-review-v2-20261010`, PR #115. No public main/Production changes until separate owner sign-off and governed Search Release work. Restore old owner approved Product Truth, sale prices, SEO pins and frozen components.

## Evidence matrix: six new user screenshots + previous two owner voice notes

| Screenshot | Route/area | Observed truth | Must change / must not change | QA |
| --- | --- | --- | --- | --- |
| 2026-10-10 23.12.28 | `/cart` | Actual one male armor outfit, 'Fit reference for this piece' dropdown in each line, order summary shows merchandise €308.15 + Express €35, coupon inactive | Remove redundant fit dropdown, replace with per **distinct cart line** mutually-exclusive 'For men'/'For women' intended wearer. Keep existing size/color/options from PDP. Optional addons in EUR, visibly recalc estimate, never payable until real server quote. | Test male/female across 2 items, no double selection, 1/2/3 distinct canonical ID fees, €19/35 switch, coupon not faked. |
| 23.09.34 | `/shop` product grid | Four large vertical PDP cards with price, four columns, Show 20 More | Preserve existing product images, genuine offer data, filters, paginated/hybrid semantics; do NOT confuse category tiles and product cards. | Compare unchanged product grid baseline. |
| 23.09.19 | `/shop` header | Main H1 Find your piece excessively large and takes much viewport | Reduce ONLY `ShopClient` H1 font/spacing in protected Preview (~clamp 36–56px desktop), retain semantic H1 and Title, not top global nav. | At 1440x900 product first row visible with meaningful context. |
| 22.59.21 | `/contact` | huge support block, redundant Copy email full button, long scroll; maps not in frame | Email + small recognizable Copy icon inline. Narrow/compact support card, keep phone and WhatsApp, bottom message form. Embed two click-to-load zoomable Google map panels (Kyiv showroom; verified PA partner warehouse) and visually subdued but legally legible payment operator. | Icon clipboard success and fallback, keyboard/screenreader; map click unlock; no auto third-party request, no false stock/merchant claims. |
| 22.55.39 | `/about` | Actual mission-led branded About now present, strong visual composition | Retain mission/self-expression. Only adjust any copy gaps after owner visual feedback, avoid needless redoing. | Original story visible on normal /about in owner preview. |
| 22.51.55 | desktop header/mega-menu | Events mega-menu image panel useful. Chrome automatic Russian translation maps About to 'О'; previously assistant unnecessarily shrank nav font | Restore global primary nav pre-change font/spacing. Distinguish Chrome Translate artifacts from English public site; prefer no-translate top-nav if appropriate without changing frozen Header without explicitly gated approval. | EN labels legible and untruncated 1280–1440; compare Chrome RU translation. |

## Other current owner instructions (not visible in these 6 shots but explicitly carried forward)

**V01** Style / Events cards: 4 large photo-led category tiles per desktop viewport, slim bottom caption. Already implemented in PR #115 owner-only `OwnerDiscoveryTileStrip`; keep it. Reduce extra vertical gap between arrows/card row and start of real catalog, keep visible divider but not giant dead space. QA at 1440/1024/390.

**V02** Headings: reduce on Shop, Events, Style, Contact, Returns, Shipping, About, Size Guide and product H1 where oversized. Preserve one proper H1 per page, metadata and Search Ownership. Preserve global navigation type size/labels; no wholesale scaling.

**V03** Events/Style SEO: user wants useful research-based keyword landing descriptions. As of read-only Supabase 2026-10-10, active Search v12 `/shop` is `NOINDEX_DEPENDENCY`; `/style` and `/events-performance` are absent from active indexed page list. Do not promise SEO rankings by adding text or enable indexing automatically. Create short human-readable description ABOVE items and opt-in `<details>` with SSR text AFTER catalog. Use existing Product Truth and owner portfolio/research, choose hub-level broad intent not duplicating 10 owned collection texts. Never generate keyword-stuffed hidden links. Require Search Portfolio and owner activation gate before public index eligibility.

**V04** Bag: €5 additional packaging per additional DIFFERENT canonical product above one. Same product + colors/options/quantity => €0 and fee row hidden. €19 Standard, €35 Express priority. User latest correction is Express **6–9 business days**; revert previous assistant 6–10 and do not change immutable historical approved 7–10 source pins in Production. Publish correct new policy only through governed Phase13.

**V05** Add-ons: user explicitly wants gift-card €10, gift box €25; original made-to-measure suggestion was $15, current owner suggests EUR, **€15 proposed** pending explicit commercial approval before payable launch. Owner Preview selection can add €10/25 and provisional €15 to **illustrative** order amount in EUR; immutable server-side validated offer required before payment. Gift box requires fulfillment support. Per-line male/female chosen by buyer as manufacturing reference; not infer from photography or exclude other body shapes without support channel. Discount code input remains nonpayable until trusted promotion validation.

**V06** Carrier countries: customer should see genuinely serviceable destinations, use Ukrposhta/Nova Post supported lanes, not mere ISO country names. US/CA/AU states/provinces conditional plus additional jurisdictions as carrier evidence shows. No geographic universal shipping claim until live route verified. AU/MX/NZ remote €20 only if applicable to actual order parcel and verified destination.

**V07** Contact business geography: owner identifies `Фея-Портупея`, Kharkivske shose 19 Kyiv. Search structured business record matches name/address, but current directory phone differs from TheFEYA support; do NOT replace support telephone or claim verified visiting hours. Official Seller-Online sources identify real USA warehouse 635 Somers Ave, Feasterville-Trevose, PA 19053: https://seller-online.com/novini-kompani%D1%97/grafik-roboti-j-kontakti/ and https://seller-online.com/help/poslugi-nashogo-skladu-v-ssha/ . This is PARTNER warehouse, not FEYA showroom or established FEYA stock. Two interactive Google Maps embed panels, lazy click-to-load and external Maps link, no unconditional customer tracking.

**V08** About: visual mission already exists in current Preview. Maintain studio original design/autonomy, 3–5 production typical, truthful real-photo on-request language and AI-stylized media disclosure.

**V09** Shipping/returns: no illegal undervaluation/minimum customs guaranteed, no blanket seller non-liability for transport, no no-cancellation-for-every-order blanket. Calm conversion-focused language, accurate documents and buyer import duties where applicable. Seller Online partner address and contractual operator role must remain accessible where legally required, even if more visually quiet; product seller/trader identity still needs verification.

**V10** PDP bottom: existing preview-only wrapper added readable description/reviews/collections spacing, context-help and Footer. Preserve exact original ProductDetailClient/right options/source pins and test under owner Preview.

**V11** Contact form: currently launches `mailto:` and DOES NOT directly email server-side. Before describing as a real submitted form, implement authenticated/sealed service with anti-spam, privacy and email delivery confirmation; until then label as email draft / opens mail app. Social links must be actual owner URLs before live click-through. Buyer account order history, tracking, favorites, signup voucher are post-first-sale separate stage, not pretend-live preview.

## Delivery packages / acceptance gates

1. **P1 — immediate display fixes**: Shop H1, restored readable header, compact Contact email-copy control, support card height, hub-to-catalog spacing, right Express 6–9 after owner latest correction; add explicit tests for screenshot viewport and branch-only behavior.
2. **P2 — real screenshot-based commerce Preview**: per-line intended wearer, EUR add-on selector affecting illustrative subtotal exactly, 1/2/3 listing packaging rule, totals, coupon no fake discount, country and regions filters. Payment disabled, server order/session/webhook unimplemented.
3. **P3 — real Contact panels**: owner Kyiv Google listing, official Seller Online warehouse page as evidence, responsive embedded maps after click, subdued legally legible operator block; copy icon with clipboard status and fallback; direct email draft form lower.
4. **P4 — evidence-based hub SEO content**: broad buyer-friendly introductions and collapsed server-rendered expanded content below catalog, no cannibalization, no undocumented indexed status. Add citation to source decision in PR docs.
5. **P5 — explicit QA/release**: compare the same owner Preview domain at 1440x900, 1024 tablet, 390 mobile, with normal `/shop`, `/events-performance`, `/style`, `/about`, `/contact`, `/shipping`, `/cart`. Normal top menu must resolve to owner Preview candidates via exact branch-only rewrites. Verify no page iframe preloads before user interaction. Run Vercel READY + full CI 19/19. **Important checkpoint**: PR #115 last FEYA CI run #38084990721 was **18 successes, 1 failure** in Supabase Auth/browser; failing runtime fixture showed `STOREFRONT_PRODUCT_METADATA_READ_FAILED:PGRST205`, not a green release. Investigate/repair independently; do not silently waive test.
6. **Release/launch subsequent**: owner visual sign-off first; then versioned public pages/Search v12 owner-controlled changes, exact approved 207 PDP copy, legal seller/KYC/tax/shipping capability/payment, first sale, governed PDP indexing, GA4/GSC/Google Ads API/merchant and Toyota PDCA.

## Blockers requiring owner/provider evidence (do not invent)

- Actual Kyiv showroom brand relationship/hours; provider USA warehouse does NOT confirm a single FEYA stocked variant.
- Legitimate public social URLs, final made-to-measure EUR price and SKU eligibility, actual gift box fulfillment.
- Seller Online contracting seller/MoR roles, AML/KYC, legal disclosures, tax, gateway tokens & webhooks.
- Country/region acceptance from outbound carriers and actual remote-zone status per quote.
- Signed promotion policy for 10% signup; lawful optional marketing consent independent from order.
