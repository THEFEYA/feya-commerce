# FEYA Commerce — Supabase Connectivity Blocker

Status: active blocker note  
Date: 2026-06-27  
Related branch: `chatgpt/operating-front-2026-06-27`

This note records the Supabase reality report received from the Supabase-connected chat. It is not a database migration and does not change any data.

---

## 1. Confirmed context

Project: `FEYA's Project`  
Project ref: `ysnizcgzhdwdfdkjkhud`  
Region: `eu-west-1`  
Management status: `ACTIVE_HEALTHY`  
Database version reported by management API: Postgres `17.6.1.063`

No `DROP`, `CREATE`, `UPDATE`, `DELETE`, or destructive actions were performed in the Supabase audit.

---

## 2. Critical blocker

The Supabase-connected audit could not reach database-level reality because even minimal read-only requests failed.

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

## 3. Meaning for GitHub work

This is not evidence that a specific FEYA view is broken.

The stronger interpretation is:

```text
Supabase origin / PostgREST / DB connection layer is currently unreachable or timing out.
```

Therefore, GitHub work must treat live Supabase data as temporarily unavailable and should not make production decisions based on old counts until the audit is rerun.

---

## 4. What could not be confirmed

The following remain unknown until Supabase connectivity is restored:

- existence of current FEYA commerce views;
- row counts in the safe storefront/admin views;
- first 5 rows from the safe views;
- storefront completeness metrics;
- SEO keyword cleanup status counts;
- whether anon can or cannot read raw source tables.

Important distinction:

```text
No evidence was found that anon can read raw source tables.
But the audit also could not prove that anon cannot read them because permission inspection was blocked.
```

---

## 5. Immediate engineering decision

Do not block all GitHub work.

Continue with safe code tasks that do not require live DB reality:

1. Keep Phase A read-only behavior.
2. Verify Vercel build/runtime status independently.
3. Improve graceful error states for Supabase timeout/522 cases.
4. Define SEO Content Engine contracts without writing to product data.
5. Rerun Supabase read-only audit after connectivity recovers.

Do not implement content generation writes, Product Builder mutations, checkout, order flows, or public raw table queries until Supabase reality is confirmed.

---

## 6. Next Supabase action after recovery

When Supabase connectivity recovers, rerun the read-only audit prompt from `docs/CURRENT_REALITY_MAP_2026-06-27.md`.

The first pass should check:

- `public.feya_commerce_v_step8_project_report`
- `public.feya_commerce_v_step8_review_queues_summary`
- `public.feya_commerce_v_step7_storefront_products_api`
- `public.feya_commerce_v_step8_frontend_api_contract`
- `public.feya_commerce_v_step6_product_catalog_overview`
- `public.feya_commerce_v_seo_keyword_ai_cleanup_report_v1`

---

## 7. Current blocker classification

Severity: high  
Scope: runtime/data access  
Blocks: production data decisions, live Supabase validation, launch readiness confirmation  
Does not block: GitHub code audit, build verification, docs, UI fallback improvements, type/contract design
