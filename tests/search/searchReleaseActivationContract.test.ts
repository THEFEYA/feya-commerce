import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

test('search release activation is Human Owner gated and exact-version bound',async()=>{
  const sql=await readFile(new URL('../../supabase/migrations/20260926184500_search_release_activation_gateway_v1.sql',import.meta.url),'utf8');

  assert.match(sql,/'ACTIVATE_SEARCH_RELEASE'/);
  assert.match(sql,/"approval_class":"HUMAN_REQUIRED"/);
  assert.match(sql,/"indexation_mutation":true/);
  assert.match(sql,/feya_fn_execution_request_human_approval_valid_v1/);
  assert.match(sql,/rel\.release_hash<>expected_hash/);
  assert.match(sql,/rel\.git_sha<>expected_git_sha/);
  assert.match(sql,/gate_count<>20/);
  assert.match(sql,/fail_count<>0/);
  assert.match(sql,/gate_status not in \('PASS','EXCLUDED_APPROVED'\)/);
});

test('activation changes only release authority and keeps commerce disabled',async()=>{
  const sql=await readFile(new URL('../../supabase/migrations/20260926184500_search_release_activation_gateway_v1.sql',import.meta.url),'utf8');

  assert.match(sql,/set release_status='ACTIVE'/);
  assert.match(sql,/set release_status='RETIRED'/);
  assert.match(sql,/'payment_enabled',false/);
  assert.match(sql,/'order_creation_enabled',false/);
  assert.match(sql,/feya_growth_execution_receipts_v1/);
  assert.doesNotMatch(sql,/FEYA_SEARCH_INDEXING_ENABLED\s*=|NEXT_PUBLIC_SITE_URL\s*=/);
});

test('preparation cannot activate a gate-failed release by itself',async()=>{
  const sql=await readFile(new URL('../../supabase/migrations/20260926184500_search_release_activation_gateway_v1.sql',import.meta.url),'utf8');
  const prepare=sql.slice(
    sql.indexOf('create or replace function public.feya_search_prepare_release_activation_v1'),
    sql.indexOf('create or replace function public.feya_search_execute_release_activation_v1'),
  );
  assert.match(prepare,/if fail_count<>0 then raise exception/);
  assert.match(prepare,/set release_status='APPROVAL_REQUIRED'/);
  assert.doesNotMatch(prepare,/set release_status='ACTIVE'/);
});
