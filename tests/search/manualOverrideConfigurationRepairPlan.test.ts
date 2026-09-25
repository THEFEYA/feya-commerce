import test from 'node:test';
import assert from 'node:assert/strict';
import rawPlan from '../../docs/search/manual-override-configuration-repair-plan-20260925.json' with { type: 'json' };

const plan = rawPlan as any;

test('clean baseline production request is pending human approval with no receipt/mutation',()=>{
  const r=plan.clean_baseline_request;
  assert.equal(r.request_status,'APPROVAL_REQUIRED');
  assert.equal(r.requested_by_type,'agent');
  assert.equal(r.requested_by_user_id,null);
  assert.equal(r.approval_hash,null);
  assert.equal(r.receipt_rows,0);
  assert.equal(r.clean_products,205);
  assert.equal(r.clean_price_rows,850);
  assert.equal(r.price_governance_mutation_performed,false);
});

test('manual lane accounts for exactly six immutable price identities and three proposed new configurations',()=>{
  const lane=plan.manual_lane;
  const bindings=lane.products.flatMap(p=>p.desired_bindings);
  assert.equal(bindings.length,6);
  assert.equal(new Set(bindings.map(x=>x.configuration_price_id)).size,6);
  assert.equal(bindings.filter(x=>x.config_operation==='create_and_rebind').length,3);
  assert.equal(lane.proposed_new_sellable_configurations,3);
  assert.equal(lane.commercial_values_change,false);
  assert.equal(lane.price_review_status_change,false);
});

test('repair plan preserves known commercial values and manual overrides',()=>{
  const bindings=plan.manual_lane.products.flatMap(p=>p.desired_bindings);
  const byId=new Map(bindings.map(x=>[x.configuration_price_id,x]));
  assert.equal(byId.get('26274d0c-81c9-44e6-9ce7-c3056c62040c').manual_override_amount,460.44);
  assert.equal(byId.get('26274d0c-81c9-44e6-9ce7-c3056c62040c').public_price_amount,460.44);
  assert.equal(byId.get('48f92e5d-bff1-47ec-89f8-b026b77e3cb9').source_amount,164.06);
  assert.equal(byId.get('48f92e5d-bff1-47ec-89f8-b026b77e3cb9').manual_override_amount,260);
  assert.equal(byId.get('48f92e5d-bff1-47ec-89f8-b026b77e3cb9').public_price_amount,260);
  for(const x of bindings.filter(x=>x.manual_override_amount==null&&x.source_amount!=null))assert.equal(x.public_price_amount,x.source_amount);
});

test('collapsed source options are separated into exact target configuration identities',()=>{
  const p057=plan.manual_lane.products.find(p=>p.canonical_product_id.startsWith('057fbd51'));
  const p560=plan.manual_lane.products.find(p=>p.canonical_product_id.startsWith('5602d557'));
  assert.deepEqual(p057.desired_bindings.map(x=>x.normalized_key),['male_outfit','female_outfit','full_set_couple_owner_20260917']);
  assert.deepEqual(p560.desired_bindings.map(x=>x.normalized_key),['skirt','top_shoulders','full_set']);
  assert.equal(new Set(p057.desired_bindings.map(x=>x.sellable_configuration_id)).size,3);
  assert.equal(new Set(p560.desired_bindings.map(x=>x.sellable_configuration_id)).size,3);
});
