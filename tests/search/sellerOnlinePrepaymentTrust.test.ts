import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('prepayment operator identity appears on reachable noindex Terms/Privacy without enabling checkout',()=>{
 const t=readFileSync('app/terms/page.tsx','utf8');
 const p=readFileSync('app/privacy/page.tsx','utf8');
 const provider=readFileSync('lib/sellerOnlineProvider.ts','utf8');
 for(const s of [t,p]){
   assert.match(s,/robots:\{index:false,follow:true\}/);
   assert.match(s,/SELLER_ONLINE_PROVIDER\.contactAddress\.postalCode/);
   assert.match(s,/SELLER_ONLINE_PROVIDER\.contactAddress\.line1/);
   assert.match(s,/SELLER_ONLINE_PROVIDER\.usOfficeEmail/);
   assert.match(s,/not active|not active yet/);
   assert.doesNotMatch(s,/merchantOfRecordConfirmed: true|FEYA_SELLER_ONLINE_PAYMENTS_ENABLED=true/);
 }
 assert.match(t,/confirmed legal seller or manufacturer/);
 assert.match(p,/confirmed legal seller or manufacturer/);
 assert.match(provider,/merchantOfRecordConfirmed: false/);
 assert.match(provider,/FEYA_SELLER_ONLINE_PAYMENTS_ENABLED/);
 assert.match(provider,/FEYA_SELLER_ONLINE_ROLE_CONFIRMED/);
});
test('seller declaration does not tamper with Search v12 foundational legal/trust page source pins',()=>{
 const migration=readFileSync('supabase/migrations/20261001151500_phase12_foundational_page_versions_v2.sql','utf8');
 const footer=readFileSync('components/Footer.tsx','utf8');
 const contact=readFileSync('app/contact/page.tsx','utf8');
 assert.match(migration,/phase12_foundational_exact_binding_invalid/);
 assert.match(contact,/releaseRobotsForPath\('\/contact'\)/);
 assert.match(footer,/Checkout not active/);
 assert.doesNotMatch(migration,/app\/terms\/page\.tsx|app\/privacy\/page\.tsx/);
});
