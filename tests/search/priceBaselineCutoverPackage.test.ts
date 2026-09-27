import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import readiness from '../../docs/search/price-baseline-production-cutover-readiness-20260925.json' with { type: 'json' };

test('production cutover package remains explicitly unauthorized',()=>{
  assert.equal(readiness.status,'HOLD_NOT_AUTHORIZED');
  assert.equal(readiness.authorization.schema_apply,false);
  assert.equal(readiness.authorization.batch_execute,false);
  assert.equal(readiness.authorization.payment,false);
  assert.equal(readiness.authorization.indexing,false);
});

test('minimal cutover does not bundle variant/quote/offer migrations',()=>{
  assert.equal(readiness.minimal_cutover_plan.apply_only,'supabase/migrations/20260925170000_price_baseline_adoption_v1.sql');
  assert.equal(readiness.minimal_cutover_plan.do_not_bundle.length,3);
  assert.equal(readiness.expected.clean_source_products,205);
  assert.equal(readiness.expected.clean_source_price_rows,850);
  assert.equal(readiness.expected.manual_override_products,2);
  assert.equal(readiness.exact_pre_cutover_evidence_sha256.length,64);
});

test('preflight and schema postflight are read-only inspection scripts',()=>{
  for(const path of [
    'supabase/preflight/price_baseline_adoption_preflight_v1.sql',
    'supabase/postflight/price_baseline_adoption_schema_postflight_v1.sql',
  ]){
    const sql=readFileSync(path,'utf8').toLowerCase();
    for(const forbidden of ['insert into','update ','delete from','alter table','create table','drop ','grant ','revoke ','truncate '])
      assert.equal(sql.includes(forbidden),false,`${path} contains mutating token: ${forbidden}`);
    assert.match(sql,/select/);
  }
});
