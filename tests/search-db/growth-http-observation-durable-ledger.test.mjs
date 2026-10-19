import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';

// No live Supabase credentials. Native fixture is restricted to LOCAL /feya_test.
const native=process.env.FEYA_TEST_DATABASE_URL;
if(native){
 const u=new URL(native);
 assert.ok(['localhost','127.0.0.1'].includes(u.hostname));
 assert.equal(u.pathname,'/feya_test');
}
const rid='2dc86d7c-6269-5327-9154-6b5178931254';
const hash='05d79c4ddc07da7e7fc60045f6ad39fabea40cb16f702bcfb6ea3b154d4bcd0b';
const originalGitSha='7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7';
const sha='533bc8e40f2fd1a9464495134459afde9308bd7d';
const zipSha='198ba252a30b36471795aceefa5eecedf1364fd7fa440e628e9fbae5557d9ae7';
const paths=['/','/about','/collections/shoulder-armor'];
const products=['/shop/a','/shop/b','/shop/c','/shop/d'];
let db;
function evidence(){
 const end=new Date(Date.now()-2*60*1000).toISOString(),start=new Date(Date.now()-3*60*1000).toISOString();
 const indexRows=paths.map(path=>({
  path,status:200,noindex:false,canonical:'https://thefeya.com'+path,pass:true,error:null,
 }));
 const productRows=products.slice(0,2).map(path=>({
  path,status:200,noindex:true,canonical:'https://thefeya.com'+path,pass:true,error:null,
 }));
 return {
  contract:'FEYA_GROWTH_HTTP_ARCHIVE_V1',
  source:{
   repository:'THEFEYA/feya-commerce',event:'push',ref:'refs/heads/main',
   origin:'https://thefeya.com',runId:'39180879535',artifactId:'12155269341',
   deploymentSha:sha,zipSha256:zipSha,
  },
  release:{
   id:rid,code:'organic-wave-a-20260926',version:12,hash,origin:'https://thefeya.com',
  },
  g2c:{
   schema:'FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1',
   verdict:'PRODUCTION_HTTP_OBSERVED',evidenceLevel:'L0_OBSERVATION',
   origin:'https://thefeya.com',
   deploymentCommitSha:sha,
   release:{id:rid,code:'organic-wave-a-20260926',version:12,hash,
    manifestGitSha:originalGitSha},
   observation:{startedAt:start,finishedAt:end},
   coverage:{
    indexIntent:{expected:3,verified:3},
    productNoindex:{expected:4,sampled:2,reportedPassed:2,
      perPathVerified:2,untested:2,proof:'PER_PATH_CI_RECEIPT'},
    shop:{expected:4,verified:4},
    collections:{expected:3,verified:3},
    pdpCopySample:{expected:5,verified:5},
   },
   source:{
    repository:'THEFEYA/feya-commerce',gitEvent:'push',gitRef:'refs/heads/main',
    workflowRunId:'39180879535',sourceType:'EXTERNAL_HTTP_GITHUB_CI',
    artifactPayloadSha256:'a'.repeat(64),
   },
   reasonCodes:[],
   googleIndexationConfirmed:false,independentHumanQaConfirmed:false,
   fullProductNoindexCoverageConfirmed:false,
   autonomousReviewerExecuted:false,measuredBusinessOutcome:false,
   caseMutationAllowed:false,sourceHealthPromoted:false,
  },
  indexRows,productRows,
 };
}
const clone=x=>JSON.parse(JSON.stringify(x));
const query=async(sql,args=[]) => (await db.query(sql,args)).rows;
async function stage(item=evidence()){
 return query('select * from public.feya_fn_stage_external_http_observation_v1($1::jsonb)',
  [JSON.stringify(item)]);
}
async function count(){
 return Number((await query('select count(*)::integer n from public.feya_growth_external_http_observation_receipts_v1'))[0].n);
}

before(async()=>{
 if(native){
  const client=new pg.Client({connectionString:native,connectionTimeoutMillis:5000});
  await client.connect();
  db={exec:s=>client.query(s),query:(s,a)=>client.query(s,a),close:()=>client.end()};
  assert.equal((await query("select count(*)::integer n from pg_tables where schemaname='public'"))[0].n,0);
 }else db=await PGlite.create();
 await db.exec([
  'create role anon;create role authenticated;create role service_role bypassrls;',
  'grant usage on schema public to anon,authenticated,service_role;',
  'create table public.feya_search_releases_v1(',
  'release_id uuid primary key,release_code text,release_version integer,',
  'release_status text,release_hash text,git_sha text,target_origin text);',
  'create table public.feya_search_release_items_v1(',
  'release_id uuid references public.feya_search_releases_v1(release_id),',
  'url_path_snapshot text,intended_index_state text,page_type_snapshot text);',
  'insert into public.feya_search_releases_v1',
  "(release_id,release_code,release_version,release_status,release_hash,git_sha,target_origin) values",
  "('"+rid+"','organic-wave-a-20260926',12,'ACTIVE','"+hash+"','"+originalGitSha+"','https://thefeya.com');",
 ].join('\n'));
 for(const path of paths)await db.query(
  "insert into public.feya_search_release_items_v1 values ($1,$2,'index','landing')",
  [rid,path]);
 for(const path of products)await db.query(
  "insert into public.feya_search_release_items_v1 values ($1,$2,'noindex','product')",
  [rid,path]);
 const m=await readFile(new URL(
  '../../supabase/migrations/20261019111500_growth_external_http_observation_receipts_v1.sql',
  import.meta.url),'utf8');
 await db.exec(m);
});
after(async()=>db?.close());
beforeEach(async()=>{
 await db.exec('truncate public.feya_growth_external_http_observation_receipts_v1;');
});

test('service-only immutable ledger; no anon/auth/client writes',async()=>{
 const grants=(await query(
  "select has_function_privilege('anon','public.feya_fn_stage_external_http_observation_v1(jsonb)','EXECUTE') anon,"+
  "has_function_privilege('authenticated','public.feya_fn_stage_external_http_observation_v1(jsonb)','EXECUTE') auth,"+
  "has_function_privilege('service_role','public.feya_fn_stage_external_http_observation_v1(jsonb)','EXECUTE') svc,"+
  "has_table_privilege('service_role','public.feya_growth_external_http_observation_receipts_v1','INSERT') direct_insert,"+
  "has_table_privilege('service_role','public.feya_growth_external_http_observation_receipts_v1','SELECT') service_read"
 ))[0];
 assert.deepEqual(grants,{anon:false,auth:false,svc:true,direct_insert:false,service_read:true});
 assert.equal((await query(
  "select relrowsecurity as enabled from pg_class where relname='feya_growth_external_http_observation_receipts_v1'"
 ))[0].enabled,true);
});

test('verified-looking source is stored as L0 SOURCE_REVIEW_REQUIRED, not QA PASS',async()=>{
 const r=(await stage())[0];
 assert.equal(r.created_new,true);assert.match(r.payload_sha256,/^[0-9a-f]{64}$/);
 assert.equal(r.index_urls_observed,3);
 assert.equal(r.product_urls_sampled,2);
 assert.equal(await count(),1);
 const row=(await query('select * from public.feya_growth_external_http_observation_receipts_v1'))[0];
 assert.equal(row.verification_state,'PROVENANCE_REVIEW_REQUIRED');
 assert.equal(row.evidence_level,'L0_OBSERVATION');
 assert.equal(row.index_urls_observed,3);assert.equal(row.product_urls_in_release,4);
 for(const field of ['source_health_promoted','independent_qa_passed',
   'google_indexed_state_known','business_outcome_measured'])assert.equal(row[field],false);
 assert.equal(row.artifact_zip_sha256,zipSha);
 assert.equal(row.deployment_sha,sha);
});

test('exact retry is idempotent, different same-run artifact content is not',async()=>{
 const p=evidence();
 const first=(await stage(p))[0];
 const retry=(await stage(clone(p)))[0];
 assert.equal(retry.created_new,false);
 assert.equal(retry.receipt_id,first.receipt_id);
 assert.equal(retry.payload_sha256,first.payload_sha256);
 assert.equal(await count(),1);
 const altered=clone(p);altered.productRows.reverse(); // Same facts, distinct JSONB array order.
 await assert.rejects(stage(altered),/GROWTH_HTTP_ARCHIVE_IDEMPOTENCY_CONFLICT/);
 assert.equal(await count(),1);
});

test('a new run may append a separate receipt while history stays immutable',async()=>{
 const a=await stage();const p=evidence();
 p.source.runId='39180879536';p.source.artifactId='12155269342';
 p.g2c.source.workflowRunId='39180879536';
 const second=await stage(p);
 assert.equal(second[0].created_new,true);
 assert.notEqual(a[0].receipt_id,second[0].receipt_id);
 assert.equal(await count(),2);
});

test('wrong source repo, branch, SHA, release, channel, or evidence claim denied',async()=>{
 const changes=[
  x=>{x.source.repository='OTHER/repo';},
  x=>{x.source.ref='refs/pull/183/merge';},
  x=>{x.source.event='pull_request';},
  x=>{x.source.deploymentSha='c'.repeat(40);},
  x=>{x.source.zipSha256='not-a-sha';},
  x=>{x.g2c.verdict='PR_SNAPSHOT_ONLY';},
  x=>{x.g2c.googleIndexationConfirmed=true;},
  x=>{x.g2c.autonomousReviewerExecuted=true;},
  x=>{x.g2c.source.repository='different/repo';},
  x=>{x.g2c.source.workflowRunId='123456';},
  x=>{delete x.g2c.source.artifactPayloadSha256;},
  x=>{x.g2c.source.artifactPayloadSha256='bad';},
  x=>{delete x.g2c.release.manifestGitSha;},
  x=>{x.g2c.release.manifestGitSha='bad';},
  x=>{x.release.origin='https://other.example';},
  x=>{x.release.hash='c'.repeat(64);},
 ];
 for(const edit of changes){
  const p=evidence();edit(p);
  await assert.rejects(stage(p));
 }
 assert.equal(await count(),0);
});

test('DRAFT release is denied, but an authentic RETIRED release can be archived as history',async()=>{
 await db.exec("update public.feya_search_releases_v1 set release_status='DRAFT'");
 try{
  await assert.rejects(stage(),/GROWTH_HTTP_ARCHIVE_RELEASE_NOT_CURRENT/);
  assert.equal(await count(),0);
  await db.exec("update public.feya_search_releases_v1 set release_status='RETIRED'");
  const saved=(await stage())[0];
  assert.equal(saved.created_new,true);
  const row=(await query(
   "select release_version,verification_state,independent_qa_passed from public.feya_growth_external_http_observation_receipts_v1"
  ))[0];
  assert.equal(row.release_version,12);
  assert.equal(row.verification_state,'PROVENANCE_REVIEW_REQUIRED');
  assert.equal(row.independent_qa_passed,false);
 }finally{
  await db.exec("update public.feya_search_releases_v1 set release_status='ACTIVE'");
 }
});

test('missing, duplicate, wrong-scope paths or tampered canonical fail',async()=>{
 const changes=[
  x=>{x.indexRows.pop();x.g2c.coverage.indexIntent.verified=2;},
  x=>{x.indexRows[0].path=x.indexRows[1].path;},
  x=>{x.indexRows[0].path='/elsewhere';},
  x=>{x.productRows[0].path='/about';},
  x=>{x.productRows[0].path='/shop/not-member';},
  x=>{x.productRows[0].canonical='https://evil.invalid/shop/a';},
  x=>{x.indexRows[0].noindex=true;},
  x=>{x.productRows[0].status=404;x.productRows[0].pass=false;},
  x=>{x.productRows[0].error='timeout';x.productRows[0].pass=false;},
 ];
 for(const edit of changes){
  const p=evidence();edit(p);
  await assert.rejects(stage(p));
  assert.equal(await count(),0);
 }
});

test('contradictory count, untrusted empty row, unknown source or forged L0 rejected',async()=>{
 const changes=[
  x=>{x.g2c.coverage.productNoindex.expected=207;},
  x=>{x.g2c.coverage.productNoindex.perPathVerified=0;},
  x=>{x.g2c.coverage.productNoindex.untested=0;},
  x=>{x.productRows=[];},
  x=>{x.g2c.evidenceLevel='L2_PLAUSIBLE_HYPOTHESIS_SUPPORT';},
  x=>{x.g2c.reasonCodes=['MISSING_GOOGLE_DATA'];},
  x=>{x.g2c.source.sourceType='LLM_AUTONOMOUS';},
  x=>{x.g2c.caseMutationAllowed=true;},
 ];
 for(const edit of changes){
  const p=evidence();edit(p);
  await assert.rejects(stage(p));assert.equal(await count(),0);
 }
});

test('write attempts UPDATE and DELETE are refused even as privileged function owner',async()=>{
 await stage();
 await assert.rejects(db.exec(
  "update public.feya_growth_external_http_observation_receipts_v1 set verification_state='PROVENANCE_REVIEW_REQUIRED'"
 ),/GROWTH_HTTP_RECEIPT_IMMUTABLE/);
 await assert.rejects(db.exec(
  "delete from public.feya_growth_external_http_observation_receipts_v1"
 ),/GROWTH_HTTP_RECEIPT_IMMUTABLE/);
 assert.equal(await count(),1);
});

test('no other Growth OS, Shop or GSC functions/tables are changed',async()=>{
 const ddl=await readFile(new URL(
  '../../supabase/migrations/20261019111500_growth_external_http_observation_receipts_v1.sql',
  import.meta.url),'utf8');
 for(const phrase of [
  'INSERT INTO public.feya_growth_cases_v1',
  'UPDATE public.feya_growth_cases_v1',
  'feya_growth_gsc_observation_receipts_v1',
  'feya_growth_data_source_health_v1',
  'cron.schedule','feya_fn_transition_growth_case_v1',
  'storage.buckets', 'feya_growth_ai_invocations_v1',
 ]){
  assert.equal(ddl.includes(phrase),false,phrase);
 }
 assert.equal(await count(),0);
});

test('native PG17 concurrent exact retries create only one receipt',{skip:!native},async()=>{
 const p=JSON.stringify(evidence());
 const a=new pg.Client({connectionString:native,connectionTimeoutMillis:5000});
 const b=new pg.Client({connectionString:native,connectionTimeoutMillis:5000});
 await Promise.all([a.connect(),b.connect()]);
 try{
  const sql='select * from public.feya_fn_stage_external_http_observation_v1($1::jsonb)';
  const [x,y]=await Promise.all([a.query(sql,[p]),b.query(sql,[p])]);
  assert.equal(x.rows[0].receipt_id,y.rows[0].receipt_id);
  assert.equal(Number(x.rows[0].created_new)+Number(y.rows[0].created_new),1);
  assert.equal(await count(),1);
 }finally{await Promise.all([a.end(),b.end()]);}
});

test('native PG17 concurrent conflicting artifact payload has one success and one veto',
 {skip:!native},async()=>{
 const p=evidence(),altered=clone(p);altered.indexRows.reverse();
 const a=new pg.Client({connectionString:native,connectionTimeoutMillis:5000});
 const b=new pg.Client({connectionString:native,connectionTimeoutMillis:5000});
 await Promise.all([a.connect(),b.connect()]);
 try{
  const sql='select * from public.feya_fn_stage_external_http_observation_v1($1::jsonb)';
  const r=await Promise.allSettled([
   a.query(sql,[JSON.stringify(p)]),b.query(sql,[JSON.stringify(altered)]),
  ]);
  assert.equal(r.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(r.filter(x=>x.status==='rejected').length,1);
  assert.equal(await count(),1);
 }finally{await Promise.all([a.end(),b.end()]);}
});
