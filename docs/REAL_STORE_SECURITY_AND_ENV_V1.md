# FEYA Commerce — Real Store Security & Environment v1

Date: 2026-06-13
Status: Store foundation passport

## Purpose

Define the minimum environment and security foundation before FEYA Commerce becomes a real online store with order drafts, customer account, checkout and payment provider integration.

## Environment groups

### Public browser variables

Allowed in client/browser:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

These values may be visible in the browser and must never grant admin access.

### Server-only secrets

Never expose in browser or client components:

```text
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
PAYPAL_CLIENT_SECRET
```

These may be used only inside server routes, server actions, webhooks or backend jobs.

## Supabase rules

- Frontend reads storefront products through safe public views only.
- Frontend must not access raw import tables.
- Service role can be used only in server routes such as `/api/checkout/drafts`.
- Order tables must use RLS.
- No anon write access to order/payment tables until policies are explicitly designed.

## Checkout rules

- Cart and checkout draft may exist before payment provider.
- Paid order must not be created before verified provider callback/webhook.
- Payment provider handles card data.
- FEYA frontend/database never stores card numbers, CVC, or raw card details.
- Checkout draft can save contact, shipping, measurements, event date and customer notes.

## Payment provider readiness checklist

Before activating real payment:

1. Choose provider.
2. Add provider secrets in Vercel environment.
3. Create checkout session route.
4. Create webhook route.
5. Verify webhook signature.
6. Convert draft to paid order only from verified webhook.
7. Store provider IDs, not card details.
8. Send customer/admin notifications only after confirmed payment status.

## Draft-to-order lifecycle

```text
cart
→ checkout draft
→ provider checkout session
→ payment webhook verified
→ paid order
→ admin review
→ production
→ ready to ship
→ tracking
→ delivered
```

## Current state

Implemented:

- Cart page.
- Checkout draft page.
- Server API route for checkout drafts.
- Supabase schema migration for checkout/order draft tables.
- `.env.example` with real commerce environment variables.

Not activated yet:

- Real payment.
- Paid order finalization.
- Customer auth.
- Admin authenticated order dashboard.
- Email notifications.

## Non-negotiable rule

Do not make the site look more functional than it really is. If payment is not connected, the UI must say so. If a draft is only local because server env is missing, the UI must say so. No fake success states.
