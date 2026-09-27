import test from 'node:test';
import assert from 'node:assert/strict';
import state from '../../docs/search/manual-configuration-repair-production-state-20260925.json' with {type:'json'};

test('production manual-repair state records schema success but no business execution',()=>{
  assert.equal(state.remote_migration.name,'manual_configuration_binding_repair_v1');
  assert.equal(state.remote_migration.apply_success,true);
  assert.equal(state.postflight.price_rows,6);
  assert.equal(state.postflight.configuration_rows,3);
  assert.equal(state.postflight.evidence_sha256,'19a84d86e52724753350d3c12d22ded4e6e19a0ab2c0dedb36a292a481e502ae');
  assert.equal(state.business_mutation.configuration_repair_executed,false);
  assert.equal(state.business_mutation.price_amount_changed,false);
  assert.equal(state.business_mutation.payment,false);
  assert.equal(state.business_mutation.indexing,false);
});

test('agent-prepared repair remains human-gated and has no receipt',()=>{
  assert.equal(state.prepared_execution_request.request_status,'APPROVAL_REQUIRED');
  assert.equal(state.prepared_execution_request.requested_by_type,'agent');
  assert.equal(state.prepared_execution_request.requested_by_user_id,null);
  assert.equal(state.prepared_execution_request.approval_hash,null);
  assert.equal(state.prepared_execution_request.receipt_rows,0);
  assert.equal(state.current_blocker,'AUTHENTICATED_ALLOWLISTED_HUMAN_APPROVAL_REQUIRED');
});
