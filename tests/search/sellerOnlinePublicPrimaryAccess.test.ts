import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('thefeya.com anonymous admin entry exposes public vendor guide, not internal admin',()=>{
  const mw=readFileSync('middleware.ts','utf8');
  assert.ok(mw.includes("pathname === '/admin'"));
  assert.ok(mw.includes("['GET', 'HEAD'].includes(request.method)"));
  assert.ok(mw.includes("process.env.VERCEL_ENV === 'production'"));
  assert.ok(mw.includes("process.env.VERCEL_PROJECT_ID === 'prj_ePIymo4sUG33wrRjHBxWrSlaxPID'"));
  assert.ok(mw.includes("['thefeya.com','www.thefeya.com'].includes(request.nextUrl.hostname.toLowerCase())"));
  assert.ok(mw.includes("publicPage.pathname = '/seller-online-integration'"));
  assert.ok(mw.includes("NextResponse.rewrite(publicPage)"));
  assert.ok(mw.includes("'noindex, nofollow, noarchive'"));
  // Existing authorization gates remain present for every private route / method.
  assert.ok(mw.includes("pathname.startsWith('/api/admin/')"));
  assert.ok(mw.includes("const { data, error } = await supabase.auth.getClaims()"));
  assert.ok(mw.includes("adminAccessDecision({ id: claims.sub, email: claims.email }, process.env)"));
  assert.ok(mw.includes("status: 401"));
  assert.ok(mw.includes("status: 403"));
});

test('vendor public page provides real API instructions but never secret inputs or payment activation',()=>{
  const page=readFileSync('app/seller-online-integration/page.tsx','utf8');
  const admin=readFileSync('app/admin/page.tsx','utf8');
  const provider=readFileSync('lib/sellerOnlineProvider.ts','utf8');
  assert.ok(page.includes('SELLER_ONLINE_PROVIDER'));
  assert.ok(page.includes('Official API v2 Swagger documentation'));
  assert.ok(page.includes('not active'));
  assert.ok(page.includes("index:false,follow:false"));
  assert.ok(page.includes('href="/admin/login"'));
  assert.ok(!page.includes('SUPABASE_SERVICE_ROLE_KEY'));
  assert.ok(!page.includes('OPENAI_API_KEY'));
  assert.ok(!page.includes('payment_token'));
  assert.ok(!page.includes('FEYA_SELLER_ONLINE_PAYMENTS_ENABLED=true'));
  assert.ok(!page.includes('fetch('));
  assert.ok(admin.includes('getAdminReadClient'));
  assert.ok(provider.includes('merchantOfRecordConfirmed: false'));
});
