# TheFEYA Owner V11 — Shop-by-piece content based on actual evidence + mobile QA

**Date:** 2026-10-11. **Execution:** SSO owner preview draft PR #115 only.
**Scope:** Replace the generic Events-like Shop description with component-centric buyer guidance while respecting Search Release v12 and pinned Product Truth.

## 1. SEO authority boundaries
- ACTIVE Search Release v12 has 18 authorized indexable URLs, including ten commercial collection pages and trust pages. `/shop` is **NOINDEX**, as are filters, cart and 207 PDPs (docs/search/PHASE12_SEARCH_RELEASE_POSTFLIGHT_20261002.md).
- The Shop text exists for actual buyer navigation and descriptive internal linking; it **cannot make Shop itself rank** while noindex is active. Future indexability requires a separate owner-approved query-owner decision and Search release.
- No two primary query owners. Existing shoulder armor, bodysuits, costume masks, headpieces, belts and festival skirts keep their dedicated owner pages. Other components remain noindex catalog filters.
- Official Google Search Central: https://developers.google.com/search/docs/fundamentals/creating-helpful-content and https://developers.google.com/search/docs/crawling-indexing/links-crawlable. No prescribed word count, keyword density, or "magic" link count. Prefer accurate natural prose, clear headings and descriptive crawlable HTML anchor links.

## 2. Evidence from connected Supabase — read-only, 2026-10-11
**Current approved sellable component counts from `feya_storefront_product_cards_v1` (207 approved parents, multi-component overlap permitted):**
- top 92; skirt 89; shoulders 80; arms 75; headpiece 34; bodysuit 30; belt 13; harness 11; mask 11; corset 10; bra 4; wings 4.
- Child components: bracelet 40, arm cuff 9, bra top 20, corset 8. These are descriptive children, NOT independent sellable parent counts.
- IMPORTANT keyword-bank product associations are different from sellable component truth: shoulders 96, skirt 95, bracelet 43, bodysuit 34, bra top 22, corset 8. Search-only mentions cannot inflate link destination inventories.

**US/en Google Ads Keyword Planner snapshots (not organic difficulty, not TheFEYA traffic, approximate average monthly, primarily fetched 2026-09-26):**
- shoulder armor 2,900; costume masks 2,900; body harness 2,400 (but only 11 sellable harness parents);
- costume bodysuit 720; festival skirt 720; fashion harness 590; festival bodysuit 320; costume skirt 260; costume belt 210; costume headpiece 70.
- For literal "top", "bracelet", "corset" groupings no relevant verified apples-to-apples current monthly metric in the inspected snapshots. Their roles come from inventory and buyer navigation, not invented search volume.
- The pilot score preview confirms **festival skirt** as a collection candidate with score 60; no comparable verified pilot score available for the rest of those component terms in the inspected view. Do not equate keyword bank tier_1/tier_3/hold with a Google organic ranking score.
- No verified TheFEYA GA4 organic traffic source available through connected HYPD. HYPD GA4 account property belongs to **Feya-Portupeya.com.ua**, not TheFEYA; HYPD Search Console returns zero connected sites. GSC Wizard is inaccessible (subscription expired). Hence no TheFEYA clicks/impressions imported or invented.

## 3. Selected page task and content map
**Title:** Choose the piece that defines your look. **Visible short summary** explains choosing a costume part. **Expanded native HTML details/summary** contains four scannable H3 sections in a 2-column desktop/1-column mobile layout:
1. Tops, shoulder armor and harnesses: strong catalog depth for tops/shoulders, strong validated broad shoulder armor/body harness demand, corsets as secondary discovery only;
2. Skirts, bodysuits and waist details: high sellable skirt inventory, verified "costume bodysuit"/"festival skirt" demand, direct owners where available;
3. Arms, masks and headpieces: arm accessory discovery and verified mask demand, dedicated head/face owner pages;
4. Fit, finishes and what comes in a set: actual product truth, variant/bundle clarity, sizing and delivery utility links, no exaggerated fit guarantees.

**Active SEO owner links:** shoulder-armor, bodysuits, festival-skirts, costume-belts, costume-headpieces, costume-masks. **Existing validated noindex filter links:** /shop?piece=Tops%20%26%20Bras, Corset, Harness, Skirt, Bracelet%20%2F%20Cuff. **Utility links:** size-guide, shipping; Events & Performance one optional alternative navigation link, not a keyword takeover.
- Nothing new in H1, metadata, schema, Search v12 or product releases; no new indexable page, no Product OS changes.
- No false implicit bundle promise, waterproof, durability, custom measurement, availability, or particular materials for all products.

## 4. Mobile review workflow
- Created **/owner-mobile-review**, guarded with `isOwnerUnifiedStorefrontPreview`, noindex, and connected from /owner-review.
- Dedicated desktop embedded mobile-width iframe at 375 / 390 / 430 px and buttons to switch through Shop, Events, Style, Shoulder Armor, Festival, About, Shipping, Contact and Bag. This exercises actual responsive CSS media breakpoints without altering live pages.
- On a real phone, open the original protected /shop URL directly. The desktop iframe does NOT emulate real network, touch events, Safari bugs or page-speed metrics. Manual pixel and tap tests remain required.
- SSO-protected preview can reject iframe if host frame rules change; direct real-mobile URL and Chrome responsive device mode remain reliable alternatives.

## 5. Acceptance gates
Exact HEAD Vercel READY + all 19 CI jobs; static tests for link ownership, route guards, noindex, client mobile controls, copy no event hijacking; manual owner QA at 375/390/430 and on actual phone; no Production merge before owner approval.
