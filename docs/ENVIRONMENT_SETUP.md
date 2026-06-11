# FEYA Commerce — Environment Setup

Status: Phase A setup guide

---

## 1. Required public env vars

Create `.env.local` locally with:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use values from Supabase:

```text
Project Settings → API
```

---

## 2. Do not use service role in browser

Do not add service role key to public frontend env vars.

This is not used in Phase A:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Service role can only be used later in server-only backend actions, never in client/browser code.

---

## 3. Phase A data sources

The app reads safe views only:

```text
feya_commerce_v_step7_storefront_products_api
feya_commerce_v_step8_review_queues_summary
feya_commerce_v_step6_product_catalog_overview
```

Raw tables are not used by public pages.

---

## 4. Expected behavior without env vars

If env vars are not set, pages should show a clear notice instead of crashing:

```text
Supabase env vars are not configured yet.
```

This is expected for a fresh clone before local setup.
