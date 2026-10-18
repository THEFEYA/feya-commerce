import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

// Isolated fixture. NEVER connect this test to live FEYA Supabase.
const native = process.env.FEYA_TEST_DATABASE_URL;
if (native) {
  const u = new URL(native);
  assert.ok(['localhost','127.0.0.1'].includes(u.hostname));
  assert.equal(u.pathname, '/feya_test');
}
let db;
const migration = () => readFile(
  new URL('../../supabase/migrations/20261019005000_growth_case_transition_idempotency_intent_guard_v1.sql',import.meta.url),'utf8');
const ids = {
  a:'10000000-0000-4000-8000-000000000001',
  b:'10000000-0000-4000-8000-000000000002',
  human:'20000000-0000-4000-8000-000000000001',
  other:'20000000-0000-4000-8000-000000000002',
};
const LONG_REASON='Owner approved L0 technical evidence only; no Google indexing, business outcome, or independent QA is claimed.';
const baseRequest={
  caseId:ids.a,expected:'OPEN',epoch:1,target:'TRIAGED',
  reason:LONG_REASON,actor:'human',actorId:ids.human,key:'g2-core-test-key-1',
};

async function transition(change={}) {
  const q={...baseRequest,...change};
  const {rows}=await db.query(
    'select * from public.feya_fn_transition_growth_case_v1($1::uuid,$2::text,$3::integer,$4::text,$5::text,$6::text,$7::uuid,$8::text)',
    [q.caseId,q.expected,q.epoch,q.target,q.reason,q.actor,q.actorId,q.key]);
  return rows;
}
async function countEvents(caseId=ids.a) {
  return (await db.query(
    'select count(*)::int as n from public.feya_growth_case_events_v1 where case_id=$1',[caseId]
  )).rows[0].n;
}
async function caseStatus(caseId=ids.a) {
  return (await db.query(
    'select case_status from public.feya_growth_cases_v1 where case_id=$1',[caseId]
  )).rows[0]?.case_status;
}
before(async()=>{
  if (native) {
    const client=new pg.Client({connectionString:native,connectionTimeoutMillis:5000});
    await client.connect();
    db={exec:s=>client.query(s),query:(s,params)=>client.query(s,params),close:()=>client.end()};
    assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);
  } else db=await PGlite.create();
  await db.exec([
    'create role anon;',
    'create role authenticated;',
    'create role service_role bypassrls;',
    'grant usage on schema public to anon,authenticated,service_role;',
    'create table public.feya_growth_cases_v1(',
    'case_id uuid primary key,case_status text not null,current_accountable_domain text not null,',
    'ownership_epoch integer not null check(ownership_epoch>0),',
    'blocked_reason text,closed_at timestamptz,updated_at timestamptz);',
    'create table public.feya_growth_case_events_v1(',
    'case_event_id uuid primary key default gen_random_uuid(),',
    'case_id uuid not null references public.feya_growth_cases_v1(case_id),',
    'event_type text not null,from_status text,to_status text,',
    'from_owner text,to_owner text,ownership_epoch integer not null,actor_type text not null,',
    'actor_user_id uuid,reason text,idempotency_key text,',
    'created_at timestamptz not null default now());',
    'grant select,insert,update on public.feya_growth_cases_v1,public.feya_growth_case_events_v1 to service_role;',
  ].join('\n'));
  await db.exec(await migration());
});
after(async()=>db?.close());
beforeEach(async()=>{
  await db.exec('truncate public.feya_growth_case_events_v1,public.feya_growth_cases_v1 cascade;');
  await db.query(
    "insert into public.feya_growth_cases_v1(case_id,case_status,current_accountable_domain,ownership_epoch) values ($1,'OPEN','TSEO',1),($2,'OPEN','OSPM',1)",
    [ids.a,ids.b]);
});

test('migration preserves service-only ACL and canonical function identity',async()=>{
  const signature='public.feya_fn_transition_growth_case_v1(uuid,text,integer,text,text,text,uuid,text)';
  const {rows}=await db.query(
    "select has_function_privilege('anon',$1,'EXECUTE') anon,"+
    "has_function_privilege('authenticated',$1,'EXECUTE') auth,"+
    "has_function_privilege('service_role',$1,'EXECUTE') svc",[signature]);
  assert.deepEqual(rows[0],{anon:false,auth:false,svc:true});
  const fn=(await db.query(
    "select pg_get_function_identity_arguments(p.oid) arguments from pg_proc p "+
    "join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' "+
    "and p.proname='feya_fn_transition_growth_case_v1'")).rows[0].arguments;
  assert.match(fn,/p_expected_ownership_epoch integer/);
  assert.match(fn,/p_idempotency_key text/);
});

test('canonical OPEN→TRIAGED creates one event and the exact repeat returns the same receipt',async()=>{
  const first=await transition();
  assert.equal(first.length,1);
  assert.equal(first[0].previous_status,'OPEN');
  assert.equal(first[0].new_status,'TRIAGED');
  assert.equal(first[0].ownership_epoch,1);
  assert.equal(await caseStatus(),'TRIAGED');
  assert.equal(await countEvents(),1);
  const second=await transition();
  assert.deepEqual(second,first);
  assert.equal(await countEvents(),1);
  const stored=(await db.query(
    'select actor_type,actor_user_id,reason,idempotency_key from public.feya_growth_case_events_v1')).rows[0];
  assert.equal(stored.actor_user_id,ids.human);
  assert.equal(stored.reason,LONG_REASON);
  assert.equal(stored.idempotency_key,baseRequest.key);
});

test('same key with changed status, epoch, reason or actor always fails without a second write',async()=>{
  await transition();
  const altered=[
    {target:'BLOCKED'},{target:'CLOSED'},{target:'INVESTIGATING'},
    {expected:'TRIAGED'},{epoch:2},{actor:'agent'},
    {actorId:ids.other},{actorId:null},{reason:LONG_REASON+' revised'},
    {reason:' ' + LONG_REASON + ' '},
  ];
  for(const q of altered){
    await assert.rejects(transition(q),/growth_case_idempotency_intent_mismatch/,JSON.stringify(q));
    assert.equal(await caseStatus(),'TRIAGED');
    assert.equal(await countEvents(),1);
  }
});

test('later unrelated case activity cannot invalidate the original exact retry',async()=>{
  const first=await transition();
  await transition({expected:'TRIAGED',target:'INVESTIGATING',
    key:'independent-other-intent',reason:'Start investigation after triage.'});
  assert.equal(await caseStatus(),'INVESTIGATING');
  assert.deepEqual(await transition(),first);
  assert.equal(await countEvents(),2);
});

test('new idempotency key cannot bypass stale case status or ownership epoch',async()=>{
  await transition();
  await assert.rejects(transition({key:'new-intent'}),/Stale case status/);
  await assert.rejects(transition({key:'new-intent-2',expected:'TRIAGED',epoch:2,
    target:'INVESTIGATING'}),/Stale ownership epoch/);
  assert.equal(await countEvents(),1);
});

test('NULL expected status/epoch and NULL actor cannot bypass canonical safety checks',async()=>{
  await assert.rejects(transition({expected:null,key:'null-status'}),/Stale case status/);
  await assert.rejects(transition({epoch:null,key:'null-epoch'}),/Stale ownership epoch/);
  await assert.rejects(transition({actor:null,key:'null-actor'}),/Unsupported actor type/);
  assert.equal(await countEvents(),0);
  assert.equal(await caseStatus(),'OPEN');
});

test('canonical FSM unchanged: OPEN→CLOSED and OPEN→ACTIONING remain forbidden',async()=>{
  for(const target of ['CLOSED','ACTIONING','MEASURING','LEARNING']){
    await assert.rejects(transition({caseId:ids.b,target,key:target}),/Invalid Growth Case transition/);
    assert.equal(await countEvents(ids.b),0);
    assert.equal(await caseStatus(ids.b),'OPEN');
  }
});

test('duplicate historic idempotency keys fail closed rather than choosing an event',async()=>{
  await transition();
  await db.query(
    "insert into public.feya_growth_case_events_v1(case_id,event_type,from_status,to_status,from_owner,to_owner,ownership_epoch,actor_type,actor_user_id,reason,idempotency_key)"+
    " values ($1,'STATUS_TRANSITIONED','OPEN','TRIAGED','TSEO','TSEO',1,'human',$2,$3,$4)",
    [ids.a,ids.human,LONG_REASON,baseRequest.key]);
  await assert.rejects(transition(),/growth_case_idempotency_ambiguous_event/);
  assert.equal(await caseStatus(),'TRIAGED');
  assert.equal(await countEvents(),2);
});

test('canonical BLOCKED→TRIAGED recovery stays allowed and writes only two events',async()=>{
  const done=await transition({caseId:ids.b,target:'BLOCKED',
    key:'blocked-key',reason:'Confirmed material source blocker.'});
  assert.equal(done[0].new_status,'BLOCKED');
  const restored=await transition({caseId:ids.b,expected:'BLOCKED',
    target:'TRIAGED',key:'restored-key',
    reason:'Source recovered and owner review completed.'});
  assert.equal(restored[0].new_status,'TRIAGED');
  assert.equal(await countEvents(ids.b),2);
});

test('system actor with null user and null retry key retains legacy behavior',async()=>{
  const change={caseId:ids.b,actor:'system',actorId:null,key:null,
    reason:'System diagnostic case moved under existing policy.'};
  assert.equal((await transition(change))[0].new_status,'TRIAGED');
  await assert.rejects(transition(change),/Stale case status/);
  assert.equal(await countEvents(ids.b),1);
});
