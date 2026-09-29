# TheFEYA Public Storefront — Owner Visual Freeze v1

Status: OWNER APPROVED / FROZEN  
Approved: 2026-09-29  
Baseline branch: `design/hybrid-visual-integration-20260928`  
Baseline commit: `a8df15776b3fe9fe51e1b707a32c9818dc3a7a37`

## Purpose

The current public storefront visual system is approved by the Human Owner.

Future SEO, search architecture, landing-page, performance, caching, data, analytics, Merchant, payment, routing and backend work must preserve this presentation unless the Human Owner explicitly approves a visual change.

This freeze protects presentation. It does not freeze the underlying information architecture, indexation policy, page ownership, URL policy, data-loading strategy or performance implementation.

## Frozen visual surfaces

- public Header visual language and mega-menu presentation;
- homepage visual composition, spacing rhythm, dark/gold/chrome palette and editorial typography;
- homepage piece/event/mood card treatment;
- product-card image hover swap and light sweep;
- `Build it piece by piece` carousel appearance;
- `Start from a mood` tile appearance;
- PDP gallery proportions, main-media presentation, vertical thumbnail rail, arrows and lightbox presentation;
- PDP configuration dropdown visual treatment;
- PDP CTA visual treatment and periodic purchase shimmer;
- PDP content-column visual hierarchy;
- public Footer visual treatment;
- responsive visual character and reduced-motion behavior.

## Explicitly NOT frozen

The following may be changed without redesigning the UI, provided the rendered visual contract stays materially the same:

- data fetching, caching, ISR/static/SSR strategy;
- Supabase query shape and server data loaders;
- image delivery/optimization implementation;
- route prefetching and performance engineering;
- index/noindex/canonical/sitemap policy;
- clean landing-page routes and page ownership;
- landing-page SEO copy, metadata and query ownership;
- homepage/collection SEO wording where the same visual hierarchy is preserved;
- internal linking destinations and crawlability;
- analytics instrumentation;
- Merchant/payment/checkout state;
- accessibility fixes that do not materially redesign the approved presentation.

## Architecture boundary

Product DNA, shopper taxonomy, current owner-approved labels and relationships remain governed by their existing architecture contracts.

A filter state does not become an indexable SEO page merely because it exists visually.

A new indexable landing page may reuse the frozen visual components, but must pass the separate Search/Page Portfolio eligibility process.

## Change protocol

A visual change is allowed only when at least one is true:

1. the Human Owner explicitly requests it;
2. a demonstrated accessibility defect cannot be fixed without a visible change;
3. a demonstrated performance defect cannot be fixed without a visible change;
4. a browser/runtime defect makes the approved UI unusable.

For cases 2–4, preserve the visual result as closely as possible and show the Owner the visible delta before treating it as the new baseline.

Do not combine an SEO/performance/data task with opportunistic visual redesign.

## CI expectations

The existing PDP visual contract remains mandatory.

Public storefront tests must continue guarding:

- PDP gallery/configuration/CTA visual contract;
- product-card hover language;
- homepage discovery-tile hover sheen;
- frozen visual class hooks used by the approved design.

SEO or performance refactors should move logic into server/data helpers rather than rewrite visual components unless necessary.

## Search work that comes next

The next phase is not another visual redesign.

The next phase is:

1. evidence-based landing-page eligibility and Page Portfolio decisions;
2. clean URL / canonical / sitemap / internal-link architecture;
3. storefront performance engineering while preserving this visual freeze;
4. landing-page and homepage SEO content generation only after query ownership is approved.
