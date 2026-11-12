# Primary image ALT recovery — five existing measurement products

Continuation of issue #145, based on main `2a4bbfe07a85bff4feb2a8f7eb271f8754a37271`.

## Observed defect and scope

On 12 November, all 207 bound approved SEO packs contained one primary-image ALT
candidate. The public detail/card sources instead supplied the old listing titles.
All 207 live PDPs returned 200, index/follow and a self-canonical in the complete
22:22–22:27 UTC HTTP audit. All gallery source URLs appeared in HTML and Product
JSON-LD; all 207 PDPs had real incoming links across the 11 catalog pages.
These are live technical checks, not Google indexing confirmations.

This candidate connects only the five existing image-measurement products:

| Existing product ID | Image impressions, 27 Oct–9 Nov | Clicks |
| --- | ---: | ---: |
| 4456102467 | 33 | 0 |
| 4369438053 | 31 | 0 |
| 4352810754 | 29 | 0 |
| 4326178885 | 26 | 0 |
| 1890733162 | 15 | 0 |

The ALT strings are verbatim saved candidates, not regenerated copy. Each exact
primary source photograph was visually checked during this task. The projection
requires product ID, slug, frozen approved draft ID and original image URL to match.
A changed photograph/draft retains its existing ALT instead of inheriting stale
proof. The primary image's gallery entry gets the same ALT; other angles retain
their own existing text. Selected Merchant photographs continue through the
existing gallery/configuration binding.

The remaining 202 products are outside this pilot. Across the full source corpus,
15 packs have no `product_truth_snapshot.primary_image_url`; 118 have no image-ALT
QA self-report and 70 say `not_checked`. Pack approval is not claimed as an
independent visual QA receipt for every photograph. No mass activation is proposed.

## Preserved contracts

No URL, file, image bytes, sitemap membership, robots, canonical, approved four
PDP blocks, price, currency, configuration, Merchant feed or frozen JSX changes.
No extra database query or write, paid service, cron, automation or image export.
The existing cache tags and exact approved source readers remain in use.

Descriptive filenames are a weak image signal; existing JPEG/CDN files can be
indexed. The Media SEO planning screen currently computes suggested filenames but
does not publish aliases. Its export/WebP readiness heuristic is not a Google
requirement or proof of actual sitemap inclusion. This pilot does not rename
working assets or create duplicate image URLs.

## Validation and release

The 207-product local projection changes exactly five primary ALTs and five
matching gallery ALTs; 202 products and every non-ALT field stay identical.
Focused tests cover source mismatches, immutability, secondary-photo selection
and all five frozen approved draft bindings. Run the normal search, TypeScript,
build and boundary/freeze checks before release.

Prepared change only: no production release, index request or claimed growth.
Before publication, review the exact five-string diff and complete technical/
content approval under the existing release process. Rollback is a single revert
of this change; no SQL or asset rollback is needed.

After an approved deployment: verify the exact five ALTs in live HTML, preserve
the five URLs, record release time and request a single targeted Google recrawl
only after a live URL test passes. Confirm Google's subsequent crawl timestamp.
Use a new 14/28-day observation window anchored to that actual release; do not
reuse 12 November as a fictitious ALT release date or attribute results solely
to ALT while the 12 November image sitemap is also being processed.

Primary references:
- https://developers.google.com/search/docs/appearance/google-images
- https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
