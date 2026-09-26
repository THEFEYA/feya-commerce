-- Phase G safety: governed activation path for immutable search releases.
-- Installing this capability does NOT activate indexing. Activation remains exact-scope Human Owner approval.
begin;

insert into public.feya_growth_registry_items_v1(
  registry_type,item_code,item_name,owner_role,item_state,implementation_state,
  public_summary,limitations_summary,config_json,evidence_json,version_no,active_flag
)
values(
  'action_capability',
  'ACTIVATE_SEARCH_RELEASE',
  'Activate immutable search release',
  'HUMAN_OWNER',
  'AVAILABLE_WITH_LIMITATIONS',
  'exact_release_gate_only',
  'Activates one exact immutable search release after K01-K20 is complete and Human Owner approves the exact release hash and git SHA.',
  'Does not bypass environment kill switches, canonical-host checks, payment scope, or per-path release membership.',
  '{
    "action_class":"EXECUTABLE_WITH_APPROVAL",
    "executor_type":"EXECUTION_GATEWAY",
    "approval_class":"HUMAN_REQUIRED",
    "contract_version":"search_release_activation_v1",
    "production_mutation":true,
    "canonical_seo_mutation":true,
    "security_mutation":false,
    "indexation_mutation":true,
    "payment":false,
    "order_creation":false
  }'::jsonb,
  '{"gate_policy":"FEYA_Search_Architecture_v1_K01_K20","activation_requires":["20 gate rows","no FAIL","exact release_hash","exact git_sha","target_origin"]}'::jsonb,
  1,true
)
on conflict (registry_type,item_code,version_no) do update set
  item_name=excluded.item_name,
  owner_role=excluded.owner_role,
  item_state=excluded.item_state,
  implementation_state=excluded.implementation_state,
  public_summary=excluded.public_summary,
  limitations_summary=excluded.limitations_summary,
  config_json=excluded.config_json,
  evidence_json=excluded.evidence_json,
  active_flag=excluded.active_flag,
  updated_at=now();

create or replace function public.feya_search_prepare_release_activation_v1(
  p_release_id uuid,
  p_expected_release_hash text,
  p_expected_git_sha text
) returns jsonb
language plpgsql
security definer
set search_path='' as $$
declare
  rel public.feya_search_releases_v1%rowtype;
  request_row record;
  gate_count integer;
  fail_count integer;
  current_active uuid;
begin
  if p_release_id is null then raise exception 'search_release_required'; end if;
  if p_expected_release_hash is null or p_expected_release_hash!~'^[0-9a-f]{64}$'
    then raise exception 'search_release_hash_invalid'; end if;
  if p_expected_git_sha is null or p_expected_git_sha!~'^[0-9a-f]{40}$'
    then raise exception 'search_release_git_sha_invalid'; end if;

  select * into rel
  from public.feya_search_releases_v1 r
  where r.release_id=p_release_id
  for update;
  if not found then raise exception 'search_release_not_found'; end if;

  if rel.release_status not in ('DRAFT','GATE_FAILED','APPROVAL_REQUIRED')
    then raise exception 'search_release_state_invalid:%',rel.release_status; end if;
  if rel.release_hash is null or rel.release_hash<>p_expected_release_hash
    then raise exception 'search_release_hash_conflict'; end if;
  if rel.git_sha is null or rel.git_sha<>p_expected_git_sha
    then raise exception 'search_release_git_sha_conflict'; end if;
  if rel.target_origin is null or rel.target_origin!~'^https://[^/]+$'
    then raise exception 'search_release_origin_invalid'; end if;

  select count(*),count(*) filter(where gate_status='FAIL')
    into gate_count,fail_count
  from public.feya_search_release_gate_results_v1 g
  where g.release_id=p_release_id;

  if gate_count<>20 then raise exception 'search_release_gate_count_invalid:%',gate_count; end if;
  if fail_count<>0 then raise exception 'search_release_gate_failed:%',fail_count; end if;

  if exists(
    select 1 from public.feya_search_release_gate_results_v1 g
    where g.release_id=p_release_id
      and g.gate_status not in ('PASS','EXCLUDED_APPROVED')
  ) then raise exception 'search_release_gate_state_invalid'; end if;

  select r.release_id into current_active
  from public.feya_search_releases_v1 r
  where r.release_status='ACTIVE' and r.release_id<>p_release_id
  order by r.updated_at desc
  limit 1;

  select * into request_row
  from public.feya_fn_create_execution_request_v1(
    'ACTIVATE_SEARCH_RELEASE',
    'SEARCH_INDEXATION',
    jsonb_build_object(
      'entity_type','SEARCH_RELEASE',
      'entity_key',rel.release_code,
      'release_id',rel.release_id
    ),
    jsonb_build_object(
      'release_id',rel.release_id,
      'release_version',rel.release_version,
      'release_hash',rel.release_hash,
      'git_sha',rel.git_sha,
      'target_origin',rel.target_origin
    ),
    jsonb_build_object(
      'contract_version','search_release_activation_v1',
      'release_id',rel.release_id,
      'release_code',rel.release_code,
      'release_version',rel.release_version,
      'release_hash',rel.release_hash,
      'git_sha',rel.git_sha,
      'target_origin',rel.target_origin,
      'previous_active_release_id',current_active
    ),
    jsonb_build_object(
      'mode','reactivate_previous_release_or_disable',
      'previous_active_release_id',current_active,
      'target_release_id',rel.release_id
    ),
    jsonb_build_object(
      'release_status','ACTIVE',
      'exact_release_hash',rel.release_hash,
      'exact_git_sha',rel.git_sha,
      'no_failed_gates',true,
      'active_release_count',1
    ),
    'agent',
    null,
    'search-release-activation:'||rel.release_id::text||':'||rel.release_hash||':'||rel.git_sha
  );

  update public.feya_search_releases_v1 r
  set release_status='APPROVAL_REQUIRED',updated_at=now()
  where r.release_id=rel.release_id
    and r.release_status in ('DRAFT','GATE_FAILED','APPROVAL_REQUIRED');

  return jsonb_build_object(
    'contract_version','search_release_activation_v1',
    'release_id',rel.release_id,
    'release_code',rel.release_code,
    'release_hash',rel.release_hash,
    'git_sha',rel.git_sha,
    'target_origin',rel.target_origin,
    'execution_request_id',request_row.execution_request_id,
    'request_status',request_row.request_status,
    'request_hash',request_row.request_hash,
    'created_new',request_row.created_new,
    'activated',false
  );
end $$;

create or replace function public.feya_search_execute_release_activation_v1(
  p_execution_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path='' as $$
declare
  req public.feya_growth_execution_requests_v1%rowtype;
  prior public.feya_growth_execution_receipts_v1%rowtype;
  rel public.feya_search_releases_v1%rowtype;
  release_id uuid;
  expected_hash text;
  expected_git_sha text;
  previous_active uuid;
  gate_count integer;
  fail_count integer;
  attempt integer;
  result jsonb;
begin
  if p_execution_request_id is null then raise exception 'search_release_activation_request_required'; end if;

  select * into req
  from public.feya_growth_execution_requests_v1 r
  where r.execution_request_id=p_execution_request_id
  for update;
  if not found then raise exception 'search_release_activation_request_not_found'; end if;

  if req.request_status='SUCCEEDED' then
    select * into prior
    from public.feya_growth_execution_receipts_v1 x
    where x.execution_request_id=p_execution_request_id and x.receipt_status='SUCCEEDED'
    order by attempt_no desc limit 1;
    if not found then raise exception 'search_release_activation_receipt_missing'; end if;
    return prior.result_json||'{"replayed":true}'::jsonb;
  end if;

  if req.action_code<>'ACTIVATE_SEARCH_RELEASE'
     or req.mutation_domain<>'SEARCH_INDEXATION'
     or not public.feya_fn_execution_request_human_approval_valid_v1(p_execution_request_id)
    then raise exception 'search_release_activation_not_approved'; end if;

  if req.request_payload_json->>'contract_version'<>'search_release_activation_v1'
    then raise exception 'search_release_activation_payload_invalid'; end if;

  release_id:=(req.request_payload_json->>'release_id')::uuid;
  expected_hash:=req.request_payload_json->>'release_hash';
  expected_git_sha:=req.request_payload_json->>'git_sha';
  previous_active:=nullif(req.request_payload_json->>'previous_active_release_id','')::uuid;

  select * into rel
  from public.feya_search_releases_v1 r
  where r.release_id=release_id
  for update;
  if not found then raise exception 'search_release_not_found'; end if;

  if rel.release_status<>'APPROVAL_REQUIRED'
    then raise exception 'search_release_activation_state_invalid:%',rel.release_status; end if;
  if rel.release_hash<>expected_hash or rel.git_sha<>expected_git_sha
    then raise exception 'search_release_activation_version_conflict'; end if;

  select count(*),count(*) filter(where gate_status='FAIL')
    into gate_count,fail_count
  from public.feya_search_release_gate_results_v1 g
  where g.release_id=rel.release_id;
  if gate_count<>20 or fail_count<>0
    then raise exception 'search_release_activation_gate_conflict'; end if;

  if exists(
    select 1 from public.feya_search_release_gate_results_v1 g
    where g.release_id=rel.release_id
      and g.gate_status not in ('PASS','EXCLUDED_APPROVED')
  ) then raise exception 'search_release_activation_gate_state_invalid'; end if;

  update public.feya_growth_execution_requests_v1
  set request_status='EXECUTING',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='APPROVED';
  if not found then raise exception 'search_release_activation_request_state_conflict'; end if;

  update public.feya_search_releases_v1
  set release_status='RETIRED',updated_at=now()
  where release_status='ACTIVE' and release_id<>rel.release_id;

  update public.feya_search_releases_v1
  set release_status='ACTIVE',updated_at=now()
  where release_id=rel.release_id and release_status='APPROVAL_REQUIRED';
  if not found then raise exception 'search_release_activation_release_state_conflict'; end if;

  if (select count(*) from public.feya_search_releases_v1 where release_status='ACTIVE')<>1
    then raise exception 'search_release_activation_active_count_conflict'; end if;

  result:=jsonb_build_object(
    'contract_version','search_release_activation_v1',
    'execution_request_id',p_execution_request_id,
    'release_id',rel.release_id,
    'release_code',rel.release_code,
    'release_version',rel.release_version,
    'release_hash',rel.release_hash,
    'git_sha',rel.git_sha,
    'target_origin',rel.target_origin,
    'previous_active_release_id',previous_active,
    'release_status','ACTIVE',
    'payment_enabled',false,
    'order_creation_enabled',false,
    'replayed',false
  );

  select coalesce(max(attempt_no),0)+1 into attempt
  from public.feya_growth_execution_receipts_v1
  where execution_request_id=p_execution_request_id;

  insert into public.feya_growth_execution_receipts_v1(
    execution_request_id,attempt_no,receipt_status,executor_id,request_hash,
    result_json,postflight_result_json,rollback_result_json,completed_at
  ) values(
    p_execution_request_id,attempt,'SUCCEEDED','search-release-activation-v1',req.request_hash,
    result,
    jsonb_build_object(
      'active_release_id',rel.release_id,
      'active_release_count',1,
      'release_hash',rel.release_hash,
      'git_sha',rel.git_sha
    ),
    jsonb_build_object(
      'mode','reactivate_previous_release_or_disable',
      'previous_active_release_id',previous_active,
      'target_release_id',rel.release_id
    ),
    now()
  );

  update public.feya_growth_execution_requests_v1
  set request_status='SUCCEEDED',updated_at=now()
  where execution_request_id=p_execution_request_id and request_status='EXECUTING';

  return result;
end $$;

do $$
declare p text;
begin
  foreach p in array array[
    'feya_search_prepare_release_activation_v1(uuid,text,text)',
    'feya_search_execute_release_activation_v1(uuid)'
  ] loop
    execute 'revoke all on function public.'||p||' from public,anon,authenticated,service_role';
  end loop;
  grant execute on function public.feya_search_prepare_release_activation_v1(uuid,text,text) to service_role;
  grant execute on function public.feya_search_execute_release_activation_v1(uuid) to service_role;
end $$;

notify pgrst,'reload schema';
commit;
