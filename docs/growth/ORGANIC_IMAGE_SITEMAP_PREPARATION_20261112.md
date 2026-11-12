# Organic image sitemap — preparation checkpoint, 12 November 2026

Owner requested execution of the organic improvement plan after issue #145 comment
6827905927. This branch starts from main
`a3c8f058dea8de5b1793d0127923c1a72213f03c`. Preparation was interrupted by the
separate Merchant readiness request. This is **not published** and has no claim
of new Google indexing, traffic or sales.

## Prepared and checked

- `app/sitemap.ts` enriches only the existing ACTIVE Search Release entries with
  one current primary product photograph from the existing cached approved public
  card projection. No new page URLs, variant URLs, fabricated lastmod or priority.
- Original image URLs remain the same; XML characters are escaped for the pinned
  Next 16.3.8 serializer. Invalid/ambiguous optional image data cannot invent a
  fallback photo; catalog read failure retains the complete URL-only sitemap.
- Live read-only aggregate preflight: Search release v13, 225 index candidates /
  207 PDPs. All 207 matched their existing card identity/path and valid original
  HTTPS Etsy CDN photographs; zero path mismatches.
- The eight empty alt attributes observed on PDP4348580005 belong to labelled
  thumbnail buttons. The main image has its existing description. No gallery,
  alt, approved PDP content, V13 appearance, Product Truth, price, Merchant TSV,
  image URL, SQL row, permission or Cron change was made.
- Local TypeScript, admin boundary, Product OS freeze (45 files), owner UI and
  production build passed. Search suite: **859/859**, including four new behavior
  tests for release-corpus preservation, invalid media, ambiguous identity, and
  real Next XML serialization. No browser/hosted preview or CI approval claimed.

## Data limitation and next action

The Chrome connection initially returned its inventory but timed out on the
official GSC tab and subsequently reported no connected browser. No new Google
report or inspection result was obtained. Do not call the daily GSC collector
again or pay for a connector to fill this gap.

Resume by reviewing this diff, preparing a bounded PR against fresh main, and
checking its exact commit/CI before any release. Preserve the public 225 URL set
and verify 207 image entries after any separately authorized deployment. Then
obtain the official dated Page Indexing / query-page-country / Image reports and
the settled existing 12-Pin cohort through an available authorized read path.

Canonical reference: issue #145; existing TSEO/Core/Interaction Map and
Storefront/Search/Performance master. No new role, workflow or paid worker was
activated. Runtime case/workflow IDs were not created; this is a code branch,
not a purported autonomous agent execution receipt.
