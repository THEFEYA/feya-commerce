# Social links, buyer actions and Collections — 6 November 2026

Owner requested clickable brand profiles, working Save/Share/policy actions and header/footer links, plus Collections tiles matching the approved Events/Style presentation.

## Verified public profiles

- Instagram: `https://www.instagram.com/feyaportupeya/`. The old `feya_portupeya` profile explicitly points to this newer account; the newer account links to thefeya.com and Etsy/TheFEYA. No underscore in the requested current username.
- Pinterest: `https://www.pinterest.com/TheFEYAshop/`. The actual profile shows TheFEYA, thefeya.com and the same current Instagram. This is the existing account with the twelve previously published Pins; no new Pins/follows/messages are part of this release.
- Facebook: `https://www.facebook.com/feyaportupeya/`. Public page Feya Portupeya, existing followers and brand photos; its cover explicitly prints the old Instagram `feya_portupeya` and the legacy FEYA website. The separate empty `profile.php?id=61564006364091` page is not used. The historical phone in Facebook is not imported into current store support.

Shared profile constants supply real anchors in Contact and the global Footer. These are ordinary outbound links, not tracking pixels, embeds, automatic follows or messages.

## Buyer actions

The previous PDP Save/Share were `#save`/`#share` placeholders; Returns had no target and Store policies pointed to customization rather than the sales policy. Preserve the existing small action row and purchase selectors, replace only these behaviors:

- Save: real browser-local shortlist, versioned `feya_saved_pieces_v1`; no fake sign-in or database account. Product IDs/slug/title/image only; no buyer details, copied prices or payment authority. Storage failures are visible; no false saved confirmation. `/account` shows the saved pieces with an explicit browser-only limitation, current product links and removal. It remains noindex; guest checkout stays available.
- Share: accessible native dialog with a bare canonical product URL, manual selection/copy, and optional user-initiated device share. Cancellation is harmless. No automatic post/message or false copied state when clipboard fails.
- Shipping `/shipping`, Returns `/returns`, Store policies `/terms`; cancellation remains readable within the existing return/terms policies. Existing policy text and payment policy evidence hashes stay unchanged.
- Global Footer includes Saved pieces so mobile shoppers can return to their shortlist even without a visible desktop account icon.

## Collections decision

Keep `/collections` as the single directory of ten existing product/event collection owners, reachable from the Footer. It complements direct Shop, Events and Style browsing and keeps the existing internal links; it is not an extra copy of each collection or a reason to add new SEO owners.

Use the exact existing `OwnerDiscoveryTileStrip` for each directory group: four images across on desktop, 4:5 geometry, compact bottom label/arrow and mobile swipe. No large description/count overlay on photographs. Existing destinations, photos and collection membership stay intact. A V13 route layout renders this approved presentation while the historical route metadata/source pin remains unchanged, matching the existing Events/Style release pattern.

## Checks / boundaries

Verify social hrefs, Save → Account → reload/remove, Share/copy/manual fallback, policy destinations, header/footer destinations, desktop/mobile collection geometry, real next-tile controls and stable collection links. Recompute only the explicitly authorized PDP action-row/Footer visual fingerprints and the existing audit's implementation checksum; do not rewrite captured purchase data. Keep all207 approved PDP copy, prices/variants, paired sizes/colors, active payment/quote flow, Merchant feed/landings, Search v13 and consent gates. No database migration, new customer role, paid service, offsite publication, order or payment.

The browser-only shortlist is not cross-device account synchronization. Newsletter remains explicitly disabled until its actual collection/consent flow exists. Do not report either as a connected customer-account or mailing system.

## Route boundary correction
Production postflight detected the Collections layout replacing nested category content. The directory presentation must be selected only when useSelectedLayoutSegment is null; category pages retain their existing server-rendered children. Validate the actual shoulder-armor, festival-outfits and costume-masks product-card bodies before releasing this correction. No category memberships or metadata change.
