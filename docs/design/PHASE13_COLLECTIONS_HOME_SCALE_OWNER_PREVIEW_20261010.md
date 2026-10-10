# Phase13 visual review — larger Collection Hub cards
Date: 2026-10-10. Source: owner's screenshot /collections showing five narrow tiles, lengthy labels and copy across photos. Scope: MASTER [Issue #108](https://github.com/THEFEYA/feya-commerce/issues/108).

## Problem proved

The live `app/collections/page.tsx` has the real 10 owner collections and current approved source photos, but desktop `xl:grid-cols-5` squeezes each card. A large gradient/text overlay includes `tile.description`, eyebrow, heading, counts and CTA **on the photograph**. The owner-approved homepage piece carousel uses larger ~250–340px 4:5 image cards with only a short label band, preserving product visibility.

## The proposed minimal fix

The new, fully isolated `/collections-review` uses *the exact same* `COLLECTION_DIRECTORY_GROUPS` (10 destinations, product counts, SEO membership, image URLs, text and labels). Image card geometry and tokens match existing approved `HomePieceCarousel` (`aspect-[4/5]`, `visual-hover-sheen`, `visual-tile-label-band`, `font-tall` 21px short label), but the desktop layout is **four** large cards across instead of five. Longer descriptive copy and group count are placed **below** the photo rather than covering the design.

The hero H1 on this Preview is reduced to `clamp(38px,4.5vw,60px)` to demonstrate the owner's requested more balanced heading scale without altering semantic H1 or any indexed SEO title. It intentionally does not reproduce the long public hub heading; final heading wording will be accepted with owner review.

## Hard safety boundaries

- Exact project/branch-gated Vercel Preview with protection, `notFound` outside it and robots **noindex/nofollow/noarchive**.
- **NO edits to public** `/collections` original source SHA `56ef6b8ebf4cab67168a59456f878e372b4bb5cf`, `/collections/[slug]`, collection membership rules, Search Release v12 (18 indexed owners), 207 product pins, prices, right PDP, cart, Seller Online or legal text.
- Tests assert the ten original destination IDs and counts, reuse original homepage visual tokens, no body-copy overlay, no fake categories, exactly protected route and original live source hash.
- Exact PR-head FEYA CI 19/19 and Vercel Preview READY before the owner sees it. Only after owner YES: separate governed public hub visual copy/route update. Do not rewrite the old v12 pinned collection content or publish the internal /site-review index.
- This layout PR is independent of Phase13 full PDP SEO copy PR #111 (OFF by default), contact PR #110 (merged), and owner checkout/shipping PR #106 (merged). Focus on first legitimate paid guest checkout and Seller Online API v2 after visual signoff.

## Review questions

Does the owner prefer the large **4-column grid** or a homepage-like horizontal carousel for desktop collection discovery? Both preserve current SEO destinations and photography. Compare original `https://thefeya.com/collections` with the protected `/collections-review` and confirm the relative heading size, readability, gutters and card count. Don't ask for new photos if existing approved images are sufficient.
