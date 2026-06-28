# FEYA Commerce — Current Reality Update

Status: active operating update  
Date: 2026-06-28  
Branch: `rebuild/emergent-template-port-v2`  
Related PR: `#5 — Recover FEYA storefront baseline and prepare v4-safe data wiring`  
Previous SEO/Supabase salvage source: frozen PR `#15`

This update supersedes the temporary Supabase blocker state from 2026-06-27 and records the current operating reality now that work has been moved back onto the approved visual baseline. It does not replace the main project docs.

---

## 1. Confirmed now

- GitHub write access works.
- PR #5 is the approved visual baseline branch.
- Supabase read layer is queryable again.
- All six requested FEYA commerce views exist.
- Storefront API has 243 public candidate rows.
- All 243 storefront rows have image URL, slug, price, and storefront flag.
- No fallback prices are exposed through the storefront API.
- Raw source tables do not appear publicly readable by anon/public.
- PR #15 is frozen as SEO/Supabase salvage only and must not be used as the visual baseline.

---

## 2. Confirmed Supabase counts

| Area | Count |
| --- | ---: |
| `feya_commerce_v_step7_storefront_products_api` | 243 |
| `feya_commerce_v_step6_product_catalog_overview` | 334 |
| `feya_commerce_v_step8_review_queues_summary` | 5 |
| `feya_commerce_v_seo_keyword_ai_cleanup_report_v1` | 431 |
| `feya_commerce_v_step8_frontend_api_contract` | 8 |
| `feya_commerce_v_step8_project_report` | 19 |

Review queues:

| Queue | Count |
| --- | ---: |
| `needs_price` | 17 |
| `missing_media` | 10 |
| `fallback_price_review_rows` | 92 |
| `storefront_excluded` | 91 |
| `sampler_excluded_rows` | 2 |

SEO keyword queue:

| Metric | Count |
| --- | ---: |
| total rows | 431 |
| `cleanup_pipeline_status = needs_human_review` | 431 |
| `validation_status = queued` | 431 |
| `priority_tier = tier_1` | 147 |
| `priority_tier = tier_2` | 284 |
| `should_validate_api = true` | 431 |
| `should_hold = true` | 0 |

---

## 3. Important code/data mismatch found

The previous internal SEO cleanup API route on the frozen salvage branch selected rows with:

```text
cleanup_pipeline_status = needs_ai_cleanup
```

But the recovered Supabase report says all 431 current rows are:

```text
cleanup_pipeline_status = needs_human_review
validation_status = queued
should_validate_api = true
```

Meaning:

- the current SEO admin must display the queue read-only;
- the old AI cleanup route is stale for the current queue state;
- the next SEO step should not be a blind AI cleanup run;
- the next SEO step should define the correct validation/review contracts and decide whether these rows need human review, metric validation, or a second AI normalization pass.

Do not run or expand generation until this mismatch is resolved intentionally.

---

## 4. What remains unknown

- Exact shape of `feya_commerce_v_step8_frontend_api_contract` rows.
- Exact row shape of product builder detail view.
- Whether the protected internal API token is configured in Vercel production/preview.
- Whether Google Ads API Basic Access is approved and usable.
- Whether Google Ads keyword metrics route can run against the current batch table shape.
- Final storage target for SEO packs / content drafts / review decisions.
- Final workflow for manual metric import if Google Ads remains unavailable.

---

## 5. Safe next commits on PR #5

### Commit group A — visual baseline protection

- Keep luxury/dark storefront as the approved baseline.
- Do not change `app/globals.css`, `ProductCard`, `ShopClient`, `ProductDetailClient`, `/shop`, PDP, or home visual layout without explicit visual approval.
- Small functional fixes are allowed only when they preserve the approved look.

### Commit group B — SEO Content Engine contracts v1

Add TypeScript contracts only, no generation, no writes:

- `SeoContentPackV1`
- `KeywordBucketAssignment`
- `ContentQaResult`
- `ImageSeoCheckResult`
- `CannibalizationWarning`
- `StructuredDataReadiness`
- `SeoPublishReadinessStatus`
- keyword metric provenance types
- manual/import/API metric source statuses

### Commit group C — SEO admin read-only improvement

After contracts exist, improve the existing PR #5 admin SEO area to show the actual current queue reality:

- 431 total queued candidates;
- all currently `needs_human_review`;
- all currently queued for validation;
- tier split 147 / 284;
- no hold rows;
- warning that current candidates are not final SEO keywords.

---

## 6. Still blocked until explicit confirmation

Do not implement these yet:

- writes into product/content tables;
- Product Builder mutations;
- checkout/order/CRM;
- public raw table queries;
- final scoring without metrics;
- final SEO pack generation into product data;
- Google Ads metric fetch run without confirming API access and current batch table shape;
- OpenAI-based volume/competition/trend scoring.

---

## 7. Operating decision

The project can now move from “blocked by Supabase connectivity” to:

```text
Approved visual baseline + Phase A verified read-only preview + SEO contracts preparation
```

The next best engineering move is not a mass generator. It is to connect the SEO Content Engine contracts to confirmed read-only product/keyword shapes on the approved visual baseline.
