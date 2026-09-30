import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('webhook invalidation uses a dedicated secret, audited request and SWR revalidateTag profile',()=>{
  const auth=readFileSync('lib/storefrontRevalidationAuth.ts','utf8');
  const route=readFileSync('app/api/internal/storefront-revalidate/route.ts','utf8');
  assert.ok(auth.includes('FEYA_STOREFRONT_REVALIDATION_TOKEN'));
  assert.ok(auth.includes('timingSafeEqual'));
  assert.ok(route.includes("validateStorefrontInvalidationRequestKey(request.headers.get('Idempotency-Key'))"));
  assert.ok(route.includes("sourceType:'internal_api'"));
  assert.ok(route.includes("mode:'revalidate_tag_max'"));
  assert.ok(route.includes("revalidateTag(tag,'max')"));
  assert.ok(route.includes('revalidatePath(path)'));
  assert.ok(route.includes('recordStorefrontInvalidationAccepted'));
  assert.ok(route.includes('markStorefrontInvalidationDelivered'));
  assert.ok(route.includes('markStorefrontInvalidationFailed'));
  assert.ok(!route.includes('updateTag('));
});

test('owner Server Action uses updateTag only after authenticated owner gate',()=>{
  const source=readFileSync('app/actions/storefrontInvalidation.ts','utf8');
  assert.ok(source.startsWith("'use server';"));
  assert.ok(source.includes('isAdminAuthRequired()'));
  assert.ok(source.includes('adminAccessDecision'));
  assert.ok(source.includes('await requireOwner()'));
  assert.ok(source.includes('recordStorefrontInvalidationAccepted'));
  assert.ok(source.includes('updateTag(tag)'));
  assert.ok(source.includes('revalidatePath(path)'));
  assert.ok(!source.includes("revalidateTag(tag,'max')"));
});

test('invalidation ledger is service-only and public Shop caching is not activated yet',()=>{
  const migration=readFileSync('supabase/migrations/20260930234500_storefront_cache_invalidation_ledger_v1.sql','utf8');
  const cardLoader=readFileSync('lib/storefrontCardReadModelServer.ts','utf8');
  const shop=readFileSync('app/shop/page.tsx','utf8');
  assert.ok(migration.includes('revoke all on public.feya_storefront_cache_invalidations_v1 from public,anon,authenticated'));
  assert.ok(migration.includes('grant select,insert,update on public.feya_storefront_cache_invalidations_v1 to service_role'));
  assert.ok(cardLoader.includes('Intentionally NOT cached yet'));
  assert.ok(!cardLoader.includes("'use cache'"));
  assert.ok(!cardLoader.includes('unstable_cache'));
  assert.ok(!/export\\s+const\\s+(?:dynamic|revalidate|fetchCache|runtime)\\s*=/.test(shop));
  const layout=readFileSync('app/layout.tsx','utf8');
  assert.ok(layout.includes('export const instant = false'));
});
