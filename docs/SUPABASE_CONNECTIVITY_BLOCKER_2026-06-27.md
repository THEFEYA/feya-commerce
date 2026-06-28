# FEYA Commerce — Supabase Connectivity Blocker

Status: recovered after read-only reality report  
Initial blocker date: 2026-06-27  
Recovery confirmed: 2026-06-28 13:47 UTC  
Related branch: `chatgpt/operating-front-2026-06-27`

This note records the Supabase connectivity blocker that was observed on 2026-06-27 and the follow-up recovery confirmation received from the Supabase-connected chat on 2026-06-28. It is not a database migration and does not change any data.

---

## 1. Confirmed context

Project: `FEYA's Project`  
Project ref: `ysnizcgzhdwdfdkjkhud`  
Region: `eu-west-1`  
Management status during the first report: `ACTIVE_HEALTHY`  
Database version reported by management API: Postgres `17.6.1.063`

No `DROP`, `CREATE`, `UPDATE`, `DELETE`, or destructive actions were performed in either Supabase audit.

---

## 2. Original critical blocker from 2026-06-27

The first Supabase-connected audit could not reach database-level reality because even minimal read-only requests failed.

Failed examples:

```sql
select 1 as ok;
select now() as checked_at;
```

Reported error:

```text
Failed to run sql query: Connection terminated due to connection timeout
```

`list_tables(public)` failed with the same class of connection timeout.

`generate_typescript_types` returned Cloudflare `522`:

```text
Cloudflare could not establish a TCP connection to the origin server.
TCP handshake timed out.
retryable: true
retry_after: 120
owner_action_required: true
```

API logs also showed repeated `522` responses for REST API calls, including:

```text
GET | 522 | /rest/v1/
GET | 522 | /rest/v1/feya_commerce_v_step8_review_queues_summary?select=*
```

---

## 3. Meaning of the original blocker

This was not evidence that a specific FEYA view was broken.

The stronger interpretation was:

```text
Supabase origin / PostgREST / DB connection layer was temporarily unreachable or timing out.
```

At that moment, GitHub work had to treat live Supabase data as temporarily unavailable and avoid production decisions based on old counts.

---

## 4. Recovery confirmation from 2026-06-28

The follow-up read-only Supabase reality report confirmed that the FEYA e-commerce read layer is queryable again.

Confirmed view counts:

| View | Rows |
| --- | ---: |
| `public.feya_commerce_v_step8_project_report` | 19 |
| `public.feya_commerce_v_step8_review_queues_summary` | 5 |
| `public.feya_commerce_v_step7_storefront_products_api` | 243 |
| `public.feya_commerce_v_step8_frontend_api_contract` | 8 |
| `public.feya_commerce_v_step6_product_catalog_overview` | 334 |
| `public.feya_commerce_v_seo_keyword_ai_cleanup_report_v1` | 431 |

Storefront API checks:

| Metric | Count |
| --- | ---: |
| total rows | 243 |
| rows with `primary_image_url is not null` | 243 |
| rows with `product_slug is not null` | 243 |
| rows with `min_price or max_price is not null` | 243 |
| rows with `has_fallback_price = true` | 0 |
| rows with `storefront_candidate_flag = true` | 243 |

SEO keyword cleanup report checks:

| Metric | Count |
| --- | ---: |
| total rows | 431 |
| `should_validate_api = true` | 431 |
| `should_hold = true` | 0 |
| `cleanup_pipeline_status = needs_human_review` | 431 |
| `validation_status = queued` | 431 |
| `priority_tier = tier_1` | 147 |
| `priority_tier = tier_2` | 284 |

Raw table public safety check:

```text
public.feya_commerce_source_listings: RLS enabled, anon SELECT false, public SELECT false, no anon/public SELECT policies.
public.feya_commerce_source_price_rows: RLS enabled, anon SELECT false, public SELECT false, no anon/public SELECT policies.
```

---

## 5. Current engineering decision

The connectivity blocker is no longer blocking Phase A verification.

Continue with:

1. Phase A read-only preview verification.
2. Admin review clarity.
3. Runtime fallback/error state improvements where useful.
4. SEO Content Engine v1 contracts.
5. Keyword validation architecture that uses real metric sources or explicitly marked manual/import sources.

Still do not implement:

- Product Builder write mutations;
- checkout/order/CRM;
- public raw table queries;
- fake keyword metrics;
- production SEO generation into product data;
- final scoring without metric source provenance.

---

## 6. Related follow-up report

The recovered reality report is recorded in:

```text
docs/SUPABASE_REALITY_REPORT_2026-06-28.md
```
