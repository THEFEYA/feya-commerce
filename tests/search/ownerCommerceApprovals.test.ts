import assert from 'node:assert/strict';
import test from 'node:test';
import {presentCommerceExecutionApproval, presentCommerceExecutionApprovals} from '../../lib/owner-ui/commerceApprovals.ts';

test('stale 205-product baseline and narrow two-product repair are no longer actionable', () => {
  assert.equal(presentCommerceExecutionApproval({
    execution_request_id:'9ebd0414-3547-4d21-8d71-82d1f2173e81',
    action_code:'ADOPT_SOURCE_PRICE_BASELINE',
    request_payload_json:{price_row_count:850,canonical_product_ids:Array.from({length:205},(_,i)=>'p-'+i)},
  }),null);
  assert.equal(presentCommerceExecutionApproval({
    execution_request_id:'3181a279-3f98-4faf-874f-788d20d8731a',
    action_code:'REPAIR_MANUAL_CONFIGURATION_BINDINGS',
    request_payload_json:{expected_price_rows:6,expected_target_configurations:6,canonical_product_ids:['a','b']},
  }),null);
});

test('projects catalog-wide structural repair as the current M1 owner gate', () => {
  const item=presentCommerceExecutionApproval({
    execution_request_id:'00000000-0000-4000-8000-000000000010',
    action_code:'REPAIR_RELEASE_CONFIGURATION_BINDINGS',
    request_payload_json:{
      canonical_product_ids:Array.from({length:207},(_,i)=>'p-'+i),
      expected_rebind_rows:631,
      expected_create_configurations:631,
    },
  });
  assert.ok(item);
  assert.equal(item.href,'/admin/company/commerce-configuration-repair');
  assert.match(item.whyNow,/631 configuration-axis price rows/);
  assert.match(item.whyNow,/207 launch-товаров/);
});

test('projects only the repaired 202-product clean baseline after structural repair', () => {
  const stale=presentCommerceExecutionApproval({
    execution_request_id:'00000000-0000-4000-8000-000000000011',
    action_code:'ADOPT_SOURCE_PRICE_BASELINE',
    request_payload_json:{price_row_count:850,canonical_product_ids:Array.from({length:205},(_,i)=>'p-'+i)},
  });
  assert.equal(stale,null);
  const current=presentCommerceExecutionApproval({
    execution_request_id:'00000000-0000-4000-8000-000000000012',
    action_code:'ADOPT_SOURCE_PRICE_BASELINE',
    request_payload_json:{price_row_count:841,canonical_product_ids:Array.from({length:202},(_,i)=>'p-'+i)},
  });
  assert.ok(current);
  assert.equal(current.href,'/admin/review/prices#baseline-adoption');
  assert.match(current.whyNow,/202 товаров/);
  assert.match(current.whyNow,/841 цен/);
});

test('manual governance remains actionable after structural repair', () => {
  const items=presentCommerceExecutionApprovals([{
    execution_request_id:'00000000-0000-4000-8000-000000000013',
    action_code:'ADOPT_MANUAL_PRICE_LANE_GOVERNANCE',
    request_payload_json:{expected_price_rows:6,expected_configuration_rows:6},
  }]);
  assert.equal(items.length,1);
  assert.equal(items[0].href,'/admin/review/prices#manual-price-governance');
});

test('unknown execution actions are not promoted into Owner Attention', () => {
  assert.equal(presentCommerceExecutionApproval({
    execution_request_id:'00000000-0000-4000-8000-000000000014',
    action_code:'UNRELATED_ACTION',
  }),null);
});
