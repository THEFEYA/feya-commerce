-- Phase 12 hotfix: remove PL/pgSQL ambiguity in Search Release executor.
-- The previous implementation declared a local variable named release_id and
-- compared r.release_id=release_id, which PostgreSQL rejects as ambiguous.
-- This changes no approval, gate, payment, order or rollback semantics.

begin;

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
  v_release_id uuid;
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

  v_release_id:=(req.request_payload_json->>'release_id')::uuid;
  expected_hash:=req.request_payload_json->>'release_hash';
  expected_git_sha:=req.request_payload_json->>'git_sha';
  previous_active:=nullif(req.request_payload_json->>'previous_active_release_id','')::uuid;

  select * into rel
  from public.feya_search_releases_v1 r
  where r.release_id=v_release_id
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

revoke all on function public.feya_search_execute_release_activation_v1(uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.feya_search_execute_release_activation_v1(uuid)
  to service_role;

notify pgrst,'reload schema';

commit;
