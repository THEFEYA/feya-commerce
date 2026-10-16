import test,{before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';

const native=process.env.FEYA_TEST_DATABASE_URL;
if(native){const u=new URL(native);assert.ok(['localhost','127.0.0.1'].includes(u.hostname));assert.equal(u.pathname,'/feya_test');}
let db;
const CID='10000000-0000-4000-8000-000000000001';
const WID='20000000-0000-4000-8000-000000000001';
const RID='30000000-0000-4000-8000-000000000001';
const P1='40000000-0000-4000-8000-000000000001';
const P2='40000000-0000-4000-8000-000000000002';
const q=async(s,params=[]) => (await db.query(s,params)).rows;
const migrate=()=>readFile(new URL('../../supabase/migrations/20261016123000_growth_os_tseo_gmel_deterministic_review_v1.sql',import.meta.url),'utf8');
const review=async(epoch=1,run=WID)=>(await q(
 "select * from public.feya_fn_reconcile_tseo_gmel_release_v1($1::uuid,$2::integer,$3::uuid)",[CID,epoch,run]))[0];
const count=async(t)=>(await q("select count(*)::integer n from public."+t))[0].n;

before(async()=>{
 if(native){const client=new pg.Client({connectionString:native,connectionTimeoutMillis:5000});
 await client.connect();db={exec:s=>client.query(s),query:(s,p)=>client.query(s,p),close:()=>client.end()};
 assert.equal((await q("select count(*)::integer n from pg_tables where schemaname='public'"))[0].n,0);
 }else db=await PGlite.create();
 const ddl=[
 "create role anon; create role authenticated; create role service_role bypassrls",
 "grant usage on schema public to anon,authenticated,service_role",
 "create table public.feya_growth_cases_v1(case_id uuid primary key,case_type text,current_accountable_domain text,ownership_epoch integer,case_status text)",
 "create table public.feya_growth_workflow_runs_v1(workflow_run_id uuid primary key,case_id uuid,ownership_epoch integer,workflow_status text,workflow_type text,current_step_code text,state_json jsonb)",
 "create table public.feya_growth_role_activation_v1(role_code text primary key,runtime_status text,allowed_action_codes_json jsonb)",
 "create table public.feya_search_releases_v1(release_id uuid primary key,release_code text,release_version integer,release_status text,target_origin text)",
 "create table public.feya_search_release_items_v1(release_id uuid,seo_page_id uuid,url_path_snapshot text,page_type_snapshot text,intended_index_state text,canonical_product_id uuid)",
 "create table public.feya_storefront_approved_product_bindings_v1(canonical_product_id uuid primary key)",
 "create table public.feya_growth_handoffs_v1(handoff_id uuid primary key default gen_random_uuid(),case_id uuid,ownership_epoch integer,source_domain text,target_domain text,handoff_mode text,handoff_status text,question text,handoff_fingerprint text default 'fixture',evidence_json jsonb default '{}'::jsonb,known_facts_json jsonb default '[]'::jsonb,known_unknowns_json jsonb default '[]'::jsonb,expected_output_schema_code text,expected_output_schema_json jsonb default '{}'::jsonb,idempotency_key text unique,result_json jsonb default '{}'::jsonb,result_reason text,created_at timestamptz default now(),completed_at timestamptz)",
 "create function public.feya_fn_create_growth_handoff_v1(p_case_id uuid,p_expected_ownership_epoch integer,p_source_domain text,p_target_domain text,p_handoff_mode text,p_question text,p_evidence_json jsonb default '{}'::jsonb,p_known_facts_json jsonb default '[]'::jsonb,p_known_unknowns_json jsonb default '[]'::jsonb,p_expected_output_schema_code text default null,p_expected_output_schema_json jsonb default '{}'::jsonb,p_case_handoff_budget integer default 8,p_created_by_type text default 'system',p_idempotency_key text default null) returns table(handoff_id uuid,created_new boolean,handoff_status text,handoff_fingerprint text) language plpgsql as $f$ declare h public.feya_growth_handoffs_v1%rowtype;begin select * into h from public.feya_growth_handoffs_v1 where idempotency_key=p_idempotency_key;if found then return query select h.handoff_id,false,h.handoff_status,h.handoff_fingerprint;return;end if;insert into public.feya_growth_handoffs_v1(case_id,ownership_epoch,source_domain,target_domain,handoff_mode,handoff_status,question,evidence_json,known_facts_json,known_unknowns_json,expected_output_schema_code,expected_output_schema_json,idempotency_key) values(p_case_id,p_expected_ownership_epoch,p_source_domain,p_target_domain,p_handoff_mode,'OPEN',p_question,p_evidence_json,p_known_facts_json,p_known_unknowns_json,p_expected_output_schema_code,p_expected_output_schema_json,p_idempotency_key) returning * into h;return query select h.handoff_id,true,h.handoff_status,h.handoff_fingerprint;end;$f$",
 "create function public.feya_fn_complete_growth_handoff_v1(p_handoff_id uuid,p_result_status text,p_result_json jsonb,p_result_reason text,p_actor_domain text) returns table(handoff_id uuid,handoff_status text,stale_result boolean,completed_at timestamptz) language plpgsql as $f$ declare h public.feya_growth_handoffs_v1%rowtype;begin select * into h from public.feya_growth_handoffs_v1 where handoff_id=p_handoff_id for update;if not found or h.handoff_status<>'OPEN' or p_actor_domain<>h.target_domain then raise exception 'Invalid target or status';end if;if not (p_result_json?'verdict' and p_result_json?'notes') then raise exception 'Missing expected output';end if;update public.feya_growth_handoffs_v1 t set handoff_status=p_result_status,result_json=p_result_json,result_reason=p_result_reason,completed_at=clock_timestamp() where t.handoff_id=p_handoff_id returning * into h;return query select h.handoff_id,h.handoff_status,false,h.completed_at;end;$f$",
 "grant select,insert,update on all tables in schema public to service_role"
 ];
 await db.exec(ddl.join(";\n")+";");
 await db.exec(await migrate());
});
after(async()=>db?.close());
beforeEach(async()=>{
 await db.exec("truncate public.feya_growth_handoffs_v1,public.feya_growth_workflow_runs_v1,public.feya_growth_cases_v1,public.feya_growth_role_activation_v1,public.feya_search_release_items_v1,public.feya_search_releases_v1,public.feya_storefront_approved_product_bindings_v1");
 const data=[
 "insert into public.feya_growth_cases_v1 values('"+CID+"','TSEO_INDEXABILITY_SHADOW','TSEO',1,'OPEN')",
 "insert into public.feya_growth_role_activation_v1 values('GMEL','SHADOW','[\"RECORD_LEARNING_EVIDENCE\"]'::jsonb)",
 "insert into public.feya_search_releases_v1 values('"+RID+"','release-fixture-v12',12,'ACTIVE','https://thefeya.com')",
 "insert into public.feya_storefront_approved_product_bindings_v1 values('"+P1+"'),('"+P2+"')",
 "insert into public.feya_search_release_items_v1 values('"+RID+"','50000000-0000-4000-8000-000000000001','/events/festival','landing','index',null),('"+RID+"','50000000-0000-4000-8000-000000000002','/products/one','product','noindex','"+P1+"'),('"+RID+"','50000000-0000-4000-8000-000000000003','/products/two','product','noindex','"+P2+"')",
 "insert into public.feya_growth_workflow_runs_v1 values('"+WID+"','"+CID+"',1,'COMPLETED','RECORD_INDEXABILITY_PROPOSAL','VERIFY_ACTIVE_SEARCH_RELEASE','{\"mode\":\"SHADOW\",\"dry_run\":true,\"production_mutations_allowed\":false,\"indexability_receipt\":{\"template\":\"TSEO_ACTIVE_SEARCH_RELEASE_AUDIT_V1\",\"source\":\"feya_search_releases_v1:ACTIVE\",\"coverage\":\"COMPLETE\",\"changes_applied\":0,\"model_calls\":0,\"release_code\":\"release-fixture-v12\",\"release_version\":12,\"target_origin\":\"https://thefeya.com\",\"intended_urls_counted\":3,\"intended_index\":1,\"intended_noindex\":2,\"approved_product_bindings\":2}}'::jsonb)"
 ];
 await db.exec(data.join(";\n")+";");
});

test('only service_role may call reviewer SQL',async()=>{
 const acl=(await q("select has_function_privilege('anon',oid,'EXECUTE') anon,has_function_privilege('authenticated',oid,'EXECUTE') auth,has_function_privilege('service_role',oid,'EXECUTE') service from pg_proc where proname='feya_fn_reconcile_tseo_gmel_release_v1'"))[0];
 assert.deepEqual(acl,{anon:false,auth:false,service:true});
});
test('automatic deterministic review reconciles, stores and deduplicates with zero AI',async()=>{
 const first=await review();
 assert.equal(first.handoff_status,'COMPLETED');assert.equal(first.created_new,true);
 assert.equal(first.review_method,'AUTOMATED_SQL_RECONCILIATION_NO_LLM');
 const result=(await q("select * from public.feya_growth_handoffs_v1"))[0];
 assert.equal(result.result_json.evidence_level,'L0_OBSERVATION');
 assert.equal(result.result_json.business_outcome_state,'NOT_MEASURABLE');
 assert.equal(result.result_json.autonomous_gmel_agent_executed,false);
 assert.equal(result.result_json.deterministic_core_preflight_executed,true);
 assert.equal(result.result_json.model_calls,0);
 assert.equal(result.result_json.changes_applied,0);
 const replay=await review();
 assert.equal(replay.created_new,false);assert.equal(replay.handoff_id,first.handoff_id);
 assert.equal(replay.review_method,'EXISTING_REVIEW_PRESERVED');
 assert.equal(await count('feya_growth_handoffs_v1'),1);
});
test('existing human review is preserved without a second automated result',async()=>{
 await q("insert into public.feya_growth_handoffs_v1(case_id,ownership_epoch,source_domain,target_domain,handoff_mode,handoff_status,question,evidence_json) values($1,1,'TSEO','GMEL','COLLABORATION','COMPLETED','manual',jsonb_build_object('original_workflow_run_id',$2::uuid))",[CID,WID]);
 const res=await review();
 assert.equal(res.created_new,false);
 assert.equal(res.review_method,'EXISTING_REVIEW_PRESERVED');
 assert.equal(await count('feya_growth_handoffs_v1'),1);
});
test('rejected role or stale case does not create anything',async()=>{
 await db.exec("update public.feya_growth_role_activation_v1 set runtime_status='INACTIVE'");
 await assert.rejects(review(),/gmel_role_not_allowed/);
 await db.exec("update public.feya_growth_role_activation_v1 set runtime_status='SHADOW'");
 await db.exec("update public.feya_growth_cases_v1 set ownership_epoch=2");
 await assert.rejects(review(),/case_stale_or_ineligible/);
 assert.equal(await count('feya_growth_handoffs_v1'),0);
});
test('source change, duplicate URL, missing binding and incomplete TSEO evidence fail closed',async()=>{
 await db.exec("update public.feya_search_releases_v1 set release_version=13");
 await assert.rejects(review(),/release_changed_since_tseo/);
 await db.exec("update public.feya_search_releases_v1 set release_version=12");
 await q("update public.feya_search_release_items_v1 set url_path_snapshot='/products/one' where canonical_product_id=$1",[P2]);
 await assert.rejects(review(),/source_reconciliation_failed/);
 await q("update public.feya_search_release_items_v1 set url_path_snapshot='/products/two' where canonical_product_id=$1",[P2]);
 await q("delete from public.feya_storefront_approved_product_bindings_v1 where canonical_product_id=$1",[P2]);
 await assert.rejects(review(),/source_reconciliation_failed/);
 await q("insert into public.feya_storefront_approved_product_bindings_v1 values($1)",[P2]);
 await db.exec("update public.feya_growth_workflow_runs_v1 set workflow_status='WAITING'");
 await assert.rejects(review(),/missing_verified_tseo_step/);
 assert.equal(await count('feya_growth_handoffs_v1'),0);
});
test('wrong identity or epoch cannot create a handoff',async()=>{
 await assert.rejects(review(0),/invalid_identity/);
 await assert.rejects(review(1,'70000000-0000-4000-8000-000000000009'),/missing_verified_tseo_step/);
 assert.equal(await count('feya_growth_handoffs_v1'),0);
});
