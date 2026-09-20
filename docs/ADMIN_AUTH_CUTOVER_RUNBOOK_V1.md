# FEYA Admin Auth Cutover Runbook v1

Status: PREPARED / NOT YET EXECUTED
Date: 2026-09-18
Scope: FEYA Product OS Admin + Company Control Center

## Purpose

Move FEYA Admin from the current preview/read-safe mode to a protected owner-only admin boundary without breaking the recovered Product OS.

This runbook is intentionally separate from UI work. Do not enable mutation buttons merely because authentication is enabled.

## Preconditions

All must be true before cutover:

1. The intended Human Owner Supabase Auth account exists and can sign in.
2. The exact owner account is added to either FEYA_ADMIN_ALLOWED_USER_IDS or FEYA_ADMIN_ALLOWED_EMAILS.
3. NEXT_PUBLIC_SUPABASE_URL is configured.
4. A Supabase public key is configured: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY preferred, or NEXT_PUBLIC_SUPABASE_ANON_KEY compatibility fallback.
5. SUPABASE_SERVICE_ROLE_KEY is configured only in server environment.
6. Latest owner-ui-v1 build is green.
7. npm run check:admin-boundary passes.
8. The registered Admin Data Boundary view list is complete.
9. Backup/rollback reference exists.
10. FEYA_OWNER_ACTIONS_ENABLED remains false during auth cutover and Admin Data Boundary hardening.

## Current safety state

Already implemented:

- middleware covers /admin/:path*;
- middleware covers /api/admin/:path*;
- login supports preserved return path;
- unknown/unauthenticated admin API requests return 401/403 JSON instead of HTML redirects;
- current admin reads are routed through getAdminReadClient();
- privileged service clients are not imported into client components;
- internal API token comparison uses constant-time comparison;
- FEYA Commerce/Growth audited tables with RLS disabled = 0;
- FEYA Commerce/Growth browser-executable SECURITY DEFINER functions = 0;
- Product OS admin UI remains separate from Company Control UI.

## Cutover sequence

### Step A — configure allowlist without enabling enforcement

Set one approved owner identity:

FEYA_ADMIN_ALLOWED_USER_IDS=<supabase-auth-user-id>

or

FEYA_ADMIN_ALLOWED_EMAILS=<approved-owner-email>

Prefer user ID for the final production configuration. Do not add broad domains or wildcard logic.

### Step B — verify Supabase Auth login

With FEYA_ADMIN_AUTH_REQUIRED=false:

- open /admin/login;
- sign in with the approved account;
- verify the account is confirmed;
- verify logout;
- verify login returns to the originally requested /admin/... route.

No data-boundary hardening yet.

### Step C — enable mandatory admin auth

Set FEYA_ADMIN_AUTH_REQUIRED=true and redeploy preview first.

Verify:

- unauthenticated /admin -> login;
- unauthenticated /admin/company -> login;
- unauthenticated /api/admin/... -> 401 JSON;
- authenticated but non-allowlisted account -> denied;
- approved owner account -> Product OS loads;
- approved owner account -> Listing Master loads;
- approved owner account -> Company Control loads;
- approved owner account -> read-only review queues load.

### Step D — verify server-side admin reads

In Company Control -> System, confirm:

- protected auth reports ready;
- Product OS still loads data;
- no direct client service-role usage exists;
- admin-boundary preview still reports registered views correctly.

Run npm run check:admin-boundary. Build must remain green.

### Step E — harden registered admin views

Only after Step C/D passes.

Execute the existing service-role-only hardening function with the exact confirmation phrase:

feya_fn_harden_admin_data_boundary_v1('HARDEN_FEYA_ADMIN_V1')

Expected result:

- SELECT revoked from anon/authenticated for every registered governed admin view;
- SELECT retained for service_role;
- registered admin-view state updated to server-only hardened;
- ADMIN_DATA_BOUNDARY capability becomes hardened_verified;
- preview reports 0 governed views readable by anon/authenticated.

### Step F — regression test after hardening

Verify with approved owner account:

- /admin
- /admin/products
- /admin/listing-master
- /admin/seo-keywords
- /admin/seo-engine/studio
- /admin/review/components
- /admin/company
- /admin/company/work
- /admin/company/growth
- /admin/company/results
- /admin/company/system

Verify public storefront remains independent: /shop and /shop/[slug].

Verify no public browser can query hardened admin views directly.

### Step G — security checks

Run Supabase security advisors and focused FEYA audit.

Required focused state:

- FEYA Commerce/Growth RLS-disabled tables = 0;
- browser-executable FEYA Commerce/Growth SECURITY DEFINER functions = 0;
- governed admin views browser-readable = 0.

Review Supabase Auth leaked-password protection.

### Step H — only then consider owner write actions

Authentication is necessary but not sufficient.

The Company UI now has a separate circuit breaker:

FEYA_OWNER_ACTIONS_ENABLED=false

Keep it false through Steps A–G. After auth, allowlist, protected reads and security regression checks pass, enable it first in preview and test only the explicitly prepared owner action.

Before each owner mutation is enabled:

1. define exact canonical write target;
2. define approval class;
3. define service-side RPC / Execution Gateway path;
4. define audit receipt;
5. define rollback/reversal semantics where applicable;
6. verify action-specific permission;
7. add scenario/regression coverage.

The first prepared UX-5 action is Owner Attention decision recording:
- browser route: /api/admin/company/owner-attention/decision;
- server RPC: feya_fn_transition_owner_attention_v1;
- allowed transitions: OPEN → ACKNOWLEDGED / RESOLVED / CANCELLED, ACKNOWLEDGED → RESOLVED / CANCELLED;
- expected-status guard blocks stale decisions;
- terminal decisions require a human reason;
- actor comes from the authenticated allowlisted owner session;
- every change creates feya_growth_owner_attention_events_v1;
- the action does **not** execute the underlying business change.

Never expose direct browser table mutation merely because the owner is authenticated.

## Rollback

If the auth cutover breaks the admin before admin-view hardening:

- set FEYA_ADMIN_AUTH_REQUIRED=false;
- redeploy preview;
- investigate allowlist/session configuration.

If failure occurs after admin-view hardening:

- do NOT regrant broad browser access ad hoc;
- restore access through an explicit reviewed rollback migration;
- keep service-role reads intact;
- use the pre-cutover Git branch backup for application rollback if needed.

Current code backup: backup/owner-ui-after-product-os-recovery-20260918

## Definition of done

The cutover is complete only when:

- owner login works;
- unauthorized access is denied;
- Product OS works unchanged for the owner;
- Company Control works for the owner;
- registered admin views are server-only;
- public storefront still works;
- no owner write action bypasses authenticated server-side authority and durable audit;
- FEYA_OWNER_ACTIONS_ENABLED is enabled only after the read boundary is verified;
- security regression checks pass.
