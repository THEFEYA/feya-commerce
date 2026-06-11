# FEYA Commerce — Vercel Setup Phase A

Status: guide for first preview deploy

---

## 1. Goal

Deploy a read-only preview of FEYA Commerce.

This is not production launch.

The first deploy should verify:

- app builds;
- safe Supabase views can be read;
- product grid works;
- admin review dashboard works;
- no raw tables or write actions are exposed.

---

## 2. Import repository

Vercel project source:

```text
THEFEYA/feya-commerce
```

Framework preset:

```text
Next.js
```

Build command:

```text
npm run build
```

Install command:

```text
npm install
```

Output directory:

```text
.next
```

---

## 3. Required environment variables

Set in Vercel Project Settings → Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Use values from Supabase Project Settings → API.

Do not add service role key in Phase A.

---

## 4. First routes to test

After deploy, open:

```text
/
/shop
/admin
/admin/review
/admin/products
```

Expected:

- pages render;
- `/shop` loads product cards when Supabase view permissions allow it;
- `/admin/review` loads queue cards;
- `/admin/products` loads product rows;
- if Supabase blocks anon reads, the page shows a safe error.

---

## 5. If Supabase read fails

Do not open raw tables publicly.

Fix should be done by adding safe read access only to approved views or by using server-side API routes later.

Never expose:

```text
feya_commerce_source_listings
feya_commerce_source_price_rows
```

---

## 6. Phase A Vercel success criteria

The deploy is acceptable when:

- build passes;
- env vars are configured;
- no secret is committed;
- read-only pages work;
- no write/edit UI exists;
- storefront preview uses safe view data only.
