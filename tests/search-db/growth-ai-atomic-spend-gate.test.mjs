import test,{before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';

const url=process.env.FEYA_TEST_DATABASE_URL;
if(url){const u=new URL(url);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');}
let db;
const caseId='20000000-0000-4000-8000-000000000001';
const handoffId='30000000-0000-4000-8000-000000000001';
const runId='40000000-0000-4000-8000-000000000001';
const budgetId='10000000-0000-4000-8000-000000000001';
const ownerId='50000000-0000-4000-8000-000000000001';
const query=async (sql,params=[]) => (await db.query(sql,params)).rows;
const reserve=async(opts={})=> (await query(
 'select * from public.feya_fn_reserve_gmel_ai_spend_v1($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::integer,$6::text,$7::text,$8::text,$9::integer,$10::integer)',
 [budgetId,caseId,handoffId,runId,opts.epoch??1,opts.worker??'worker-1',
 opts.key??'gmel-fixture-run-0001',opts.hash??'a'.repeat(64),
 opts.input??1000,opts.output??1000]))[0];
const submit=async(id)=> (await query('select * from public.feya_fn_submit_gmel_ai_spend_v1($1::uuid,$2::text)',[id,'worker-1']))[0];
const settle=async(id,known=true)=> (await query(
 'select * from public.feya_fn_settle_gmel_ai_spend_v1($1::uuid,$2::text,$3::boolean,$4::integer,$5::integer,$6::text)',
 [id,'worker-1',known,100,100,'response-fixture']))[0];

before(async()=>{
 if(url){const c=new pg.Client({connectionString:url,connectionTimeoutMillis:5000});await c.connect();
 db={exec:s=>c.query(s),query:(s,p)=>c.query(s,p),close:()=>c.end()};
 assert.equal((await query("select count(*)::integer n from pg_tables where schemaname='public'"))[0].n,0);
 }else db=await PGlite.create();
 await db.exec([
 'create role anon','create role authenticated','create role service_role bypassrls',
 'create schema auth','create table auth.users(id uuid primary key)',
 'grant usage on schema public to anon,authenticated,service_role',
 'create table public.feya_growth_cases_v1(case_id uuid primary key,case_status text,current_accountable_domain text,ownership_epoch integer)',
 'create table public.feya_growth_handoffs_v1(handoff_id uuid primary key,case_id uuid,ownership_epoch integer,source_domain text,target_domain text,handoff_status text)',
 'create table public.feya_growth_workflow_runs_v1(workflow_run_id uuid primary key,case_id uuid,ownership_epoch integer,workflow_type text,current_step_code text,workflow_status text,lease_owner text,lease_expires_at timestamptz,state_json jsonb)',
 'create table public.feya_growth_role_activation_v1(role_code text primary key,runtime_status text,allowed_action_codes_json jsonb)',
 'grant select,insert,update on all tables in schema public to service_role'
 ].join(';\n')+';');
 await db.exec(await readFile(new URL('../../supabase/migrations/20261016160000_growth_ai_atomic_spend_gate_v1.sql',import.meta.url),'utf8'));
});
after(async()=>db?.close());
beforeEach(async()=>{
 await db.exec('truncate public.feya_growth_ai_spend_reservations_v1,public.feya_growth_ai_budget_policies_v1,public.feya_growth_role_activation_v1,public.feya_growth_workflow_runs_v1,public.feya_growth_handoffs_v1,public.feya_growth_cases_v1,auth.users cascade');
 await query('insert into auth.users values($1)',[ownerId]);
 await query("insert into public.feya_growth_cases_v1 values($1,'OPEN','TSEO',1)",[caseId]);
 await query("insert into public.feya_growth_handoffs_v1 values($1,$2,1,'TSEO','GMEL','OPEN')",[handoffId,caseId]);
 await query("insert into public.feya_growth_role_activation_v1 values('GMEL','SHADOW','[\"RECORD_LEARNING_EVIDENCE\"]'::jsonb)");
 await query("insert into public.feya_growth_workflow_runs_v1 values($1,$2,1,'GMEL_SEMANTIC_EVIDENCE_V1','MODEL_REVIEW','RUNNING','worker-1',now()+interval '1 hour',jsonb_build_object('handoff_id',$3::text,'mode','SHADOW','dry_run',true))",[runId,caseId,handoffId]);
 await query("insert into public.feya_growth_ai_budget_policies_v1(policy_id,policy_code,purpose,provider,model_id,price_contract_version,input_usd_per_million,output_usd_per_million,max_total_usd,max_single_call_usd,max_input_tokens,max_output_tokens,enabled,approved_by_user_id,approved_at,expires_at) values($1,'fixture-only','GMEL_SEMANTIC_EVIDENCE_V1','OPENAI','test-model','fixture-price',2,4,0.009,0.006,1000,1000,true,$2,now()-interval '1 minute',now()+interval '1 hour')",[budgetId,ownerId]);
});
test('empty live-policy state rejects spending',async()=>{
 await query('delete from public.feya_growth_ai_budget_policies_v1');
 await assert.rejects(reserve(),/OWNER_APPROVAL_MISSING/);
});
test('once-only claim, submission, settlement and idempotent replay',async()=>{
 const first=await reserve();assert.equal(first.call_allowed,true);
 assert.equal(Number(first.reserved_usd),0.006);
 assert.equal((await reserve()).call_allowed,false);
 assert.equal((await submit(first.reservation_id)).may_call_provider,true);
 assert.equal((await submit(first.reservation_id)).may_call_provider,false);
 const done=await settle(first.reservation_id);
 assert.equal(done.reservation_status,'SETTLED');
 assert.equal(Number(done.settled_usd),0.0006);
 assert.equal((await settle(first.reservation_id)).reservation_status,'SETTLED');
});
test('uncertain provider outcome freezes budget; no paid retry permitted',async()=>{
 const first=await reserve();await submit(first.reservation_id);
 const uncertain=await settle(first.reservation_id,false);
 assert.equal(uncertain.reservation_status,'UNCERTAIN');
 assert.equal(Number(uncertain.settled_usd),0.006);
 assert.equal((await submit(first.reservation_id)).may_call_provider,false);
});
test('only service_role may read financial rows or execute budget functions',async()=>{
 const a=(await query("select has_table_privilege('anon','public.feya_growth_ai_budget_policies_v1','SELECT') a,has_table_privilege('service_role','public.feya_growth_ai_budget_policies_v1','SELECT') s"))[0];
 assert.deepEqual(a,{a:false,s:true});
 const r=await query("select proname,has_function_privilege('anon',oid,'EXECUTE') a,has_function_privilege('service_role',oid,'EXECUTE') s from pg_proc where proname like 'feya_fn_%gmel_ai_spend_v1'");
 assert.equal(r.length,4);for(const x of r)assert.deepEqual([x.a,x.s],[false,true]);
});

test('stale case, wrong target, or invalid worker lease cannot reserve funds',async()=>{
 await query('update public.feya_growth_cases_v1 set ownership_epoch=2 where case_id=$1',[caseId]);
 await assert.rejects(reserve(),/CASE_STALE/);
 await query('update public.feya_growth_cases_v1 set ownership_epoch=1 where case_id=$1',[caseId]);
 await query("update public.feya_growth_handoffs_v1 set target_domain='OSPM' where handoff_id=$1",[handoffId]);
 await assert.rejects(reserve(),/HANDOFF_NOT_OPEN/);
 await query("update public.feya_growth_handoffs_v1 set target_domain='GMEL' where handoff_id=$1",[handoffId]);
 await assert.rejects(reserve({worker:'wrong-worker'}),/UNLEASED_WORK/);
 await query("update public.feya_growth_workflow_runs_v1 set lease_expires_at=now()-interval '1 second' where workflow_run_id=$1",[runId]);
 await assert.rejects(reserve(),/UNLEASED_WORK/);
});

test('role revocation or budget shutdown before submission blocks any provider call',async()=>{
 const r=await reserve();
 await query("update public.feya_growth_role_activation_v1 set runtime_status='INACTIVE'");
 await assert.rejects(submit(r.reservation_id),/SCOPE_REVOKED/);
 await query("update public.feya_growth_role_activation_v1 set runtime_status='SHADOW'");
 await query("update public.feya_growth_ai_budget_policies_v1 set enabled=false");
 await assert.rejects(submit(r.reservation_id),/POLICY_REVOKED/);
});

test('settlement uses frozen reservation rates even if the policy later changes',async()=>{
 const r=await reserve();
 await query("update public.feya_growth_ai_budget_policies_v1 set input_usd_per_million=9,output_usd_per_million=9");
 await submit(r.reservation_id);
 const done=await settle(r.reservation_id);
 assert.equal(Number(done.settled_usd),0.0006);
 const snap=(await query("select input_usd_per_million,output_usd_per_million,price_contract_version from public.feya_growth_ai_spend_reservations_v1 where reservation_id=$1",[r.reservation_id]))[0];
 assert.equal(Number(snap.input_usd_per_million),2);
 assert.equal(Number(snap.output_usd_per_million),4);
 assert.equal(snap.price_contract_version,'fixture-price');
});

test('unsubmitted reservation can be released without deleting the audit record',async()=>{
 const r=await reserve();
 const yes=(await query("select public.feya_fn_release_unsent_gmel_ai_spend_v1($1::uuid,$2::text) released",[r.reservation_id,'worker-1']))[0].released;
 assert.equal(yes,true);
 assert.equal((await submit(r.reservation_id)).may_call_provider,false);
 const no=(await query("select public.feya_fn_release_unsent_gmel_ai_spend_v1($1::uuid,$2::text) released",[r.reservation_id,'worker-1']))[0].released;
 assert.equal(no,false);
 await assert.rejects(settle(r.reservation_id),/NEVER_SUBMITTED/);
});
