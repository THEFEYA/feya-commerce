import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

// Isolated PostgreSQL fixture. No real Supabase commerce rows, customers or credentials.
const native = process.env.FEYA_TEST_DATABASE_URL;
if (native) {
  const parsed = new URL(native);
  assert.ok(['127.0.0.1', 'localhost'].includes(parsed.hostname));
  assert.equal(parsed.pathname, '/feya_test');
}
let db;
const ids = {
  osCase: '10000000-0000-4000-8000-000000000001',
  cqaCase: '10000000-0000-4000-8000-000000000002',
  cpimCase: '10000000-0000-4000-8000-000000000003',
  osRun: '20000000-0000-4000-8000-000000000001',
  cqaRun: '20000000-0000-4000-8000-000000000002',
  cpimRun: '20000000-0000-4000-8000-000000000003',
};
const migration = () => readFile(new URL('../../supabase/migrations/20261015233000_growth_os_bound_workflow_claim_v1.sql', import.meta.url), 'utf8');

async function count(table, where = '') {
  return (await db.query(`select count(*)::int as n from public.${table} ${where}`)).rows[0].n;
}
async function claim({
  run = ids.osRun, caseId = ids.osCase, epoch = 1, role = 'OSPM',
  action = 'RUN_QUERY_CLUSTER_PROPOSALS', step = 'STEP_ONE', worker = 'unit-shadow', lease = 60,
} = {}) {
  const { rows } = await db.query(
    `select * from public.feya_fn_claim_bound_workflow_v1(
      $1::uuid,$2::uuid,$3::integer,$4::text,$5::text,$6::text,$7::text,$8::integer)`,
    [run, caseId, epoch, role, action, step, worker, lease]
  );
  return rows;
}

before(async () => {
  if (native) {
    const client = new pg.Client({ connectionString: native, connectionTimeoutMillis: 5000 });
    await client.connect();
    db = { exec: (sql) => client.query(sql), query: (sql,params) => client.query(sql,params), close: () => client.end() };
    assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n, 0);
  } else {
    db = await PGlite.create();
  }
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    grant usage on schema public to anon,authenticated,service_role;
    create table public.feya_growth_role_activation_v1(
      role_code text primary key,
      runtime_status text not null,
      allowed_action_codes_json jsonb not null default '[]'::jsonb
    );
    create table public.feya_growth_cases_v1(
      case_id uuid primary key,
      case_type text not null,
      current_accountable_domain text not null,
      ownership_epoch integer not null,
      case_status text not null
    );
    create table public.feya_growth_workflow_runs_v1(
      workflow_run_id uuid primary key,
      case_id uuid not null references public.feya_growth_cases_v1(case_id),
      ownership_epoch integer not null,
      workflow_type text not null,
      workflow_status text not null default 'READY',
      current_step_code text not null,
      state_json jsonb not null default '{}'::jsonb,
      attempt_count integer not null default 0,
      retry_count integer not null default 0,
      max_retries integer not null default 1,
      lease_owner text,
      lease_expires_at timestamptz,
      started_at timestamptz,
      completed_at timestamptz,
      wake_at timestamptz,
      wait_reason text,
      last_error text,
      updated_at timestamptz
    );
    create table public.feya_growth_workflow_events_v1(
      workflow_event_id uuid primary key default gen_random_uuid(),
      workflow_run_id uuid not null references public.feya_growth_workflow_runs_v1(workflow_run_id),
      case_id uuid not null,
      event_type text not null,
      from_status text,
      to_status text,
      step_code text,
      worker_id text,
      reason text,
      payload_json jsonb,
      created_at timestamptz not null default now()
    );
    grant select,insert,update on all tables in schema public to service_role;
  `);
  // The pre-existing canonical completion RPC is represented by an isolated fixture.
  // Bound completion must call it, not replace its production contract.
  await db.exec(`
    create or replace function public.feya_fn_complete_workflow_v1(
      p_workflow_run_id uuid,p_worker_id text,p_result_state_patch jsonb default '{}'::jsonb
    )
    returns table(workflow_run_id uuid,workflow_status text,completed_at timestamptz)
    language plpgsql security definer set search_path='' as $canonical$
    declare v_run public.feya_growth_workflow_runs_v1%rowtype;
    begin
      select * into v_run from public.feya_growth_workflow_runs_v1 w
       where w.workflow_run_id=p_workflow_run_id for update;
      if not found or v_run.workflow_status<>'RUNNING' or
        v_run.lease_owner is distinct from p_worker_id then
        raise exception 'canonical_complete_bad_lease';
      end if;
      update public.feya_growth_workflow_runs_v1 w
         set workflow_status='COMPLETED',
             completed_at=clock_timestamp(),updated_at=clock_timestamp(),
             lease_owner=null,lease_expires_at=null,
             state_json=w.state_json||coalesce(p_result_state_patch,'{}'::jsonb)
       where w.workflow_run_id=p_workflow_run_id returning * into v_run;
      insert into public.feya_growth_workflow_events_v1(
        workflow_run_id,case_id,event_type,from_status,to_status,step_code,worker_id,reason,payload_json
      ) values (
        v_run.workflow_run_id,v_run.case_id,'WORKFLOW_COMPLETED',
        'RUNNING','COMPLETED',v_run.current_step_code,p_worker_id,'canonical completion fixture',
        coalesce(p_result_state_patch,'{}'::jsonb)
      );
      return query select v_run.workflow_run_id,v_run.workflow_status,v_run.completed_at;
    end;
    $canonical$;
  `);
  await db.exec(await migration());
});
after(async () => { await db?.close(); });

beforeEach(async () => {
  await db.exec(`
    truncate public.feya_growth_workflow_events_v1,public.feya_growth_workflow_runs_v1,
      public.feya_growth_cases_v1,public.feya_growth_role_activation_v1 cascade;
    insert into public.feya_growth_role_activation_v1(role_code,runtime_status,allowed_action_codes_json)
    values
      ('OSPM','SHADOW','["RUN_QUERY_CLUSTER_PROPOSALS","RUN_PAGE_OWNERSHIP_PROPOSALS"]'),
      ('CQA','SHADOW','["RUN_INDEPENDENT_CQA"]'),
      ('CPIM','INACTIVE','[]');
    insert into public.feya_growth_cases_v1(case_id,case_type,current_accountable_domain,ownership_epoch,case_status)
    values
      ('${ids.osCase}','IMPLEMENTATION_READINESS','OSPM',1,'OPEN'),
      ('${ids.cqaCase}','CONTENT_REVIEW','CQA',1,'OPEN'),
      ('${ids.cpimCase}','COMMERCIAL','CPIM',1,'OPEN');
    insert into public.feya_growth_workflow_runs_v1(
      workflow_run_id,case_id,ownership_epoch,workflow_type,current_step_code,state_json
    ) values
      ('${ids.osRun}','${ids.osCase}',1,'RUN_QUERY_CLUSTER_PROPOSALS','STEP_ONE','{"mode":"SHADOW","dry_run":true}'),
      ('${ids.cqaRun}','${ids.cqaCase}',1,'RUN_INDEPENDENT_CQA','CONTENT_CHECK','{"mode":"SHADOW","dry_run":true}'),
      ('${ids.cpimRun}','${ids.cpimCase}',1,'RUN_REPORT','REPORT','{"mode":"SHADOW","dry_run":true}');
  `);
});

test('migration is additive: existing global claimer is not replaced, service-only function', async () => {
  const acl = (await db.query(`
    select has_function_privilege('anon',oid,'execute') anon,
      has_function_privilege('authenticated',oid,'execute') auth,
      has_function_privilege('service_role',oid,'execute') svc
    from pg_proc where proname='feya_fn_claim_bound_workflow_v1'`)).rows[0];
  assert.deepEqual(acl,{ anon: false,auth: false,svc: true });
  assert.equal(await count('feya_growth_workflow_events_v1'),0);
});

test('exact workflow claimed only by the owning role with permitted action and SHADOW state',async () => {
  const out=await claim();
  assert.equal(out.length,1);
  assert.equal(out[0].case_id,ids.osCase);
  assert.equal(out[0].workflow_run_id,ids.osRun);
  assert.equal(out[0].attempt_count,1);
  assert.equal(out[0].ownership_epoch,1);
  assert.equal(await count('feya_growth_workflow_events_v1'),1);
  assert.equal((await db.query(`select workflow_status from public.feya_growth_workflow_runs_v1 where workflow_run_id=$1`,[ids.cqaRun])).rows[0].workflow_status,'READY');
  assert.deepEqual(await claim({worker:'other-worker'}),[]);
});

test('inactive roles cannot claim',async () => {
  await assert.rejects(claim({run:ids.cpimRun,caseId:ids.cpimCase,role:'CPIM',action:'RUN_REPORT',step:'REPORT'}),/role_not_enabled/);
  assert.equal(await count('feya_growth_workflow_events_v1'),0);
});

test('cross-case claim, wrong step or mismatched workflow type are rejected without writes',async () => {
  await assert.rejects(claim({caseId:ids.cqaCase,role:'CQA',action:'RUN_INDEPENDENT_CQA',step:'CONTENT_CHECK'}),/workflow_scope_changed/);
  await assert.rejects(claim({step:'WRONG_STEP'}),/workflow_scope_changed/);
  await assert.rejects(claim({action:'RUN_PAGE_OWNERSHIP_PROPOSALS'}),/workflow_scope_changed/);
  assert.equal(await count('feya_growth_workflow_events_v1'),0);
});

test('unlisted action and non-dry-run shadow work fail closed',async () => {
  await assert.rejects(claim({action:'PUBLISH_TO_SITE'}),/action_not_allowed/);
  await db.query(`update public.feya_growth_workflow_runs_v1 set state_json='{"mode":"SHADOW","dry_run":false}' where workflow_run_id=$1`,[ids.osRun]);
  await assert.rejects(claim(),/shadow_requires_dry_run/);
  assert.equal(await count('feya_growth_workflow_events_v1'),0);
});

test('case epoch changes and blocked cases cannot claim stale work',async () => {
  await db.query(`update public.feya_growth_cases_v1 set ownership_epoch=2 where case_id=$1`,[ids.osCase]);
  await assert.rejects(claim(),/case_stale_or_blocked/);
  await db.query(`update public.feya_growth_cases_v1 set ownership_epoch=1,case_status='BLOCKED' where case_id=$1`,[ids.osCase]);
  await assert.rejects(claim(),/case_stale_or_blocked/);
});

test('waiting workflows only wake after their scheduled time',async () => {
  await db.query(`update public.feya_growth_workflow_runs_v1 set workflow_status='WAITING',wake_at=now()+interval '1 hour' where workflow_run_id=$1`,[ids.osRun]);
  assert.deepEqual(await claim(),[]);
  await db.query(`update public.feya_growth_workflow_runs_v1 set wake_at=now()-interval '1 minute' where workflow_run_id=$1`,[ids.osRun]);
  assert.equal((await claim()).length,1);
});

test('expired worker is reclaimed once, then dead-lettered after retry budget',async () => {
  await claim();
  await db.query(`update public.feya_growth_workflow_runs_v1 set lease_expires_at=now()-interval '10 seconds' where workflow_run_id=$1`,[ids.osRun]);
  const second=await claim({worker:'recovery-worker'});
  assert.equal(second.length,1);
  assert.equal(second[0].attempt_count,2);
  assert.equal(second[0].retry_count,1);
  await db.query(`update public.feya_growth_workflow_runs_v1 set lease_expires_at=now()-interval '10 seconds' where workflow_run_id=$1`,[ids.osRun]);
  assert.deepEqual(await claim({worker:'third-worker'}),[]);
  const row=(await db.query(`select workflow_status,lease_owner from public.feya_growth_workflow_runs_v1 where workflow_run_id=$1`,[ids.osRun])).rows[0];
  assert.equal(row.workflow_status,'DEAD_LETTER');
  assert.equal(row.lease_owner,null);
  assert.equal(await count('feya_growth_workflow_events_v1'),3);
});

test('invalid lease and missing identity never create events',async () => {
  await assert.rejects(claim({lease:10}),/invalid_lease/);
  await assert.rejects(claim({worker:'   '}),/invalid_scope/);
  assert.equal(await count('feya_growth_workflow_events_v1'),0);
});

async function finish({
  run=ids.osRun,caseId=ids.osCase,epoch=1,role='OSPM',
  action='RUN_QUERY_CLUSTER_PROPOSALS',step='STEP_ONE',
  worker='unit-shadow',patch={reviewed:true},
}={}) {
  return (await db.query(
    `select * from public.feya_fn_complete_bound_workflow_v1(
       $1::uuid,$2::uuid,$3::integer,$4::text,$5::text,$6::text,$7::text,$8::jsonb)`,
    [run,caseId,epoch,role,action,step,worker,JSON.stringify(patch)]
  )).rows;
}

test('bound completion reuses canonical completion and persists one checked result',async () => {
  await claim();
  const done=await finish();
  assert.equal(done.length,1);
  assert.equal(done[0].workflow_status,'COMPLETED');
  const workflow=(await db.query('select state_json,lease_owner from public.feya_growth_workflow_runs_v1 where workflow_run_id=$1',[ids.osRun])).rows[0];
  assert.equal(workflow.state_json.reviewed,true);
  assert.equal(workflow.lease_owner,null);
  assert.equal(await count('feya_growth_workflow_events_v1'),2);
  await assert.rejects(finish(),/lease_expired_or_not_owned/);
});

test('stale owner epoch cannot finish an otherwise matching active lease',async () => {
  await claim();
  await db.query('update public.feya_growth_cases_v1 set ownership_epoch=2 where case_id=$1',[ids.osCase]);
  await assert.rejects(finish(),/owner_changed/);
  assert.equal((await db.query('select workflow_status from public.feya_growth_workflow_runs_v1 where workflow_run_id=$1',[ids.osRun])).rows[0].workflow_status,'RUNNING');
  assert.equal(await count('feya_growth_workflow_events_v1'),1);
});

test('expired lease and another worker ID cannot report success',async () => {
  await claim();
  await assert.rejects(finish({worker:'imposter'}),/lease_expired_or_not_owned/);
  await db.query("update public.feya_growth_workflow_runs_v1 set lease_expires_at=now()-interval '10 seconds' where workflow_run_id=$1",[ids.osRun]);
  await assert.rejects(finish(),/lease_expired_or_not_owned/);
  assert.equal(await count('feya_growth_workflow_events_v1'),1);
});

test('wrong step or revoked role blocks late completion and preserves original state',async () => {
  await claim();
  await assert.rejects(finish({step:'OTHER_STEP'}),/scope_changed/);
  await db.query("update public.feya_growth_role_activation_v1 set runtime_status='INACTIVE' where role_code='OSPM'");
  await assert.rejects(finish(),/role_not_enabled/);
  assert.equal((await db.query('select workflow_status from public.feya_growth_workflow_runs_v1 where workflow_run_id=$1',[ids.osRun])).rows[0].workflow_status,'RUNNING');
});

test('bound completion is service-role-only like bound claim', async () => {
  const acl=(await db.query(`
    select has_function_privilege('anon',oid,'execute') anon,
      has_function_privilege('authenticated',oid,'execute') auth,
      has_function_privilege('service_role',oid,'execute') svc
    from pg_proc where proname='feya_fn_complete_bound_workflow_v1'`)).rows[0];
  assert.deepEqual(acl,{anon:false,auth:false,svc:true});
});
