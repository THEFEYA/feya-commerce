# FEYA Admin Auth Gate v1

Status: scaffolding implemented, enforcement disabled by default
Repository: THEFEYA/feya-commerce

## Purpose

Protect internal FEYA Admin before any controlled editing, approvals, Product Truth mutation, SEO publishing or Growth OS execution is enabled.

The public storefront remains public.

The admin must become an authenticated operator surface before write workflows are activated.

## Current implementation

The branch includes:

- @supabase/ssr
- cookie-based Supabase server client
- /admin/login
- password sign-in for existing Supabase Auth users
- no public signup
- middleware protection for /admin/*
- server-side allowlist
- logout action
- private/no-store cache behavior for protected admin requests

## Existing Supabase Auth state observed during audit

- 2 Auth users exist
- both email accounts are confirmed
- no previous sign-in recorded
- provider: email
- no admin role in app_metadata

No account was automatically promoted to admin.

## Feature flag

Enforcement is controlled by:

FEYA_ADMIN_AUTH_REQUIRED=true|false

Default in repository example:

false

This prevents the implementation branch from unexpectedly locking the existing read-only preview.

## Allowlist

When auth enforcement is enabled, at least one of these must be configured server-side:

FEYA_ADMIN_ALLOWED_USER_IDS
FEYA_ADMIN_ALLOWED_EMAILS

Comma-separated values are supported.

If the gate is enabled but the allowlist is empty, /admin fails closed with HTTP 403.

If Supabase auth configuration is missing while the gate is enabled, /admin fails closed with HTTP 503.

## Supabase keys

Preferred:

NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Temporary compatibility fallback:

NEXT_PUBLIC_SUPABASE_ANON_KEY

The service-role key is never used for browser authentication.

## Security boundary

Authentication does not itself authorize database writes.

Future write actions still require:

1. authenticated/allowlisted operator;
2. domain validation;
3. change proposal/version;
4. approval where required;
5. server-only write service;
6. change/audit event;
7. execution result.

## Restricted Product Truth

Some internal views such as feya_commerce_v_seo_product_truth_v4 are intentionally not exposed to the current anonymous read client.

The current read-only Product Builder detail uses only the already permitted safe view:

feya_commerce_v_step6_product_builder_detail

Restricted diagnostics must not be surfaced through service-role reads until the admin route is actually protected.

## Activation gate

Do not set FEYA_ADMIN_AUTH_REQUIRED=true until:

- the intended admin Auth account(s) are identified;
- the allowlist is configured in Vercel/server environment;
- login is tested on preview;
- logout is tested;
- unauthorized access is confirmed blocked;
- admin cache headers are verified.

## Controlled editing gate

No product/content/media/price write UI should be added before Admin Auth Activation PASS.

This is a hard Growth OS prerequisite.
