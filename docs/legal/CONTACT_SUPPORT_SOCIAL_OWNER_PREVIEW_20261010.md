# TheFEYA Phase13 owner Contact UI review — 2026-10-10

Tracked in [Issue #108](https://github.com/THEFEYA/feya-commerce/issues/108). This is a **PREVIEW-ONLY** owner-requested revision of existing `components/ContactExperience2026.tsx` (original PR #99). The **indexed public** `app/contact/page.tsx` and ACTIVE Search v12 founding version remain **unchanged**, as do Checkout/Product Truth.

## Owner-approved constraints

- Delete redundant large “Helpful links / Find an answer” right column: this information is already navigable by top/footer menus.
- Keep **TheFEYA support** visually primary. Confirmed store email `manager.feya@gmail.com` supports both `mailto:` and working copy-to-clipboard button with genuine success/failure feedback. Phone `+380636556288` is a dialable phone link. WhatsApp goes to `https://wa.me/380636556288`; Viber and Telegram share owner-stated number but have **NO assumed clickable username/bot links**.
- Size of visible hero H1 reduced in Preview (`clamp(40px,4.4vw,62px)`). Semantic H1 remains. Google does not grant ranking benefits for display font-size pixels.
- Provide attractive, minimal preview placement for **three Instagram accounts + Facebook + Pinterest**. Until owner supplies official account URLs, social chips are plain `span` elements with icon/label — intentionally no click handler or invented external profile link. No fake social counters/follow widgets.
- Seller-Online LLC is **legally disclosed** as a *planned* payment recipient/logistics partner, clearly differentiated from primary product support and not falsely presented as FEYA manufacturer/contractual merchant. Its confirmed public address, email and office phone stay legible and accessible but are smaller, quieter, neutral gray with no branded gold call-to-action.
- No imaginary Kyiv store Google map; the named public listing needs confirmation because existing results do not prove that its phone, operator, real location and current business status match TheFEYA.
- No account/CRM/marketing automatic signup, chatbot spoofing, form that loses messages or transfer of secret credentials. WhatsApp Business manual branded inbox can be attached later after owner authenticates it, not an unapproved embedded chatbot.
- No claims of 24/7 response, guaranteed reply time, Seller Online merchant-of-record, paid checkout active, GPSR seller identity verified or availability of payment methods.

## Code scope

`components/ContactExperience2026.tsx`: single focused support card in the existing dark/gold design, email, copy, phone, WhatsApp, small icons and muted partner details. `components/CopySupportEmailButton.tsx`: intentionally client-side and keyboard accessible, only reports success after actual `navigator.clipboard.writeText` success; fallback is the mailto link. `tests/search/contactReviewSellerOnline.test.ts` asserts active `/contact` byte-match with v12 source, noindex preview-only route, no invented social URLs/map iframe and partner transparency.

## Acceptance / next steps

1. Exact-head FEYA CI **19/19**, Vercel Preview READY and independent production source/crawler no regression.
2. Owner visual review in protected `/contact-review` on desktop and mobile, especially composition, subdued Seller-Online notice and social chip placement. Real Instagram (3), Facebook, Pinterest and optional Etsy URLs needed only before making the chips clickable on a future public release.
3. For the public indexed `/contact` page, use separately governed Phase13 next-release editorial/content-pinned work, not an edit of historical v12 migration.
4. Then continue collections/home-style tile geometry, large H1 typographic proposal, shipping copy, actual guest checkout with Seller Online verified payer/legal/tax/merchant identity, remaining MASTER #108. No global SEO re-generation.

Do not conflate this preview-only contact UX with the actual first-sale/payment activation.
