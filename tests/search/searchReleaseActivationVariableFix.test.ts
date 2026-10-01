import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Search Release executor uses an unambiguous release-id local variable',()=>{
  const source=readFileSync('supabase/migrations/20261002002500_search_release_activation_variable_fix_v1.sql','utf8');
  assert.match(source,/v_release_id uuid/);
  assert.match(source,/v_release_id:=\(req\.request_payload_json->>'release_id'\)::uuid/);
  assert.match(source,/where r\.release_id=v_release_id/);
  assert.doesNotMatch(source,/where r\.release_id=release_id\b/);
  assert.match(source,/feya_fn_execution_request_human_approval_valid_v1/);
  assert.match(source,/active_release_count_conflict/);
  assert.match(source,/'payment_enabled',false/);
  assert.match(source,/'order_creation_enabled',false/);
});
