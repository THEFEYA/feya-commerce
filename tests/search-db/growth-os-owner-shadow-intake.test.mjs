import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

let db;
const native = process.env.FEYA_TEST_DATABASE_URL;
if (native) {
  const u = new URL(native);
  assert.ok(['127.0.0.1', 'localhost'].includes(u.hostname));
  assert.equal(u.pathname, '/feya_test');
}
const owner='10000000-0000-4000-8000-000000000001';
const secondOwner='10000000-0000-4000-8000-000000000002';
const key='20000000-0000-4000-8000-000000000001';
const question='Какие страницы требуют проверки индексируемости без изменений сайта?';
const migration=()=>readFile(new URL('../../supabase/migrations/20261016001500_growth_os_owner_tseo_shadow_intake_v1.sql',import.meta.url),'utf8');

async function start(questionInput=question, requestKey=key, actor=owner){
  return (await db.query(
    'select * from public.feya_fn_start_tseo_shadow_readiness_v1($1::uuid,$2::text,$3::uuid)',
    [actor,questionInput,requestKey]
  )).rows;
}
async function count(table){
  return (await db.query('select count(*)::integer n from public.'+table)).rows[0].n;
}

before(async()=>{
  if(native){
    const client=new pg.Client({connectionString:native,connectionTimeoutMillis:5000});
    await client.connect();
    db={exec:s=>client.query(s),query:(s,p)=>client.query(s,p),close:()=>client.end()};
    assert.equal((await db.query("select count(*)::integer n from pg_tables where schemaname='public'")).rows[0].n,0);
  }else db=await PGlite.create();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    grant usage on schema public to anon,authenticated,service_role;
    create table public.feya_growth_role_activation_v1(
      role_code text primary key,
      runtime_status text not null,
      allowed_action_codes_json jsonb not null
    );
    create table public.feya_growth_cases_v1(
      case_id uuid primary key default gen_random_uuid(),
      case_code text not null,
      case_type text not null,
      title text not null,
      business_question text,
      current_accountable_domain text not null,
      ownership_epoch integer not null default 1,
      case_status text not null default 'OPEN',
      created_by_user_id uuid,
      idempotency_key text unique
    );
    create table public.feya_growth_workflow_runs_v1(
      workflow_run_id uuid primary key default gen_random_uuid(),
      case_id uuid not null references public.feya_growth_cases_v1(case_id),
      workflow_type text not null,
      workflow_status text not null default 'READY',
      current_step_code text not null,
      ownership_epoch integer not null,
      state_json jsonb not null,
      idempotency_key text unique
    );
    create function public.feya_fn_create_growth_case_v1(
      p_case_type text,p_title text,p_business_question text,p_accountable_domain text,
      p_priority text default 'P2',p_maturity_state text default 'PRE_LAUNCH',
      p_case_fingerprint text default null,p_entity_scope_json jsonb default '{}',
      p_signal_refs_json jsonb default '[]',p_created_by_type text default 'system',
      p_created_by_user_id uuid default null,p_idempotency_key text default null
    ) returns table(case_id uuid,case_code text,created_new boolean,ownership_epoch integer)
    language plpgsql as $case$
    declare v public.feya_growth_cases_v1%rowtype; fresh boolean := false;
    begin
      select * into v from public.feya_growth_cases_v1 c where c.idempotency_key=p_idempotency_key;
      if not found then
        insert into public.feya_growth_cases_v1(
          case_code,case_type,title,business_question,current_accountable_domain,created_by_user_id,idempotency_key
        ) values (
          'GC-FIXTURE',p_case_type,p_title,p_business_question,p_accountable_domain,p_created_by_user_id,p_idempotency_key
        ) returning * into v;
        fresh:=true;
      end if;
      return query select v.case_id,v.case_code,fresh,v.ownership_epoch;
    end;
    $case$;
    create function public.feya_fn_create_workflow_run_v1(
      p_case_id uuid,p_expected_ownership_epoch integer,p_workflow_type text,
      p_current_step_code text,p_state_json jsonb default '{}',
      p_max_retries integer default 3,p_created_by_type text default 'system',
      p_created_by_user_id uuid default null,p_idempotency_key text default null
    ) returns table(workflow_run_id uuid,created_new boolean,workflow_status text,current_step_code text)
    language plpgsql as $workflow$
    declare v public.feya_growth_workflow_runs_v1%rowtype; fresh boolean := false;
    begin
      select * into v from public.feya_growth_workflow_runs_v1 w
        where w.idempotency_key=p_idempotency_key;
      if not found then
        insert into public.feya_growth_workflow_runs_v1(
          case_id,workflow_type,current_step_code,ownership_epoch,state_json,idempotency_key
        ) values (
          p_case_id,p_workflow_type,p_current_step_code,p_expected_ownership_epoch,p_state_json,p_idempotency_key
        ) returning * into v;
        fresh:=true;
      end if;
      return query select v.workflow_run_id,fresh,v.workflow_status,v.current_step_code;
    end;
    $workflow$;
    grant select,insert,update on all tables in schema public to service_role;
  `);
  await db.exec(await migration());
});
after(async()=>db?.close());

beforeEach(async()=>{
  await db.exec(`
    truncate public.feya_growth_workflow_runs_v1,public.feya_growth_cases_v1,
      public.feya_growth_role_activation_v1 cascade;
    insert into public.feya_growth_role_activation_v1 values
      ('TSEO','SHADOW','["RECORD_INDEXABILITY_PROPOSAL"]'::jsonb);
  `);
});

test('owner TSEO intake atomically records one real case and one SHADOW workflow',async()=>{
  const rows=await start();
  assert.equal(rows.length,1);
  assert.equal(rows[0].created_new,true);
  assert.equal(rows[0].workflow_status,'READY');
  assert.equal(rows[0].ownership_epoch,1);
  assert.equal(await count('feya_growth_cases_v1'),1);
  assert.equal(await count('feya_growth_workflow_runs_v1'),1);
  const result=(await db.query('select state_json,workflow_type,current_step_code from public.feya_growth_workflow_runs_v1')).rows[0];
  assert.equal(result.workflow_type,'RECORD_INDEXABILITY_PROPOSAL');
  assert.equal(result.current_step_code,'READ_PORTFOLIO_INDEXABILITY');
  assert.equal(result.state_json.mode,'SHADOW');
  assert.equal(result.state_json.dry_run,true);
  assert.equal(result.state_json.model_calls_allowed,false);
  assert.equal(result.state_json.production_mutations_allowed,false);
});

test('retry returns exact case and workflow without creating duplicates',async()=>{
  const first=(await start())[0];
  const next=(await start())[0];
  assert.equal(next.created_new,false);
  assert.equal(next.case_id,first.case_id);
  assert.equal(next.workflow_run_id,first.workflow_run_id);
  assert.equal(await count('feya_growth_cases_v1'),1);
  assert.equal(await count('feya_growth_workflow_runs_v1'),1);
});

test('same request key cannot be reused by another owner or different question',async()=>{
  await start();
  await assert.rejects(start(question,key,secondOwner),/request_reused_with_different_payload/);
  await assert.rejects(start('Другой вопрос про показатели поисковой выдачи?',key),/request_reused_with_different_payload/);
  assert.equal(await count('feya_growth_cases_v1'),1);
});

test('inactive role and disallowed action prevent all writes',async()=>{
  await db.exec("update public.feya_growth_role_activation_v1 set runtime_status='INACTIVE'");
  await assert.rejects(start(),/role_not_available/);
  await db.exec("update public.feya_growth_role_activation_v1 set runtime_status='SHADOW',allowed_action_codes_json='[]'::jsonb");
  await assert.rejects(start(),/role_not_available/);
  assert.equal(await count('feya_growth_cases_v1'),0);
});

test('invalid actor and question cannot register workflow',async()=>{
  await assert.rejects(start('hi'),/invalid_question/);
  await assert.rejects(start(question,key,null),/owner_or_request_missing/);
  assert.equal(await count('feya_growth_cases_v1'),0);
});

test('failure creating the child workflow rolls back the parent case',async()=>{
  await db.exec("alter table public.feya_growth_workflow_runs_v1 add constraint fixture_reject_all_workflows check (false)");
  try{
    await assert.rejects(start(),/fixture_reject_all_workflows/);
    assert.equal(await count('feya_growth_cases_v1'),0);
  }finally{
    await db.exec("alter table public.feya_growth_workflow_runs_v1 drop constraint fixture_reject_all_workflows");
  }
});

test('owner intake remains private and service-only',async()=>{
  const acl=(await db.query(`
    select has_function_privilege('anon',oid,'execute') anon,
      has_function_privilege('authenticated',oid,'execute') auth,
      has_function_privilege('service_role',oid,'execute') svc
    from pg_proc where proname='feya_fn_start_tseo_shadow_readiness_v1'
  `)).rows[0];
  assert.deepEqual(acl,{anon:false,auth:false,svc:true});
});
