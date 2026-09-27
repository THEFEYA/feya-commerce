import assert from 'node:assert/strict';
import test from 'node:test';
import audit from '../../docs/search/configuration-binding-audit-20260925.json' with {type:'json'};
import {releaseConfigurationRepairApprovalScopeDecision} from '../../lib/commerceReleaseConfigurationRepairApproval.ts';

const products=Array.from({length:207},(_,i)=>('00000000-0000-4000-8000-'+String(i).padStart(12,'0')));

test('configuration binding audit records the material production defect and hold lane',()=>{
  assert.equal(audit.release_products,207);
  assert.equal(audit.release_price_rows,856);
  assert.equal(audit.configuration_axis_rows,846);
  assert.equal(audit.configuration_axis_mismatched_rows,631);
  assert.equal(audit.new_sellable_configurations_required,631);
  assert.equal(audit.color_price_axis_products,3);
  assert.equal(audit.color_price_axis_rows,9);
  assert.equal(audit.clean_configuration_baseline_products_after_repair,202);
  assert.equal(audit.clean_configuration_baseline_price_rows_after_repair,841);
});

test('owner approval accepts only the exact release repair request',()=>{
  const evidence='a'.repeat(64);
  const row={
    action_code:'REPAIR_RELEASE_CONFIGURATION_BINDINGS',
    mutation_domain:'COMMERCE_CONFIGURATION',
    request_status:'APPROVAL_REQUIRED',
    requested_by_type:'agent',
    requested_by_user_id:null,
    target_scope_json:{entity_type:'RELEASE',entity_key:'feya-review-207-20260924'},
    target_version_refs_json:{release_ref:'feya-review-207-20260924',evidence_sha256:evidence},
    request_payload_json:{
      contract_version:'release_configuration_binding_repair_v1',
      release_ref:'feya-review-207-20260924',
      canonical_product_ids:products,
      evidence_sha256:evidence,
      expected_price_rows:856,
      expected_configuration_axis_rows:846,
      expected_rebind_rows:631,
      expected_create_configurations:631,
    },
  };
  const ok=releaseConfigurationRepairApprovalScopeDecision({
    row,actorUserId:'11111111-1111-4111-8111-111111111111',
    releaseRef:'feya-review-207-20260924',productIds:products,expectedEvidenceSha256:evidence,
  });
  assert.deepEqual(ok.reasons,[]);
  assert.equal(ok.ok,true);

  const bad=releaseConfigurationRepairApprovalScopeDecision({
    row:{...row,request_payload_json:{...row.request_payload_json,expected_rebind_rows:630}},
    actorUserId:'11111111-1111-4111-8111-111111111111',
    releaseRef:'feya-review-207-20260924',productIds:products,expectedEvidenceSha256:evidence,
  });
  assert.equal(bad.ok,false);
  assert.ok(bad.reasons.includes('ROW_COUNT_MISMATCH'));
});
