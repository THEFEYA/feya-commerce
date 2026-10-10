# TheFEYA — V4 screenshot corrections and PDP reliability gate

Date: 2026-10-11
Source: 9 fresh owner screenshots (00.30.13 through 00.36.47 local time) and the detailed Russian voice-text instruction.
State: **Candidate-only** in PR #115 branch `work/owner-visual-commercial-review-v2-20261010`. User visual review and exact-head CI required, no merge/production payment/indexation changes.

## Nine screenshots: approved target vs changed scope

| Screenshot | Page | Observed and requested correction | Implementation / gate |
|---|---|---|---|
| 00.36.47 | /cart Add-ons | 3 tall separate upsell tiles, large empty labels and card textarea occupy a large scroll area | One compact Make it yours block, 1 made-to-measure row with selected actual items, two small aligned gift option checkboxes, gift message only when selected. Preserve per-product +€15, per-order €10 and €25, no paid order. |
| 00.36.26 | /cart above fold | Large gap under top nav; product thumbnail and text too small to inspect selected item | Shrink cart top padding from lg 160px to 112px, lift main contents, enlarge gallery preview desktop from 118x152 to 136x172 (not 2x); title 18px, keep multiple rows reasonable and all original selection fields. |
| 00.35.20 | /shop/[slug] | Sometimes interim generic white 'page failed to load' view before reload and success | Need real error analysis. Vercel has systemic query timeout errors on collection routes (1626 grouped occurrences) and /shop card-read (65), but preview PDP runtime logs did not directly capture this specific browser failure. Owner preview now has bounded PDP error retry/fallback in its own route boundary. **Do not claim underlying root cause fixed**. A proposed shared-metadata-read and hover-prefetch experiment modified Product OS frozen files, failed approved hash guards, and was fully reverted. Correct next phase: trace exact PDP route/request ID and reproduce transient error before changing Product OS / rebaselining hashes. |
| 00.33.48 | /collections/rave-outfits above catalog | Intro restricted to left 50–65% and overlong height; technical v2 preview banner; cards pushed below | Owner-branch CSS only: full-width intro container, 2 readable desktop columns, one mobile, reduced heading/breadcrumb spacing, suppress technical Preview ribbon in shopper-like Preview, reduce module card padding. Do not edit frozen public Search v12 release/page/source hashes. |
| 00.33.03 | /collections/rave-outfits after catalog | Huge gap between Show 20 More, related collections and Before you order | Preview-only CSS shrinks embedded Shop bottom padding and three section spacings. Keep real SEO links and FAQ fully crawlable and original membership. |
| 00.32.04 | /events-performance after products | Narrow SEO block centered with large left/right whitespace | Remove 1100px max-width restriction and use fluid container; keep single arrow, simple semantic SSR details, readable 2-column expanded body on desktop, single column phone. Preserve noindex and Search ownership. |
| 00.30.56 | /about hero | Equal split About vs mission looks visually disconnected/unbalanced | Single unified full-width About TheFEYA panel, concise studio story then mission as subsection below. Do not duplicate message about self-expression throughout all sections. |
| 00.30.49 | /about 4 benefit cards | Icon stacked high above heading wastes card height | Icon 56px to the LEFT of heading on same baseline, body below, premium dark/gold system unchanged. |
| 00.30.13 | /shipping | Huge icon on own line, tiny delivery label, prices far below | Compact 56px vector next to larger text label, delivery price/time aligned below, semantic scissors/truck/airplane retained; compact lower rows too. Prices €19/€35, timings 10–14/6–9 bd, 3–5 production, honest customs and carrier details unchanged. |

## Product-reliability diagnosis — evidence, no fabricated resolution

Vercel grouped production runtime errors queried Oct 10/11:
- `SEARCH_LANDING_PRODUCT_READ_FAILED:canceling statement due to statement timeout` — count 1626, 165 affected users, route `/collections/[slug]`.
- `STOREFRONT_CARD_READ_MODEL_READ_FAILED:57014` — count 65, 33 users, route `/shop`.
- `SEARCH_LANDING_METADATA_VERSION_LOOKUP_FAILED:Gateway Timeout` — one event in grouped data.
- **No correlated error** found in available recent Preview `/shop/[slug]` runtime group for the user's particular failure. Browser screenshot proves user-experienced error but cannot identify its exception/digest from screenshot alone.
- Product OS SHA protection is **functional and must not be silently reset**. Protect `components/ProductCard.tsx` and `app/shop/[slug]/page.tsx` as in `main` while collecting evidence.
- `app/shop/[slug]/error.tsx` is new and limited to one *owner-preview-only* reset attempt with 15s cooldown; a persistent error must show an explicit Try again. Production error behavior remains unchanged; no publication or SEO changes.
- Subsequent reliability phase: gather precise function/edge logs for the exact slug and timestamp, inspect failed RSC metadata/presentation, verify Supabase query EXPLAIN, timeout and cache hit metrics, fix read path through governed release, test 207 PDP direct and navigation in browser before public activation.

## Validation contract

- Vercel READY for exact PR head and FEYA CI 19/19; if either fails, do not declare complete. Preserve Product OS SHA and public 18-indexable-URL Search v12 and 207-PDP noindex.
- Desktop 1440x900: bag header closer to navigation; each line image 136x172 visible; add-ons one concise group; multiple products still scannable.
- Mobile 390x844: card thumbnail 106x138, summary and add-ons one-column without horizontal overflow.
- Real browser journeys: shop -> PDP -> bag; collections -> PDP -> bag; return/edit -> PDP; no unconfirmed claim that flash is solved until observed.
- Collection /rave-outfits at 1440 and 390: no banner, full-width fluid intro, module cards immediately follow, Show More/related/support tightly but visibly separated.
- Hubs: SEO human text flows on mobile and desktop; no indexed status mutation.
- About/Shipping: no big icon-only whitespace; semantic headings/true prices/consumer data unchanged.
- Check SEO performance before broad activation, do not re-run broad keyword research.
- Paid checkout and mailing system remain disabled and opt-in newsletter not persisted.

## Current next milestone after owner YES
1. Release governed public editorial/visual changes with active Search v12 content version controls;
2. Customer checkout server quote/tax/trader/Seller Online confirmed; truthful courier availability;
3. Validate 207 approved PDP pins and activate controlled PDP indexing;
4. GSC/GA4/Google Ads API metrics -> Toyota PDCA loop.

## Never claim
No "19/19" before exact current FEYA validation run complete. No "bug fixed" solely because retry UI is present. No assumed working server-paid checkout, subscriptions, or US stock.
