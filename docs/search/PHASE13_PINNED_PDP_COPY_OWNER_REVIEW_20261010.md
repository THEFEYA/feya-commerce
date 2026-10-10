# Phase13 candidate — recover exactly approved SEO copy without touching Production

Owner request: 10 October 2026. Tracked by [#108](https://github.com/THEFEYA/feya-commerce/issues/108).

This change is **a review-only, protected Preview**. It does not replace, rebuild, mutate, reindex, or publish any 207 current Product Detail Pages. No new text is generated.

## Proven original data and cause

- Production `feya_commerce_seo_pack_drafts_v1`: 210 approved rows on 209 products; not safe to infer the 'latest' SEO row.
- Exact owner-approved `feya_storefront_approved_product_bindings_v1`: 207 unique product IDs/draft IDs/updated-at versions/content hashes tied to existing public canonical slugs.
- Exactly 207 of 207 approved bound records contain 4 original SEO blocks in `agent_output_snapshot.pdp_blocks`; all have original intro.
- The 207 persisted lightweight `feya_storefront_product_detail_snapshots_v1.product_json` payloads contain **zero** of these `pdp_blocks`/intro, and lack populated meta description. `ProductDetailClient` therefore selects `DefaultDescription` when public `app/shop/[slug]/page.tsx` passes its usual null `approvedCopy?.draft`.
- Missing content is a **projection/wiring defect**. Regenerating with a new LLM or replacing the approved Product DNA, right PDP copy and prices would be wrong.

## Review implementation

1. Five exact, separate real selected products from approved corpus, each with fixed source `canonical_product_id`, immutable pinned `draft_id` and public slug. Saved in `config/pdpCopyReviewSamples.ts`.
2. `lib/pdpPinnedApprovedCopyReviewServer.ts` is server-only: reads current exact approved product detail, exact current approved binding, exact pinned draft, and governing SEO page; verifies matching UUID/slug/release path/approval/version date and entire SHA-256 via existing `selectApprovedStorefrontCopy` + `approvedCopyHash` logic. Any conflict rejects the preview: NO fallback to stale/latest/draft or inventing description.
3. `/pdp-copy-review` lists the five original products. Each has `before`, `after`, and actual live item links.
4. `/pdp-copy-review/[slug]?mode=before|after` renders the **same frozen `ProductDetailClient`** with the SAME product/variant/media/details and a approved `draft` prop plus an explicit private data-only composition marker: null/absent for before, four original saved blocks plus individually confirmed physical members for after. The visual renderer source itself is byte-identical to main. The top review ribbon is outside the frozen renderer.
5. **Owner feedback (10 Oct 2026) — accepted original four SEO blocks.** Only the dynamic `What's included` list requires correction when grouped buyable options are present. SQL audit of the full 207 Product Detail snapshots found **52** products with a multi-component grouped option as stored; post-read owner-reconciled product mappings may add further groups. The two explicit examples were Silver Top + Skirt (listing 4367470907) and GoGo Bodysuit + Leg Covers (4389332118). The original `storefrontIncludedOptions` groups whole purchase units, whereas `sellableOfferIncludedLabels` supplies individually verified actual members from exactly the same current configuration truth. The exact frozen `ProductDetailClient.tsx` is restored **byte for byte** and remains unchanged; its existing `storefrontIncludedOptions` helper reads a private data-only opt-in marker added **ONLY to the protected owner `after` preview**. In that mode it projects `sellableOfferIncludedLabels` instead of grouped `sellableOfferPurchaseUnitLabels`. Public PDPs and the owner `before` preview have no marker and retain the previously approved grouped fallbacks; the right-hand dropdown remains grouped with identical configuration IDs and prices. Source-hash baselines are never rewritten to hide a visual change. Selected atomic/single items retain single labels; unknown/held source cannot invent a split. The approved SEO draft snapshots and their SHA remain unchanged. Test exact two sources and general overlap/unknown cases.
6. Routes return 404 except on exact preview deployment branch/project; Vercel Deployment Protection authenticates access. Both paths are noindex/nofollow, never added to sitemap, navigation, Ads, product feeds or public canonical PDP.
7. Existing public `/shop/[slug]`, active Search Release v12, offers, 207 pins, metadata, URLs, right PDP, Product Truth and payment remain untouched.

## Owner approval and launch sequencing

- Owner **approved the four original SEO blocks on 10 Oct** and requested individual physical component lines instead of grouped purchasing units; this narrow fix is now included in after-only preview. Owner may inspect two corrected samples or delegate acceptance after exact CI, but full public 207-release must still have separate governed source/version checks.
- After the before/after correction has passed tests and targeted confirmation, create a separately reviewed, governed public production-approved-copy read-model with release gating, exact 207 hash match in both RSC and metadata and owner-approved Phase13 rollout. Do not collapse Search v12 and its independent 207-PDP noindex until another explicit SEO release plan.
- Independent admin contact/shipping/collections/cart visual work is scheduled after this approved-copy preview. Buyer per-order handling stays **€5 × max(0, distinct canonical product listing count − 1)**; condition hidden for one listing or many variants of the same listing. The user explicitly reconfirmed EUR on 10 Oct.
- Checkout/merchant work remains M2 main priority; no unpaid parcel dimension questionnaires, no guessed Seller Online or Nova Post service levels. The delivery terms/copy are separate versioned visual approval tasks.

## Exact testing

- Gate: only `VERCEL=1`, `VERCEL_ENV=preview`, pinned `VERCEL_PROJECT_ID`, exact feature branch, and preview not disabled.
- Unit tests verify distinct real 5 IDs and known slugs, hash/date/approval tamper denial, source-only server privilege, no mutation and identical before/after ProductDetailClient.
- Pre-release requires exact PR HEAD 19/19 CI and real Vercel Preview READY; prior #106 failed 16 PostgreSQL tests *before startup* due Docker Hub anonymous registry rate limit, tracked [#107](https://github.com/THEFEYA/feya-commerce/issues/107). CI failures must not be misrepresented as source code regression or success.
- No Supabase migration needed for this review-only slice. Final production SEO copy recovery waits for owner authorization. Not yet a public publishing approval.
