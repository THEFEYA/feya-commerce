import assert from 'node:assert/strict';
import test from 'node:test';
import release from '../../docs/search/closed-review-source-manifest-20260924.json' with { type: 'json' };
import audit from '../../docs/search/price-baseline-audit-manifest-20260925.json' with { type: 'json' };

const releaseIds=(release.entries||[]).map((entry:any)=>entry?.identity?.canonical_product_id).filter(Boolean).sort();
const manual=[...(audit.manual_override_product_ids||[])].sort();
const clean=releaseIds.filter((id:string)=>!manual.includes(id));

test('audit partitions the sealed release into 205 clean + 2 manual products',()=>{
  assert.equal(audit.status,'AUDITED_NOT_ADOPTED');
  assert.equal(releaseIds.length,207);
  assert.equal(clean.length,205);
  assert.equal(manual.length,2);
  assert.equal(new Set([...clean,...manual]).size,207);
});

test('manual override lane is explicit and no unexplained product remains',()=>{
  assert.deepEqual(manual,[
    '057fbd51-52f5-4404-b126-e5d75b8599f4',
    '5602d557-9d98-454b-bc98-9b9ea84b442f',
  ]);
  assert.equal(audit.counts.clean_source_price_rows,850);
  assert.equal(audit.counts.manual_override_product_price_rows,6);
  assert.equal(audit.counts.unexplained_hold_products,0);
  assert.equal(audit.production_mutation,false);
});
