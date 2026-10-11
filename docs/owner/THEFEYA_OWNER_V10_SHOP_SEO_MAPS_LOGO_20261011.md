# TheFEYA Owner V10 — approved logo sizing, shop navigation content, verified Google place pins
Date: 2026-10-11 · Draft PR #115 only, authenticated owner Preview, unmerged.

## Evidence / governance
1. **Indexing:** Search Release v12 ACTIVE corpus is 18 exact URLs. `/shop` is intentionally NOINDEX and noindex remains in `app/shop-v8-review/page.tsx`. Shop's expansion is buyer help + internal-navigation content and does NOT make the Shop page appear in Google without a future explicit Search release/ownership approval.
2. **Demand:** Supabase `public.feya_commerce_seo_keyword_metric_snapshots_v1`, read-only verified on 2026-10-11: 231 rows, latest fetch 2026-09-26. US/en historical *approximate* monthly searches (NOT organic difficulty/organic traffic):
   - rave outfits 60,500; festival outfits 18,100; Burning Man outfits 2,900; shoulder armor 2,900; costume masks 2,900;
   - costume bodysuit 720; festival skirt 720; costume belt 210; stage costumes 170; performance costumes 140; costume headpiece 70.
   These observations are not scores for stuffing or for stealing query ownership from the indexable collection owners.
3. **Existing portfolio** `docs/search/PHASE12_SEARCH_RELEASE_POSTFLIGHT_20261002.md`, `docs/search/Phase_A_Candidate_Intent_Registry_Checkpoint_20260926.md`, `docs/KEYWORD_DEMAND_SNAPSHOT_CONTRACT_V1.md`. Pages should respect the primary commercial intent owner; selected ten collection links belong to the active 18-URL release.
4. **Google guidance:** people-first content and contextual crawlable links; Google does not specify an ideal word count or keyword density. Official https://developers.google.com/search/docs/fundamentals/creating-helpful-content and https://developers.google.com/search/docs/crawling-indexing/links-crawlable.

## Shop design
- Reuse `OwnerHubSeoText` behavior: compact border, eyebrow, 1 H2, 1 visible helpful teaser, native `details/summary` with one chevron and 2-column mobile-responsive expanded copy. Content is actual SSR HTML, no invisible crawler-only block.
- Insert after `ShopClient` and before existing Shop Footer on unfiltered page 1 only. Never render repeated general copy on filtered query or paginated URLs. SEO authority and title/robots remain unchanged.
- Ten naturally contextual linked active collection owners: festival, rave, Burning Man, performance; shoulder armor, bodysuits, headpieces, masks, belts, festival skirts; size guide and shipping as utilities. Copy does not misrepresent imagery, materials, availability, completed outfits or custom size service.

## Maps — definitive map references
- Owner-confirmed Kyiv: **Фея-Портупея**, Харківське шосе 19, Київ. Google business Place ID `ChIJBWr-l83F1EARiaqJ10nf3mA`, category fashion accessories. No unsupported opening hours or TheFEYA same-entity proof.
- US: **Ship2C (Seller Online LLC)**, 635 Somers Ave, Trevose, PA 19053. Google Place ID `ChIJQZawTZytxokRn5f9xm8D7xg`. Independently corroborated by seller-online.com/ship2c.com, BBB, public Seller Online registration. Do NOT claim stock in the US for a particular product.
- External links use official Google Maps URL with required `api=1&query=...&query_place_id=...`, guaranteeing the selected business listing if available. https://developers.google.com/maps/documentation/urls/get-started
- Protected owner Preview uses preactivated **interactive Google iframe** with existing no-key `maps.google.com/maps?q=...&output=embed` form (pan/zoom/fullscreen). Public non-preview click-to-activate choice is preserved for privacy. Do not confuse this existing no-key technique with official Maps Embed API, which requires a restricted Google Cloud API key (https://developers.google.com/maps/documentation/embed/embedding-map). Before going public, choose key-backed official API + consent or retain click-to-activate; do not auto-connect Google before consent.
- Real Google business IDs are backed by structured business lookup; custom iframe exact pin control should be confirmed in the owner browser. If legacy no-key iframe fails on owner browser, use official key-backed mode as explicit follow-up, not fabricated map success.

## Logo
- User-approved alpha WebP remains unchanged, original Header and nav untouched. Increase pseudo-overlay from modest ~110% to 170×54 desktop / 134×44 mobile centered absolutely, pointer-events none. All visual-only in SSO owner Preview. Header height/typography/flex geometry byte-identical.

## Gates
- No public main, SEO release, Product OS, Google Ads API, Merchant, Merchant of Record or payment mutation.
- Exact-head GitHub CI and Vercel READY, then owner real browser desktop/mobile visual inspection of logo clipping/nav widths, Shop text-to-Footer flow and iframe zoom. No SEO ranking promises.
