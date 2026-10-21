import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(file:string)=>readFileSync(file,'utf8');
const migration=source('supabase/migrations/20261021154000_seller_online_self_serve_payment_setup_v1.sql');
const helper=source('lib/sellerOnlinePartnerSetupServer.ts');
const api=source('app/api/partner/seller-online/route.ts');
const access=source('app/api/partner/seller-online/access/route.ts');
const page=source('app/partner/seller-online/page.tsx');
const client=source('components/SellerOnlinePartnerSetupClient.tsx');

test('self-service partner settings are isolated from production payment activation',()=>{
  assert.ok(migration.includes('check(live_payment_enabled=false)'));
  assert.ok(migration.includes('check(payment_session_enabled=false)'));
  assert.ok(migration.includes('check(order_submission_enabled=false)'));
  assert.ok(migration.includes("'configuration_saved_not_verified'"));
  assert.ok(page.includes('SellerOnlinePartnerSetupClient'));
  assert.ok(page.includes('index:false,follow:false'));
  assert.ok(client.includes('Live payments: OFF'));
  assert.ok(!client.includes('eval('));
  assert.ok(!client.includes('dangerouslySetInnerHTML'));
});

test('invitation is per-session, cryptographically hashed, expiring and revocable',()=>{
  assert.ok(helper.includes("createHash('sha256')"));
  assert.ok(helper.includes("validSellerSetupToken(raw)"));
  assert.ok(helper.includes("env.VERCEL_ENV==='production'"));
  assert.ok(helper.includes("hostname.toLowerCase()==='thefeya.com'"));
  assert.ok(migration.includes('token_sha256 text primary key'));
  assert.ok(migration.includes('g.revoked_at is null and g.expires_at > now()'));
  assert.ok(migration.includes('g.revoked_at is null'));
  assert.ok(access.includes("path:SELLER_SETUP_BASE"));
  assert.ok(access.includes("httpOnly:true,secure:true,sameSite:'strict'"));
  assert.ok(access.includes("req.headers.get('origin')!=='https://thefeya.com'"));
  assert.ok(client.includes("window.location.hash"));
  assert.ok(client.includes("window.history.replaceState"));
});

test('provider secrets never read to browser; server writes to Vault only',()=>{
  assert.ok(migration.includes('vault.create_secret'));
  assert.ok(migration.includes('vault.update_secret'));
  assert.ok(migration.includes('revoke all on public.feya_seller_online_payment_setup_v1 from public,anon,authenticated'));
  assert.ok(migration.includes('grant execute on function public.feya_seller_online_setup_save_v1(text,jsonb) to service_role'));
  assert.ok(migration.includes('return public.feya_seller_online_setup_status_v1'));
  assert.ok(!helper.includes('decrypted_secrets'));
  assert.ok(!helper.includes('vault.decrypted'));
  assert.ok(!api.includes('SUPABASE_SERVICE_ROLE_KEY'));
  assert.ok(client.includes('setFields({...EMPTY})'));
  assert.ok(!client.includes('localStorage'));
  assert.ok(!client.includes('sessionStorage'));
});

test('unapproved external scripts cannot be uploaded or executed',()=>{
  assert.ok(helper.includes("const MODES=['paypal_standard','paypal_rest','seller_online_api_v2','hosted_redirect']"));
  assert.ok(helper.includes('Object.keys(obj).some'));
  assert.ok(migration.includes("No arbitrary PHP/JavaScript/upload"));
  assert.ok(api.includes("req.headers.get('origin')!=='https://thefeya.com'"));
  assert.ok(access.includes("req.headers.get('origin')!=='https://thefeya.com'"));
  assert.ok(!api.includes('new Function('));
  assert.ok(!client.includes('fetch(fields'));
});
