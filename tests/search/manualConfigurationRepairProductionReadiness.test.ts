import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import readiness from '../../docs/search/manual-configuration-repair-production-readiness-20260925.json' with {type:'json'};

test('manual repair readiness is schema-only and still human-gated',()=>{
  assert.equal(readiness.production_evidence.price_rows,6);
  assert.equal(readiness.production_evidence.configuration_rows,3);
  assert.equal(readiness.production_evidence.proposed_identity_conflicts,0);
  assert.equal(readiness.intended_effect.price_amount_changes,0);
  assert.equal(readiness.intended_effect.price_review_status_changes,0);
  assert.equal(readiness.execution_authority.human_approval,'HUMAN_ONLY');
  assert.equal(readiness.execution_authority.execute_repair,'STOP_UNTIL_HUMAN_APPROVAL');
});

test('manual repair preflight and schema postflight remain read-only',()=>{
  for(const path of [
    'supabase/preflight/manual_configuration_repair_preflight_v1.sql',
    'supabase/postflight/manual_configuration_repair_schema_postflight_v1.sql',
  ]){
    const sql=readFileSync(path,'utf8').toLowerCase();
    assert.match(sql,/select/);
    for(const forbidden of ['insert into','update ','delete from','alter table','create table','drop ','grant ','revoke ','truncate '])
      assert.equal(sql.includes(forbidden),false,`${path} contains mutating token ${forbidden}`);
  }
});
