import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import readiness from '../../docs/search/manual-price-governance-production-readiness-20260925.json' with {type:'json'};

test('E18 separates safe schema install from blocked business execution',()=>{
  assert.equal(readiness.production_observed.governance_migration_present,false);
  assert.equal(readiness.production_observed.manual_repair_request_pending,true);
  assert.equal(readiness.production_observed.manual_repair_receipt_rows,0);
  assert.equal(readiness.expected_schema_only_effect.business_rows_changed,0);
  assert.equal(readiness.expected_schema_only_effect.payment,false);
  assert.equal(readiness.expected_schema_only_effect.indexing,false);
  assert.match(readiness.decision,/SCHEMA_SAFE/);
  assert.match(readiness.decision,/EXECUTION_BLOCKED/);
});

test('E18 preflight and postflight are read-only',()=>{
  for(const path of [
    'supabase/preflight/manual_price_governance_preflight_v1.sql',
    'supabase/postflight/manual_price_governance_schema_postflight_v1.sql',
  ]){
    const sql=readFileSync(path,'utf8').toLowerCase();
    assert.match(sql,/select/);
    for(const token of ['insert into','update ','delete from','alter table','create table','drop ','grant ','revoke ','truncate '])
      assert.equal(sql.includes(token),false,`${path} contains mutating token ${token}`);
  }
});
