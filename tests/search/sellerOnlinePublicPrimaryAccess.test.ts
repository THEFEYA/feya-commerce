import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

test('thefeya.com anonymous /admin shows the invitation-only payment installation, not internal admin', () => {
  const mw = readFileSync('middleware.ts', 'utf8');
  assert.ok(mw.includes("pathname === '/admin'"));
  assert.ok(mw.includes("['GET', 'HEAD'].includes(request.method)"));
  assert.ok(mw.includes("process.env.VERCEL_ENV === 'production'"));
  assert.ok(mw.includes("process.env.VERCEL_PROJECT_ID === 'prj_ePIymo4sUG33wrRjHBxWrSlaxPID'"));
  assert.ok(mw.includes("publicPage.pathname = '/partner/seller-online'"));
  assert.ok(mw.includes('NextResponse.rewrite(publicPage)'));
  // Existing authorization gates remain present for every private route / method.
  assert.ok(mw.includes("pathname.startsWith('/api/admin/')"));
  assert.ok(mw.includes('const { data, error } = await supabase.auth.getClaims()'));
  assert.ok(mw.includes('adminAccessDecision({ id: claims.sub, email: claims.email }, process.env)'));
  // The old information-only page is gone.
  assert.ok(!existsSync('app/seller-online-integration/page.tsx'));
});

test('installation panel: invitation cookie, same-origin writes, no secret ever returned', () => {
  const access = readFileSync('lib/payments/access.ts', 'utf8');
  const status = readFileSync('app/api/partner/seller-online/route.ts', 'utf8');
  const panel = readFileSync('components/payments/SellerOnlineInstallClient.tsx', 'utf8');
  const sql = readFileSync('supabase/migrations/20261021200000_payments_provider_checkout_v1.sql', 'utf8');
  assert.match(access, /httpOnly: true, secure: true, sameSite: 'strict', path: PARTNER_API_BASE/);
  assert.match(access, /sha256\(token\)/);
  assert.match(status, /sameOrigin\(request\)/);
  assert.match(panel, /window\.history\.replaceState/);
  assert.doesNotMatch(panel, /localStorage|dangerouslySetInnerHTML|eval\(/);
  // Status function exposes hints only; secrets come only from the service-role runtime function.
  assert.match(sql, /'client_id_hint',p\.client_id_hint/);
  assert.match(sql, /create function public\.feya_pay_provider_runtime_v1\(\)/);
  assert.match(sql, /constraint feya_pay_provider_active_requires_verified_live_test/);
});
