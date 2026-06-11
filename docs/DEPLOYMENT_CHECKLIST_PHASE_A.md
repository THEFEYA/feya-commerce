# FEYA Commerce — Phase A Deployment Checklist

Status: draft checklist  
Scope: read-only storefront/admin preview

---

## 1. Before first deploy

Required:

- app builds locally or in CI;
- `.env.local` exists locally;
- deployment platform has public Supabase env vars;
- only safe Supabase views are used;
- no service role key is exposed;
- no write/edit mutations exist.

---

## 2. Required env vars

Set in local `.env.local` and deployment platform:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Do not expose:

```text
SUPABASE_SERVICE_ROLE_KEY
```

---

## 3. Safe views used in Phase A

Public storefront:

```text
feya_commerce_v_step7_storefront_products_api
```

Admin preview:

```text
feya_commerce_v_step8_review_queues_summary
feya_commerce_v_step6_product_catalog_overview
```

---

## 4. Routes to verify

```text
/
/shop
/shop/[slug]
/admin
/admin/review
/admin/products
```

Expected behavior:

- pages render without crashing;
- if env vars are missing, clear notice is shown;
- if Supabase permissions are missing, error is visible but safe;
- no raw source data is exposed.

---

## 5. Supabase security checklist

Before public deploy, confirm:

- raw tables are not publicly readable;
- safe views have the intended read strategy;
- anon key can read only what is intended;
- storefront view does not include internal raw payloads;
- admin preview does not expose sensitive customer/order data.

---

## 6. Phase A done criteria

Phase A is done when:

- `/shop` shows product cards from Supabase;
- `/shop/[slug]` opens read-only PDP preview;
- `/admin/review` shows queue counts;
- `/admin/products` shows product rows;
- no write actions exist;
- no secret key is committed or exposed;
- docs describe current state.
