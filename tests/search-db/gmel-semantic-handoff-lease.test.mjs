import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';

const native=process.env.FEYA_TEST_DATABASE_URL;
if(native){const u=new URL(native);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');}
let db;
const caseId='10000000-0000-4000-8000-000000000001';
const handoffId='20000000-0000-4000-8000-000000000001';
const policyId='30000000-0000-4000-8000-000000000001';
const q=async(sql,args=[]) => (await db.query(sql,args)).rows;
const size=async(table) => Number((await q('select count(*)::int n from public.'+table))[0].n);
const claim=async(worker='gmel-worker-1') => q(
  'select * from public.feya_fn_claim_gmel_semantic_handoff_v1($1::uuid,$2::uuid,$3::int,$4::uuid,$5::text,$6::int)',
  [caseId,handoffId,1,policyId,worker,180]
);
const migration=()=>readFile(new URL('../../supabase/migrations/20261016190000_growth_gmel_semantic_handoff_lease_v1.sql',import.meta.url),'utf8');

before(async()=>{
  if(native){
    const client=new pg.Client({connectionString:native,connectionTimeoutMillis:5000});
    await client.connect();
    db={exec:s=>client.query(s),query:(s,args)=>client.query(s,args),close:()=>client.end()};
    assert.equal((await q("select count(*)::int n from pg_tables where schemaname='public'"))[0].n,0);
  }else db=await PGlite.create();

  const ddl = [
    'create role anon',
    'create role authenticated',
    'create role service_role bypassrls',
    'grant usage on schema public to anon,authenticated,service_role',
    'create table public.feya_growth_cases_v1(case_id uuid primary key,case_type text,case_status text,current_accountable_domain text,ownership_epoch integer)',
    'create table public.feya_growth_handoffs_v1(handoff_id uuid primary key,case_id uuid,ownership_epoch integer,source_domain text,target_domain text,handoff_status text,handoff_mode text,question text,expected_output_schema_code text,expected_output_schema_json jsonb,evidence_json jsonb,expires_at timestamptz,created_at timestamptz default now())',
    'create table public.feya_growth_role_activation_v1(role_code text primary key,runtime_status text,allowed_action_codes_json jsonb)',
    'create table public.feya_growth_ai_budget_policies_v1(policy_id uuid primary key,enabled boolean,approved_by_user_id uuid,approved_at timestamptz,expires_at timestamptz,purpose text)',
    'create table public.feya_growth_ai_spend_reservations_v1(reservation_id uuid primary key default gen_random_uuid(),handoff_id uuid,status text)',
    'create table public.feya_test_source_health(source_code text primary key,health_state text,freshness_state text,checked_at timestamptz)',
    'create view public.feya_commerce_v_data_source_health_effective_safe_v2 as select source_code,health_state,freshness_state,checked_at from public.feya_test_source_health',
    "create table public.feya_growth_workflow_runs_v1(workflow_run_id uuid primary key default gen_random_uuid(),case_id uuid not null,ownership_epoch integer not null,workflow_type text,workflow_status text default 'READY',current_step_code text,state_json jsonb not null default '{}'::jsonb,max_retries integer default 1,attempt_count integer default 0,retry_count integer default 0,lease_owner text,lease_expires_at timestamptz,wake_at timestamptz,wait_reason text,started_at timestamptz,last_error text,updated_at timestamptz,idempotency_key text unique)",
    'create table public.feya_growth_workflow_events_v1(workflow_event_id uuid primary key default gen_random_uuid(),workflow_run_id uuid,case_id uuid,event_type text,from_status text,to_status text,step_code text,worker_id text,reason text,payload_json jsonb,created_at timestamptz default now())',
    "create function public.feya_fn_create_workflow_run_v1(p_case_id uuid,p_expected_ownership_epoch integer,p_workflow_type text,p_current_step_code text,p_state_json jsonb default '{}',p_max_retries integer default 3,p_created_by_type text default 'system',p_created_by_user_id uuid default null,p_idempotency_key text default null) returns table(workflow_run_id uuid,created_new boolean,workflow_status text,current_step_code text) language plpgsql as $f$ declare v public.feya_growth_workflow_runs_v1%rowtype;begin select * into v from public.feya_growth_workflow_runs_v1 w where w.idempotency_key=p_idempotency_key;if found then return query select v.workflow_run_id,false,v.workflow_status,v.current_step_code;return;end if;insert into public.feya_growth_workflow_runs_v1(case_id,ownership_epoch,workflow_type,current_step_code,state_json,max_retries,idempotency_key,updated_at) values(p_case_id,p_expected_ownership_epoch,p_workflow_type,p_current_step_code,p_state_json,p_max_retries,p_idempotency_key,now()) returning * into v;insert into public.feya_growth_workflow_events_v1(workflow_run_id,case_id,event_type,to_status,step_code) values(v.workflow_run_id,p_case_id,'WORKFLOW_CREATED','READY',p_current_step_code);return query select v.workflow_run_id,true,v.workflow_status,v.current_step_code;end;$f$",
    'grant select,insert,update on all tables in schema public to service_role'
  ];
  await db.exec(ddl.join(';\n')+';');
  await db.exec(await migration());
});
after(async()=>db?.close());

beforeEach(async()=>{
  const reset=[
    'truncate public.feya_growth_workflow_events_v1,public.feya_growth_workflow_runs_v1,public.feya_growth_ai_spend_reservations_v1,public.feya_growth_role_activation_v1,public.feya_growth_ai_budget_policies_v1,public.feya_growth_handoffs_v1,public.feya_growth_cases_v1,public.feya_test_source_health',
    "insert into public.feya_growth_cases_v1 values('10000000-0000-4000-8000-000000000001','TSEO_INDEXABILITY_SHADOW','OPEN','TSEO',1)",
    "insert into public.feya_growth_handoffs_v1(handoff_id,case_id,ownership_epoch,source_domain,target_domain,handoff_status,handoff_mode,question,expected_output_schema_code,expected_output_schema_json,evidence_json) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,'TSEO','GMEL','OPEN','SERVICE','Determine whether real organic performance can support a meaningful SEO conclusion','GMEL_SEMANTIC_EVIDENCE_V1','{\"type\":\"object\",\"required\":[\"verdict\"]}'::jsonb,'{\"analysis_purpose\":\"SEARCH_PERFORMANCE\"}'::jsonb)",
    "insert into public.feya_growth_role_activation_v1 values('GMEL','SHADOW','[\"RECORD_LEARNING_EVIDENCE\"]'::jsonb)",
    "insert into public.feya_growth_ai_budget_policies_v1 values('30000000-0000-4000-8000-000000000001',true,'90000000-0000-4000-8000-000000000009',now()-interval '1 hour',now()+interval '1 day','GMEL_SEMANTIC_EVIDENCE_V1')",
    "insert into public.feya_test_source_health values('ORGANIC_SEARCH_PERFORMANCE','HEALTHY','FRESH',now())"
  ];
  await db.exec(reset.join(';\n')+';');
});

test('claim function is service-role only',async()=>{
  const acl=(await q("select has_function_privilege('anon',oid,'EXECUTE') anon,has_function_privilege('authenticated',oid,'EXECUTE') auth,has_function_privilege('service_role',oid,'EXECUTE') service from pg_proc where proname='feya_fn_claim_gmel_semantic_handoff_v1'"))[0];
  assert.deepEqual(acl,{anon:false,auth:false,service:true});
});

test('one GMEL reviewer claims exact handoff; concurrent claimant cannot steal it',async()=>{
  const first=(await claim())[0];
  assert.equal(first.created_new,true);
  assert.equal(first.workflow_status,'RUNNING');
  assert.equal(first.attempt_count,1);
  assert.equal(first.retry_count,0);
  assert.equal(await size('feya_growth_workflow_runs_v1'),1);
  assert.equal(await size('feya_growth_workflow_events_v1'),2);
  assert.deepEqual(await claim('second-worker'),[]);
  assert.equal(await size('feya_growth_workflow_runs_v1'),1);
  assert.equal(await size('feya_growth_ai_spend_reservations_v1'),0);
});

test('no budget, stale or future source, or unknown purpose fails before creation',async()=>{
  await db.exec("update public.feya_growth_ai_budget_policies_v1 set enabled=false");
  await assert.rejects(claim(),/GMEL_LEASE_OWNER_BUDGET_REQUIRED/);
  await db.exec("update public.feya_growth_ai_budget_policies_v1 set enabled=true");
  await db.exec("update public.feya_test_source_health set freshness_state='UNKNOWN'");
  await assert.rejects(claim(),/GMEL_LEASE_SOURCE_NOT_VERIFIED/);
  await db.exec("update public.feya_test_source_health set freshness_state='FRESH',checked_at=now()+interval '1 hour'");
  await assert.rejects(claim(),/GMEL_LEASE_SOURCE_NOT_VERIFIED/);
  await db.exec("update public.feya_test_source_health set checked_at=now()");
  await db.exec("update public.feya_growth_handoffs_v1 set evidence_json='{\"analysis_purpose\":\"OTHER\"}'::jsonb");
  await assert.rejects(claim(),/GMEL_LEASE_PURPOSE_UNSUPPORTED/);
  assert.equal(await size('feya_growth_workflow_runs_v1'),0);
});

test('commercial review requires all four fresh sources',async()=>{
  await db.exec("update public.feya_growth_handoffs_v1 set evidence_json='{\"analysis_purpose\":\"COMMERCIAL_OUTCOME\"}'::jsonb");
  await assert.rejects(claim(),/GMEL_LEASE_SOURCE_NOT_VERIFIED/);
  await db.exec("insert into public.feya_test_source_health values('BEHAVIORAL_ANALYTICS','HEALTHY','FRESH',now()),('COMMERCE_ORDER_TRUTH','HEALTHY','FRESH',now()),('COMMERCE_REVENUE_TRUTH','HEALTHY','FRESH',now())");
  assert.equal((await claim())[0].workflow_status,'RUNNING');
});

test('wrong handoff, owner version or role refuses claim',async()=>{
  await db.exec("update public.feya_growth_handoffs_v1 set target_domain='CQA'");
  await assert.rejects(claim(),/GMEL_LEASE_HANDOFF_NOT_ELIGIBLE/);
  await db.exec("update public.feya_growth_handoffs_v1 set target_domain='GMEL',handoff_status='COMPLETED'");
  await assert.rejects(claim(),/GMEL_LEASE_HANDOFF_NOT_ELIGIBLE/);
  await db.exec("update public.feya_growth_handoffs_v1 set handoff_status='OPEN'");
  await db.exec("update public.feya_growth_cases_v1 set ownership_epoch=2");
  await assert.rejects(claim(),/GMEL_LEASE_CASE_NOT_ELIGIBLE/);
  await db.exec("update public.feya_growth_cases_v1 set ownership_epoch=1");
  await db.exec("update public.feya_growth_role_activation_v1 set runtime_status='INACTIVE'");
  await assert.rejects(claim(),/GMEL_LEASE_ROLE_NOT_ENABLED/);
  assert.equal(await size('feya_growth_workflow_runs_v1'),0);
});

test('expired lease safely retries once before provider send',async()=>{
  const first=(await claim())[0];
  await q("update public.feya_growth_workflow_runs_v1 set lease_expires_at=now()-interval '1 second' where workflow_run_id=$1",[first.workflow_run_id]);
  const retry=(await claim('recovery-worker'))[0];
  assert.equal(retry.retry_count,1);
  assert.equal(retry.attempt_count,2);
  await q("update public.feya_growth_workflow_runs_v1 set lease_expires_at=now()-interval '1 second' where workflow_run_id=$1",[first.workflow_run_id]);
  assert.deepEqual(await claim('third-worker'),[]);
  assert.equal((await q("select workflow_status from public.feya_growth_workflow_runs_v1"))[0].workflow_status,'DEAD_LETTER');
  assert.equal(await size('feya_growth_workflow_events_v1'),4);
});

test('existing spend reservation blocks a crashed worker instead of double spending',async()=>{
  const first=(await claim())[0];
  await q("update public.feya_growth_workflow_runs_v1 set lease_expires_at=now()-interval '1 second' where workflow_run_id=$1",[first.workflow_run_id]);
  await q("insert into public.feya_growth_ai_spend_reservations_v1(handoff_id,status) values($1,'SUBMITTED')",[handoffId]);
  assert.deepEqual(await claim('second-worker'),[]);
  const row=(await q("select workflow_status,wait_reason from public.feya_growth_workflow_runs_v1"))[0];
  assert.equal(row.workflow_status,'BLOCKED');
  assert.equal(row.wait_reason,'GMEL_SPEND_RESERVATION_NEEDS_REVIEW');
  assert.equal(await size('feya_growth_workflow_events_v1'),3);
});

test('released reservation permits safe re-claim but no model calls',async()=>{
  const first=(await claim())[0];
  await q("update public.feya_growth_workflow_runs_v1 set lease_expires_at=now()-interval '1 second' where workflow_run_id=$1",[first.workflow_run_id]);
  await q("insert into public.feya_growth_ai_spend_reservations_v1(handoff_id,status) values($1,'RELEASED')",[handoffId]);
  assert.equal((await claim('second-worker'))[0].retry_count,1);
});
