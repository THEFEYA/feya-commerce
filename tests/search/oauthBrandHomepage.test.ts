import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('OAuth brand-review homepage is public, noindex and explains the actual internal app',()=>{
  const page=readFileSync('app/marketing-tools/page.tsx','utf8');
  assert.match(page,/title:'TheFEYA Marketing Tools'/);
  assert.match(page,/alternates:\{canonical:'\/marketing-tools'\}/);
  assert.match(page,/robots:\{index:false,follow:true\}/);
  assert.match(page,/internal application used by TheFEYA/);
  assert.match(page,/Google Ads/);
  assert.match(page,/keyword-planning evidence/);
  assert.match(page,/href="\/privacy"/);
  assert.match(page,/href="\/terms"/);
  assert.match(page,/manager\.feya@gmail\.com/);
  assert.doesNotMatch(page,/merchant of record|payment provider|public SaaS product\.<\/p>\s*<p>.*available to anyone/i);
});

test('OAuth app homepage does not create a Search Release owner or commerce grant',()=>{
  const page=readFileSync('app/marketing-tools/page.tsx','utf8');
  assert.doesNotMatch(page,/releaseRobotsForPath/);
  assert.doesNotMatch(page,/payment_enabled|order_creation_enabled|FEYA_SELLER_ONLINE_PAYMENTS_ENABLED/);
});
