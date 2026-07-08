# FEYA Commerce — Supabase Reality Report

Status: read-only Supabase reality confirmed  
Checked at: 2026-06-28 13:47 UTC  
Project: `FEYA's Project`  
Project ref: `ysnizcgzhdwdfdkjkhud`  
Scope: Feya e-commerce / TheFEYA personal commerce site only

This report records the Supabase-connected audit received after the previous connectivity timeout / Cloudflare 522 blocker. No database writes or destructive actions were performed.

---

## 1. View existence and row counts

| View | Exists | Type | Rows |
| --- | ---: | --- | ---: |
| `public.feya_commerce_v_step8_project_report` | yes | view | 19 |
| `public.feya_commerce_v_step8_review_queues_summary` | yes | view | 5 |
| `public.feya_commerce_v_step7_storefront_products_api` | yes | view | 243 |
| `public.feya_commerce_v_step8_frontend_api_contract` | yes | view | 8 |
| `public.feya_commerce_v_step6_product_catalog_overview` | yes | view | 334 |
| `public.feya_commerce_v_seo_keyword_ai_cleanup_report_v1` | yes | view | 431 |

---

## 2. Storefront products API health

`public.feya_commerce_v_step7_storefront_products_api` is queryable and structurally healthy for Phase A read-only preview.

| Metric | Count |
| --- | ---: |
| total rows | 243 |
| rows with `primary_image_url is not null` | 243 |
| rows with `product_slug is not null` | 243 |
| rows with `min_price or max_price is not null` | 243 |
| rows with `has_fallback_price = true` | 0 |
| rows with `storefront_candidate_flag = true` | 243 |

Observed sample rows confirm usable storefront fields: slug, title, source URL, primary image, price range, configurations, handmade flag, shipping profile, and production profile.

Important result:

```text
No fallback-price rows are exposed in the storefront API view.
```

---

## 3. Review queue summary

`public.feya_commerce_v_step8_review_queues_summary` is queryable and returns the expected five queues.

| Queue | Count | Source view |
| --- | ---: | --- |
| `needs_price` | 17 | `feya_commerce_v_step6_needs_price` |
| `missing_media` | 10 | `feya_commerce_v_step6_missing_media` |
| `fallback_price_review_rows` | 92 | `feya_commerce_v_step6_fallback_price_review` |
| `storefront_excluded` | 91 | `feya_commerce_v_step7_storefront_excluded` |
| `sampler_excluded_rows` | 2 | `feya_commerce_v_step6_sampler_excluded` |

Interpretation:

- Phase A storefront preview can continue with 243 safe storefront products.
- Admin review must still make these issue queues visible.
- Product Builder and write workflows must still wait until read-only review UX is stable.

---

## 4. SEO keyword cleanup report

`public.feya_commerce_v_seo_keyword_ai_cleanup_report_v1` is queryable and returns 431 rows.

| Metric | Count |
| --- | ---: |
| total rows | 431 |
| `should_validate_api = true` | 431 |
| `should_hold = true` | 0 |

### Counts by `cleanup_pipeline_status`

| Status | Count |
| --- | ---: |
| `needs_human_review` | 431 |

### Counts by `validation_status`

| Status | Count |
| --- | ---: |
| `queued` | 431 |

### Counts by `priority_tier`

| Tier | Count |
| --- | ---: |
| `tier_1` | 147 |
| `tier_2` | 284 |

Interpretation:

```text
The SEO queue is populated and waiting for real metric validation plus human review.
```

Do not treat these keywords as final SEO decisions. They are candidates.

---

## 5. Raw source table anon-read safety

Checked raw source tables:

- `public.feya_commerce_source_listings`
- `public.feya_commerce_source_price_rows`

| Table | Exists | RLS enabled | anon SELECT privilege | public SELECT privilege | anon/public SELECT policies |
| --- | ---: | ---: | ---: | ---: | ---: |
| `public.feya_commerce_source_listings` | yes | true | false | false | none |
| `public.feya_commerce_source_price_rows` | yes | true | false | false | none |

Result:

```text
No obvious sign that public anon can read raw source tables.
```

This supports continuing Phase A read-only preview through safe views only.

---

## 6. Engineering decision after this report

The previous Supabase connectivity blocker is no longer blocking Phase A verification.

Safe next work:

1. Update reality docs and blocker status.
2. Keep PR #15 draft until the owner explicitly allows merge.
3. Continue Phase A readiness checks.
4. Improve safe fallback/error states where useful.
5. Define SEO Content Engine v1 contracts.

Still not allowed:

- Product Builder write mutations;
- checkout/order/CRM flows;
- public raw table access;
- fake keyword metrics from OpenAI;
- production SEO generation into product data;
- final keyword scoring without real metrics or an explicitly marked manual/import metric source.
