import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

function blob(path:string){
  const src=readFileSync(path);
  return createHash('sha1').update(`blob ${src.length}\0`).update(src).digest('hex');
}
test('contact redesign proposal does not silently replace the ACTIVE v12 indexed contact source',()=>{
  const content=readFileSync('app/contact/page.tsx','utf8');
  const historic=readFileSync('supabase/migrations/20261001151500_phase12_foundational_page_versions_v2.sql','utf8');
  assert.match(content,/releaseRobotsForPath\('\/contact'\)/);
  assert.match(historic,new RegExp(blob('app/contact/page.tsx')));
  assert.match(historic,/phase12_foundational_refresh_requires_zero_active_search_releases/);
});
test('Contact preview cannot be indexed or become a second live public contact route',()=>{
  const preview=readFileSync('app/contact-review/page.tsx','utf8');
  assert.match(preview,/robots:\{index:false,follow:false/);
  assert.match(preview,/process\.env\.VERCEL_ENV!=='preview'/);
  assert.match(preview,/notFound\(\)/);
  assert.match(preview,/ContactExperience2026/);
});
test('Contact design uses real customer support, canonical provider metadata and existing legal routes',()=>{
  const component=readFileSync('components/ContactExperience2026.tsx','utf8');
  const provider=readFileSync('lib/sellerOnlineProvider.ts','utf8');
  assert.match(component,/manager\.feya@gmail\.com/);
  assert.match(component,/380636556288/);
  assert.match(component,/SELLER_ONLINE_PROVIDER/);
  assert.match(component,/op\.contactAddress\.postalCode/);
  assert.match(component,/online checkout|Online payments/i);
  assert.match(component,/href="\/privacy"/);
  assert.match(component,/href="\/terms"/);
  assert.match(component,/href="\/returns"/);
  assert.match(component,/href="\/shipping"/);
  assert.match(provider,/merchantOfRecordConfirmed: false/);
  assert.doesNotMatch(component,/Merchant of Record|is our legal seller|guaranteed response|24\/7/i);
  assert.match(component,/focus-visible/);
});
