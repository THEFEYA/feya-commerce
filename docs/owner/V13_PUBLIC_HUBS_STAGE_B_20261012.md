# 2026-10-12 — TheFEYA V13 Stage B: canonically routed public hubs, no payment mutation

**Owner authorization:** visual presentation V13 approved across mobile/desktop. This release builds on completed Stage A production commit `08e26322881cb8fd6839be7db33a95c642624a0d`. Shipping V13/Seller Online disclosure is already in Production, and operator address must remain ONLY on Shipping & Delivery.

## In scope
- Events & Performance: approved 11-piece inspiring tile carousel with browsing links, streamed existing approved product grid and buyer-first expandable background content. Existing canonical `/events-performance`, original `generateMetadata()` robots/noindex retained; do not create a new SEO owner.
- Style: approved 10 style tiles (including Burlesque, Classic), consistent approved images, existing product catalog facets and existing canonical `/style`.
- /shop: approved component-oriented guidance SSR behind a disclosure, without turning `/shop` into an indexed landing; preserve current deterministic facets and paginated routes. Update the approved visual-freeze source hash for the owner-approved additive shop content change. Never change Product Truth or client product price.
- /collections/[slug]: actual immutable release text and membership preserved, only FAQ rendered as native accessible collapsed `details`, appropriate V13 spacing.
- About: approved mission/story presentation without modifying original release metadata.
- Contact: owner-approved help and contact-form/WhatsApp layout, email draft opens via mailto only. Remove ALL Seller Online partner and US facility location data; keep only the explicitly qualified Kyiv studio listing reference (do not claim verified visit hours). Privacy-first Google Maps click-to-load. Newsletter stays **disabled** with a clearly visible notice until real CRM/consent is ready.
- Original public `Footer`, full Shipping with Seller address, Search Release v12 18 indexable routes, 207 noindex PDPs, merchant/payment/analytics flags and M1 pricing/variants are unchanged.

## Deployment quality gate
1. 19/19 FEYA validation, Next.js build, Page 12 strict origin crawl, source hashes and actual noindex/canonical/sitemap parity; Vercel exact head READY.
2. Preview includes 200, headers and crawl signals for /, /shop, /events-performance, /style, /about, /contact, /shipping, /collections/shoulder-armor and representative PDP; 207 noindex PDP and /cart hold preserved.
3. Confirm /contact NEVER advertises Seller Online as its location or transaction party and Footer contains no new operator address.
4. Inspect mobile 375/390/430 and desktop 1440 and confirm the original approved logo/tiles/card layout remains consistent. No broad remote-cache activation until P1 #119 is independently validated.
5. After release, maintain open M2 #81 (shipping authority and API v2 test checkout), Phase13 P1 #119 and remaining Returns/Size Guide legal and legacy size-chart accuracy gates. Avoid rerunning closed M1/Phase12 phases.

## Outstanding source note
The original active release Page v12 content source SHA is historical; these stage B visual pages use owner-approved layouts with original page metadata/sitemap binding. An eventual content-ownership release must version new About/Contact editorial content explicitly, not rewrite archived Phase 12 migrations.
