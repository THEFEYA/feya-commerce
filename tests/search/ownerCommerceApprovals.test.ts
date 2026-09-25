import assert from 'node:assert/strict';
import test from 'node:test';
import {presentCommerceExecutionApproval, presentCommerceExecutionApprovals} from '../../lib/owner-ui/commerceApprovals';

test('projects exact pending baseline approval into owner UI without changing authority', () => {
  const item=presentCommerceExecutionApproval({
    execution_request_id:'9ebd0414-3547-4d21-8d71-82d1f2173e81',
    action_code:'ADOPT_SOURCE_PRICE_BASELINE',
    request_status:'APPROVAL_REQUIRED',
    request_payload_json:{
      price_row_count:850,
      canonical_product_ids:Array.from({length:205},(_,i)=>`p-${i}`),
    },
  });
  assert.ok(item);
  assert.equal(item.href,'/admin/review/prices#baseline-adoption');
  assert.match(item.whyNow,/205 товаров/);
  assert.match(item.whyNow,/850 цен/);
  assert.match(item.requiredAction,/подтвердить/i);
});

test('projects structural repair and post-repair governance to exact protected screens', () => {
  const items=presentCommerceExecutionApprovals([
    {
      execution_request_id:'3181a279-3f98-4faf-874f-788d20d8731a',
      action_code:'REPAIR_MANUAL_CONFIGURATION_BINDINGS',
      request_payload_json:{
        expected_price_rows:6,
        expected_target_configurations:6,
        canonical_product_ids:['a','b'],
      },
    },
    {
      execution_request_id:'00000000-0000-4000-8000-000000000001',
      action_code:'ADOPT_MANUAL_PRICE_LANE_GOVERNANCE',
      request_payload_json:{
        expected_price_rows:6,
        expected_configuration_rows:6,
      },
    },
  ]);
  assert.equal(items.length,2);
  assert.equal(items[0].href,'/admin/review/prices#manual-configuration-repair');
  assert.equal(items[1].href,'/admin/review/prices#manual-price-governance');
});

test('unknown execution actions are not promoted into Owner Attention', () => {
  assert.equal(presentCommerceExecutionApproval({
    execution_request_id:'00000000-0000-4000-8000-000000000002',
    action_code:'UNRELATED_ACTION',
  }),null);
});
