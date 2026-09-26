import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('measurement runtime is mounted globally but remains environment gated',async()=>{
  const layout=await readFile(new URL('../../app/layout.tsx',import.meta.url),'utf8');
  const route=await readFile(new URL('../../app/api/measurement/context/route.ts',import.meta.url),'utf8');
  assert.match(layout,/MeasurementRuntime/);
  assert.match(route,/environment==='production'/);
  assert.match(route,/FEYA_ANALYTICS_ENABLED==='true'/);
  assert.match(route,/FEYA_GA4_MEASUREMENT_ID/);
  assert.match(route,/measurement_private_surface_excluded/);
  assert.match(route,/Cache-Control':'no-store/);
});

test('measurement client requires explicit analytics consent before loading Google tag or creating session identity',async()=>{
  const client=await readFile(new URL('../../lib/measurementClient.ts',import.meta.url),'utf8');
  const runtime=await readFile(new URL('../../components/MeasurementRuntime.tsx',import.meta.url),'utf8');
  assert.match(runtime,/pathname\.startsWith\('\/admin'\)/);
  assert.match(runtime,/pathname\.startsWith\('\/api'\)/);
  assert.match(runtime,/getAnalyticsConsent\(\)!=='granted'/);
  assert.match(client,/getAnalyticsConsent\(\)!=='granted'/);
  assert.match(client,/googletagmanager\.com\/gtag\/js/);
  assert.match(client,/ensureGoogleTag\(\)/);
  assert.match(client,/ensureSessionId\(\)/);
  const consentGate=client.indexOf("if(getAnalyticsConsent()!=='granted')");
  const eventSession=client.indexOf('session_id:ensureSessionId()',consentGate);
  assert.ok(consentGate>=0&&eventSession>consentGate,
    'Consent gate must appear before session identity creation in event flow');
});

test('storefront wiring emits only truthful pre-checkout ecommerce events',async()=>{
  const card=await readFile(new URL('../../components/ProductCard.tsx',import.meta.url),'utf8');
  const pdp=await readFile(new URL('../../components/ProductDetailClient.tsx',import.meta.url),'utf8');
  assert.match(card,/trackEcommerceEvent\('select_item'/);
  assert.match(pdp,/trackEcommerceEvent\('view_item'/);
  assert.match(pdp,/trackEcommerceEvent\('add_to_cart'/);
  assert.doesNotMatch(card,/track(?:Measurement|Ecommerce)Event\('purchase'/);
  assert.doesNotMatch(pdp,/track(?:Measurement|Ecommerce)Event\('purchase'/);
  assert.doesNotMatch(pdp,/trackEcommerceEvent\('begin_checkout'/);
});

test('Growth OS registry describes measurement as available-with-limitations and default off',async()=>{
  const sql=await readFile(new URL('../../supabase/migrations/20260926213000_storefront_measurement_contract_v1.sql',import.meta.url),'utf8');
  assert.match(sql,/'STOREFRONT_MEASUREMENT_CONTRACT'/);
  assert.match(sql,/'AVAILABLE_WITH_LIMITATIONS'/);
  assert.match(sql,/"default_state":"off"/);
  assert.match(sql,/"explicit_analytics_consent_required":true/);
  assert.match(sql,/"purchase_requires":\["transaction_id","server_order_receipt_id","currency","value","items"\]/);
});
