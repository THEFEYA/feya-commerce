# TheFEYA — V13 approved visual baseline + October 20 color/checkout changes

Status: **DRAFT / SSO PROTECTED PREVIEW. DO NOT MERGE UNTIL OWNER + EXACT-HEAD CI/VIEWPORT PASS.**

## Owner's NON-NEGOTIABLE source of visual truth

- Approved full-storefront screenshot/deployment:
  `https://feya-commerce-p6dii1kev-alexs-projects-5419f9ec.vercel.app/style`
  Vercel recorded Git SHA `d3b3d0f23e00d8c61f96d045c6c3ca921e19752e`, branch
  `work/owner-visual-commercial-review-v2-20261010`.
- Reviewed color/paired-picker behavior source:
  `https://feya-commerce-r0svvovfc-alexs-projects-5419f9ec.vercel.app/shop/futuristic-cosplay-headpiece-festival-headdress-cyber-punk-wings-holographic-bodysuit-leg-covers-for-rave-festivals-and-burning-man-1890691940`,
  SHA `61d1e76f7851e5ddf525afdabbe4470bcd1c5a30`.
- The FIRST URL owns **the complete visual presentation**: golden FEYA logo, no unapproved Express DHL banner, desktop four-across full-bleed Events/Style tiles (full image, short bottom-only title band), About/Shipping wording/layout, two-column Contact with two owner-supplied Google Maps pins, mobile fixes/spacing for 375/390/430 CSS px and large displays. The second URL owns **only the color/variant/paired size/cart behavior**.
- This comparison must be repeated on protected *actual rendered URLs*, not solely comparing frozen files; same JSX with different `next.config.ts` route gating yields a DIFFERENT website. The previous mistake was comparing Git file hashes alone.

## Verified root cause and route correction

Old visual Vercel branch `next.config.ts` used exact protected `beforeFiles` rewrites:
`/style→/style-review`, `/events-performance→/events-performance-review`,
`/about→/about-review`, `/contact→/contact-review`, `/shipping→/shipping-review`
and others. Main replaced this with public V13 `app/*/layout.tsx`, `app/template.tsx`,
`app/v13Public.css`, and a single `/shipping→/shipping-public-v13` rewrite.
The prior color preview was not V13-gated and thus bypassed these layouts while
retaining stale page routes. It rendered a WHITE old FEYA logo, tiny 8-up Style cards
and sparse Contact/old About.

The current branch `work/bonanza-color-variants-20261020` adds itself to the
**exact** existing V13 project/preview allowlist in
`lib/approvedV13Presentation.ts` and `next.config.ts`. It shares the
untouched approved `app/v13Public.css`, `components/OwnerDiscoveryTileStrip.tsx`,
`components/OwnerV13StyleHub.tsx`, `components/OwnerV13EventsHub.tsx`,
`components/OwnerEditorialReviewPages.tsx`, existing Header and Footer.
**No broad wildcard, no production payment or SEO activation.**

Contact alone differed: the public V13 component intentionally has one Kyiv map.
To honor the historical approved **two-location owner PREVIEW** without changing
unverified partner data on public Contact, the exact color Preview switches to
`ApprovedOwnerContactPreview`, copying the historical full Contact, two columns,
original wording, cards, contact form/newsletter and historic Kyiv + PA markers.
`ApprovedOwnerLocationMapPreview` only changes iframe behavior: load near
viewport with IntersectionObserver, no empty white iframe flash, persistent
Google Maps direct links. Embeds remain third-party and Google latency cannot
be guaranteed. The US partner location is PREVIEW ONLY until legal/owner
authorization; SellerOnline remains unconfirmed.

Shipping V13 source has same visual/card copy as the approved historical
`app/shipping-review/page.tsx`; only canonical/robots metadata differ.
Do not copy obsolete SEO metadata from old preview into Production.

## Owner-approved precise interactive changes

- 207/207 product colors retained from versioned Bonanza decisions; zero new
  SKU/price/configuration sources; one historical Bonanza HOLD remains separated.
- Holographic finishes smoothly gradient-blended with white rim and outer gold
  selection halo, no square tiles. Diameters: catalog card 12px, filter 28px,
  PDP 27px, partnered set 20px (as in existing deployed UI).
- Men/Women paired rows retain independent approved colorway + size. Icons 16px
  gold shading; labels white and more readable. Selected color and sizes displayed
  in one summary below `Colors & sizes · Paired set`, not as duplicated tiny
  silver/gold text below each label.
- Custom size dropdown: FEYA dark/gold popover, white "Size", compact amber
  XS–XXXL/Custom options, no visible scroll bar, opens above when viewport
  space is short, keyboard focus/Arrow/Home/End/Escape retained.
- Catalog color banner now explains matching the **first/main listing preview**
  rather than a buyer-selected photo; `Include other available colors` option
  remains separate and uses approved selectable variant constituents.
- PDP size `Custom` sets custom-measurement flag automatically but DOES NOT
  show an extra service checkbox or alter merchandise line price. The bag
  receives a checked €15/customized-outfit option (and a preview-only toggle).
  Unchecking remains possible; server checkout must prevent unpaid required
  custom sizing and is disabled pending merchant quote authority.
- Cart required-field golden asterisk (and native `required`) on first/last
  name, email, phone, destination country, required region when relevant,
  city, postal/ZIP, street and policy consent; optional apartment/order
  notes/marketing have no asterisk and no "optional" suffix. For non-paired
  individual items intended wearer selection is required; paired set displays
  both included. Delivery method requires Standard or Express and currently
  defaults to Standard. Two consents are adjacent, without the historic
  "necessary contact details" explanatory paragraph; privacy link is retained
  outside that pair in summary footer. Order submission remains disabled.

## Invariants and release gate

- Keep 207 pinned owner-reviewed PDP SEO copies (4 original left blocks),
  Product Truth, prices, Search Release v12/indexation, all category media and
  link destinations, existing V13 Header/Footer, CSS and mobile layout.
- Preview must remain protected by Vercel deployment protection, exact project
  ID and exact branch. No Supabase data writes, seller payment, API or agent
  activation. No new paid services.
- Gate: (a) exact-head Typecheck/build and full GitHub CI green,
  (b) authenticated actual browser visual comparison: old approved vs new
  at Contact/Shipping/About/Style/Events/Shop/PDP/Cart; desktop 1440px,
  laptop, 375/390/430px mobiles with scrolling/keyboard tested,
  (c) owner visual approval. Vercel READY alone certifies deploy, not visual QA.
- Changes live only in existing Draft PR #191. Production main remains
  `01aeeecee58f15870564a9182ce31c3a9733d1e5`.
- Rollback while in Draft: do not merge; old authorized preview immutable.
- SellerOnline response and server-bound colorway/configuration/price quote are
  separate issue #192; never merge with seller activation.

## Immediate next

Check exact-head CI, verify old/new viewports, allow owner to review protected
Preview, fix any visual regression under this same PR and await explicit owner
approval before Production release.
