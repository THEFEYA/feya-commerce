# TheFEYA Owner V13 — mobile final layout, 11 Oct 2026

## Source of correction
Owner's twelve green-marked screenshots (13:14:59–13:24:59) with verbal notes. The site has a single desktop/mobile URL and shared Product Truth. All edits stay in exact protected review PR #115, with owner-approved Production frozen.

## Corrected mobile components and acceptance
1. All existing collection pages, not only Rave: Related Collections becomes a 2×2 grid of compact 44px touch-target links with smaller borders/type and no excessive vertical wrap. Before You Order 5 links becomes 2 columns (last Contact centered). Cards have smaller mobile padding and reduced distances after Show 20 More. Desktop unchanged.
2. Collection snapshot: 111 (or dynamic membershipCount) "orderable pieces" becomes small uppercase secondary text, adjacent to a compact Shop All button; gap to Showing 20 of N is reduced. No static literal 111 or data manipulation.
3. About Our Mission end actions: Explore Our Designs and Contact Our Studio placed side by side at mobile width, compact heights/font; desktop still visually frozen.
4. Shipping bottom information cards: icon and heading share first row, paragraphs span full card width underneath. Keep €5 distinct-listing packaging rule, remote surcharge, correct declared taxes, Nova Poshta names, and each original line unchanged.
5. Contact: eliminate sideways document scroll at 375/390/430 via min-width:0, minmax(0,1fr), max-width:100%, clipping stray bleed only on protected Contact main; newsletter and prior card align to exactly the same container width. Mail button is compact and legible. Google Maps iframe keeps interactivity.
6. Cart: reduction of excessive final mobile black empty margin from 4.75rem to 1rem plus .65rem Footer separation. Payment remains disabled.
7. Mobile PDP Additional information: glossy-but-quiet gold-outline panel with small moving highlight honoring prefers-reduced-motion; reduce doubled #description padding + #reviews padding so Customer Reviews is closer to the collapsed button. No mutation to the frozen ProductDetailClient or SEO/variant panel content.
8. Navigation: legacy Header initially expands Shop because its frozen state starts at 'shop'. A branch-only owner-preview MutationObserver closes it on mobile MENU OPEN (not when shopper taps individual menus). Last leaf bottom border suppressed, following section border retained, category gaps reduced. Original Header source remains untouched. When owner eventually authorizes Production release, migrate behavior into Header through a separate frozen visual gate and discard preview shim.
9. Desktop Shop Show 20 More to SEO divider gap equalized to Events through mt-4/mt-5 on OwnerShopSeoText, no new keyword-owner or Search v12 index state.
10. On preview page mobile frame, current name and width displayed above iframe (instead of ambiguous "Owner Mobile Review"), without a second mobile website.

## Safety and test gate
Only data/testid styling and preview components; no Seller Online payment mutation, no new indexable pages, no Google Ads or production search release, no pricing calculation changes. Maintain Product OS/hash frozen source. Verify Vercel exact commit READY, GitHub CI 19/19, iPhone/Android 375–430 CSS px screenshots and no horizontal document scrollbar. Public password request is **not** safe to implement using a shared hard-coded email + simple password: use an expiring Vercel deployment-specific share URL (bearer token, private), Vercel account credentials never shared and Vercel SSO stays enabled.
