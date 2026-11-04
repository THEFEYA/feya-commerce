# TheFEYA Work continuation 4 November 2026

This is a continuation receipt for issue #145, not a replacement for the approved architecture or Product Truth. Read the newest issue comment and live main before acting. Evidence below was collected in the owner's connected Chrome session, GitHub and Vercel on 4 November 2026.

## Verified baseline

- Repository main and Production READY: `8109709d69ed7366202a9607878134ea7df5f231`, deployment `dpl_93Kj3M1pke7aiA57i9X7r5eSREnX`; GitHub check runs 29/29 completed successfully.
- Next.js `16.3.8` in package.json. Instructions referring to Next.js 15 are historical.
- PRs #225, #226 and #227 are merged. Do not ask to approve or implement these changes again.
- Public measurement context for /shop: enabled, production, GA4 `G-H3KXFFSVD2`, release `ad097800-9536-571d-a874-13ff00b53726`. The public consent banner exists; no gtag script is in anonymous server HTML. This HTML check alone does not prove the browser's entire network is silent.
- GA4 property `424292347` Realtime shows test page_view and view_item events plus web_vital. Treat these as owner/testing activity, not customer acquisition. Prior activation/consent proof is recorded in issue comment 6636372350.
- Privacy page renders controller TheFEYA and manager.feya@gmail.com. Vercel connector can read deployments but returns 403 for environment-variable inventory; do not repeatedly retry or expose secrets.
- Sitemap HTTP 200, 225 canonical URL entries. GSC sitemap report: 225 discovered, successful, last processed 31 October.
- /shop HTML contains a real /shop?page=2 anchor. Page 2 links to page 3. Do not confuse crawlability with actual indexing.
- Merchant account `5322859215`: 84 total offers, 84 not showing, account issue No products displayed, automated domain check. Separate No Google Ads account linked warning is present. No Merchant review was requested in this Work session.
- URL Inspection for pilot ending 1890268726 can be read: saved last crawl 19 October 2026 15:46:56, old noindex. A new indexing request on 4 November was rejected with the daily quota message. Do not call that old noindex the current live directive.
- Bing Webmaster Tools opens its sign-in page; no authenticated Bing account or sitemap submission was established. No login, account, access grant or advertising subscription was created.

## Analytics correction in this PR

The approved `docs/PRODUCTION_ANALYTICS_EVENT_CONTRACT_V1.md` specifies canonical_product_id as GA4 item_id and separate configuration identity. Actual ga4EventParameters used sku_id when available, so selecting a configuration changed the product's reporting identity.

Restore item_id = canonical_product_id and set item_variant = sku_id; retain existing sku_id and canonical_product_id parameters for compatibility. All callers use this common mapping. Do not change prices, consent gates, payment behavior, transaction receipts or item quantities.

Regression proof: the existing contract test with added item assertions and two behavioral tests fail against main's mapping, then pass after this correction. The tests cover the full select/view/cart/checkout/purchase funnel, two configurations, missing configuration and a multi-product paid receipt fixture. Offline fixtures do not create GA4 events or orders.

Historical test data using configuration IDs are not rewritten. When measuring after deployment, record the release timestamp as the reporting boundary.

## Source reconciliation

| Supplied source | Retain | Historical or rejected assumption |
| --- | --- | --- |
| Commerce Growth & Autonomous Operations prompt, 3 November | Existing infrastructure, practical growth, free-listings priority, evidence and checkpoints | Its empty Merchant and inactive analytics snapshots predate #219–#227 |
| Merchant Pilot workbook, 3 November | Candidate IDs, product/configuration separation and price evidence | HOLD/NOT SUBMITTED statuses and the candidate list predate the actual committed 84-offer feed |
| Storefront/Search/Performance master MD and DOCX, 29 September | Frozen visual system, ten evidence-backed owners, product truth, small measured changes | Pre-index state and old version assumptions do not override active v13 |
| Owner review and SEO copy recovery addendum, 10 October | Use the 207 pinned approved copies, preserve right PDP column and commercial truth | Do not restart the resolved fallback-copy or payment-activation stages |
| Portfolio decision | One intent per owner; six additional intents HOLD; filters are not SEO landing pages | Demand/counts are dated research, not live traffic or current keyword volume |
| Navigation & Collection-Hub UX Decision | Shop goes directly to products; real anchors; disclosure accessibility | Blanket robots blocking and hub indexability are superseded by master/release policy |
| Storefront Performance Architecture 2026 | Slim read models, invalidation before caching, regional and payload measurement | Do not rebuild working data models or buy monitoring on the basis of old diagnosis |
| Recommended navigation structure | Descriptive anchors, useful mobile navigation and preserved visual language | Generic Shop-to-hub and every-destination-only-once claims lose to the later FEYA decision |
| Current bottleneck diagnosis | Measure bytes, requests, rendering, images and real latency | Dynamic rendering does not guarantee a slow response; full server filtering is not automatically best for 207 products |
| Sources and data | Research starting points and intent questions | Invented LED/sequin product examples and unsupported demand/fit claims are not Product Truth |

## Next work in business order

1. Finish CI/Preview and live verification for this analytics ID correction. Observe real consented commerce events; do not create a payment or fake purchase.
2. Check the latest Google crawl states after quota permits. Request the remaining pilot once; do not repeatedly resubmit unchanged URLs. Merchant domain review and organic indexing are separate processes: an organic re-crawl is diagnostic evidence, not a documented prerequisite for requesting Merchant review.
3. Resolve the account-level Merchant issue before expanding the feed. Show the exact current review dialog/attestation and technical evidence if an owner decision is required. Do not change shipping history or request a review based on an empty-catalog assumption.
4. Free acquisition: prepare Bing site verification/sitemap import after an authenticated account is available. IndexNow is a supported option for meaningful future content updates on participating engines; do not describe it as a Google indexing API or promise indexing.
5. Prepare a small Pinterest pilot using original photographs, approved titles/descriptions and canonical product links with UTM tags. Verify the real brand account and claim first. Do not publish to an inferred account, add tracking tags or grant Google Shopping access merely to prove a domain.
6. Review, through the existing approved release path, the observed shipping-copy mismatch: the sampled PDP says Express 7–10 business days, while current Shipping/Cart use 6–9. Do not regenerate the 207 approved descriptions to fix a shared delivery sentence.
7. Growth OS/paid advertising follow measurement evidence and real orders. No new warehouse, permanent agent service, paid API or ad spend is needed for this checkpoint.

## Evidence and limits

- Operational journal: https://github.com/THEFEYA/feya-commerce/issues/145
- Activation receipt: https://github.com/THEFEYA/feya-commerce/issues/145#issuecomment-6636372350
- GA4 identity contract: ../PRODUCTION_ANALYTICS_EVENT_CONTRACT_V1.md
- Google recrawl guidance: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- URL Inspection API limits: https://developers.google.com/webmaster-tools/limits
- IndexNow protocol and limits: https://www.indexnow.org/documentation and https://www.indexnow.org/faq
- Pinterest requirements: https://help.pinterest.com/en/business/article/before-you-get-started-with-catalogs

Reading saved URL Inspection state and requesting indexing have different quotas. Do not infer that eleven request-indexing actions exhaust the 2,000/day API inspection limit. Google does not promise a reset at 10:00 CET. No new schedule was created here, and a previously mentioned Claude schedule is not proof of a ChatGPT automation.

Rollback of the code correction is a revert of this PR. This continuation file documents evidence and outstanding work; it grants no authority to rewrite approved content or change accounts.

