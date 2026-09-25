import assert from 'node:assert/strict';
import test from 'node:test';
import checkpoint from '../../docs/search/price-baseline-production-schema-applied-20260925.json' with { type: 'json' };
import { readFileSync } from 'node:fs';

test('E6 records one applied remote migration and no batch execution',()=>{
  assert.equal(checkpoint.remote_migration.name,'price_baseline_adoption_v1');
  assert.equal(checkpoint.remote_migration.version,'20260925153503');
  assert.equal(checkpoint.remote_migration.apply_success,true);
  assert.equal(checkpoint.execution_state.batch_prepare,false);
  assert.equal(checkpoint.execution_state.human_approval,false);
  assert.equal(checkpoint.execution_state.batch_execute,false);
});

test('postflight preserves exact audited production evidence',()=>{
  assert.equal(checkpoint.postflight.clean_source_products,205);
  assert.equal(checkpoint.postflight.clean_source_price_rows,850);
  assert.equal(checkpoint.postflight.hold_products,0);
  assert.equal(checkpoint.postflight.already_ready_products,0);
  assert.equal(checkpoint.postflight.evidence_sha256,'500c7c18cca25ecee33adb399dfa2380042ed4946775ef95c64f727a8e8e5c6f');
  assert.equal(checkpoint.postflight.anon_can_execute,false);
  assert.equal(checkpoint.postflight.authenticated_can_execute,false);
});

test('preflight/postflight track remote migration by name, not repository timestamp equality',()=>{
  for(const path of [
    'supabase/preflight/price_baseline_adoption_preflight_v1.sql',
    'supabase/postflight/price_baseline_adoption_schema_postflight_v1.sql',
  ]){
    const sql=readFileSync(path,'utf8');
    assert.match(sql,/name='price_baseline_adoption_v1'/);
    assert.doesNotMatch(sql,/where version='20260925170000'/);
  }
});
