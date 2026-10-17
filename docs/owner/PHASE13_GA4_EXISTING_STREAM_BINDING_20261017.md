# TheFEYA — owner-confirmed existing GA4 web stream (Phase 13 P0C)

**Evidence:** owner screenshots of Google Analytics Admin > Data streams > existing FEYA (shopify) on 2026-10-17. **Status: selected source, not active collection.** Subordinate to MASTER/GDAE/GMEL privacy/source-health gates and GitHub issue #145.

## Verified account/stream details (not secrets)
- Property number: `424292347`; existing GA4 property FEYA (Shopify). This is a historical label, **not proof that the current storefront uses Shopify**.
- Existing **web stream** ID: `6664266455` with website URL `https://thefeya.com`.
- Existing **Measurement ID**: `G-H3KXFFSVD2`.
- Google Admin shows enhanced measurement **ON**, including page views, scrolls, outbound clicks and others. The screenshot does not show the advanced **browser-history page changes** option, so its state **is unknown**.
- Google Admin warns that no traffic was observed in the last 48 hours. Historical Shopify/Wix data may remain in the property; never interpret it as new Next.js sessions or current conversions.

## Binding implementation and non-activation invariant
- `lib/privacyControllerPolicy.ts` has a pinned, owner-confirmed **non-secret** stream identity. When `FEYA_GA4_MEASUREMENT_ID` is blank, this is the exact default production destination **after the existing independent server activation gates pass**. An explicit non-empty override is still syntactically validated for compatibility; changing the destination requires separate owner source review.
- Gate remains **OFF** unless all existing conditions hold: `VERCEL_ENV=production`, `FEYA_ANALYTICS_ENABLED=true`, confirmed and valid `FEYA_PRIVACY_CONTROLLER_*`, `FEYA_ANALYTICS_PRIVACY_READY=true`, correct `G-` ID. The browser **must separately grant analytics consent** before FEYA loads `gtag.js` or sends FEYA analytics events.
- The public `/api/measurement/context?path=%2F` and `?path=%2Fshop` returned `analytics_disabled` on the existing production before this candidate. After an approved code-only release with flags unchanged they must **still** return `measurement_enabled=false`, with no tag or GA4 event requests without consent.
- No injection of a second Google script, Shopify/Wix tag, GTM container, fake order/conversion, GA4 Admin API write, or Google Ads spending.

## Page-view de-duplication blocker (owner/platform gate)
The approved TheFEYA Next.js client deliberately sends one manual `page_view` per page context and calls `gtag('config', measurementId, {send_page_view:false})`. **Google confirms this flag does not suppress automatic page views on browser-history changes when Enhanced Measurement is enabled.** Before enabling production analytics: in GA4 Admin > Data streams > FEYA stream > Enhanced Measurement gear > Page views advanced settings, verify **Page changes based on browser history events is OFF**. Keep desired scroll/outbound interactions otherwise unaffected. Also verify no legacy Wix/Shopify/GTM tag is still firing for this live domain. Do not assume that the screenshot of Enhanced Measurement ON proves the history subsetting is OFF. Google: https://developers.google.com/analytics/devguides/collection/ga4/views?technology=websites#disable_page_changes_based_on_browser_history_events

## Explicit final enablement checks, **not** performed by this PR
1. Current privacy controller identity/contact role approved (not conflated with seller, shipping, Seller Online, or EU responsible person); /privacy accurately describes data processing and withdrawal of consent.
2. Verify enhanced browser-history tracking OFF in Google Admin; confirm active tag destinations, no duplicate pageviews from old website builders.
3. Owner-controlled Production analytics/privacy flags intentionally approved; safe deployment of exact SHA with `FEYA_ANALYTICS_ENABLED` and privacy/consent switch separate.
4. Anonymous test before grant/after decline: **no FEYA gtag loader, no optional analytics requests**. Test one granted session and page navigation on the new domain; GA4 Realtime/DebugView one initial `page_view` per real page, valid `canonical_product_id` for real product events, LCP/INP/CLS, zero fake purchase. No PII in events.
5. Keep official GSC daily Cron, active Search Release v12, all 207 approved PDP copies, Product DNA, V13 visuals and merchant payment OFF unchanged.

Next external dependency is Google stream's enhanced-measurement page-view **advanced subsetting**, not another GA4 property, API secret or a new subscription. TheFEYA can prepare/release the dormant source binding from GitHub/Vercel without owner manually inserting tag code. Final telemetry enablement cannot be claimed without the gates above.
