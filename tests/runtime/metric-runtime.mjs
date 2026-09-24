/** Ephemeral local Supabase + real Next production server. No linked/remote project. */
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import pg from 'pg';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {observedMetricSchemaSQL,metricMigrationSQL} from '../search-db/helpers/observed-metric-schema.mjs';
import {readerMigrationSQL} from '../search-db/helpers/observed-reader-boundary.mjs';
import {functionHardeningSQL} from '../search-db/helpers/metric-function-hardening.mjs';
import {metricClosureSchemaSQL,metricClosureFixture} from '../search-db/helpers/observed-metric-closure.mjs';
import {accessBoundarySQL} from '../search-db/helpers/metric-access-boundary.mjs';
import {internalViewFixture,internalViewExtensionSchemaSQL,internalViewAccessSQL,internalViewSeedSQL} from '../search-db/helpers/internal-view-access.mjs';
import {previewDemandImport} from '../../lib/searchDemandImportPreview.ts';
import {prepareMetricImport,verifyMetricReaderBoundary,METRIC_IMPORT_RUNTIME_VERIFIED,METRIC_IMPORT_RPC} from '../../lib/searchMetricAtomicStorage.ts';
import {legacySnapshotToDemandRow} from '../../lib/searchLegacyDemandAdapter.ts';
import {metricRowsToCsv} from '../../lib/searchMetricCsv.ts';
import {startGoogleProviderFixture,seedGoogleBatch} from './google-provider-fixture.mjs';
import {googleBatch} from '../search/googleAdsFixture.ts';
import {verifyApprovedContentRuntime} from './approved-content-runtime.mjs';
import {verifyVariantDraftRuntime} from './variant-draft-runtime.mjs';
const root=process.cwd(),out=resolve('runtime-results');
const report={contract:'metric_runtime_proof_v1',commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workflow_event_sha:process.env.GITHUB_SHA||null,environment:'ephemeral_loopback_supabase',production_connected:false,next_write_path_verified:false,checks:[],limitations:['Exact 84-view SELECT closure on 39 observed table contracts; external FKs, non-core triggers and indexes are outside the read/permission restore.','Hosted staging, broader database API surface and production activation remain separate.']};
const base='http://127.0.0.1:3000',endpoint=base+'/api/admin/seo-engine/keyword-metrics/import';
const bankId='10000000-0000-4000-8000-000000000001';
const staging='feya_commerce_seo_keyword_metric_import_staging_v1',snapshots='feya_commerce_seo_keyword_metric_snapshots_v1',receipts='feya_commerce_seo_metric_import_receipts_v1';
let work,db,browser,server,googleProvider,started=false,service,ownerPage,appLog='';
const runtimeSecrets=[];
const cleanEnv=Object.fromEntries(Object.entries(process.env).filter(([k])=>!(/^(SUPABASE_|NEXT_PUBLIC_|FEYA_|OPENAI_|GOOGLE_|VERCEL_)/.test(k))));
function cli(args){return execFileSync('supabase',args,{encoding:'utf8',env:cleanEnv,maxBuffer:20*1024*1024,timeout:600000});}
function local(value,protocols,port){const u=new URL(value);assert.ok(['127.0.0.1','localhost'].includes(u.hostname),'Loopback required');assert.ok(protocols.includes(u.protocol));assert.equal(u.port,String(port));return u;}
async function check(name,fn){try{await fn();report.checks.push({name,status:'pass'});console.log('PASS '+name);}catch(e){report.checks.push({name,status:'fail',error:String(e.message).slice(0,700)});throw e;}}
async function counts(){return Promise.all([staging,snapshots,receipts].map(async t=>(await db.query(`select count(*)::int n from public.${t}`)).rows[0].n));}
function input(patch={}) {const now=new Date(),day=new Date(now.getTime()-86400000).toISOString().slice(0,10);return {keyword:'synthetic shoulder armor',metric_source:'google_ads_csv',source_ref:'fixture:runtime-metric',region:'US',language:'en',network:'GOOGLE_SEARCH',period_start:new Date(Date.UTC(now.getUTCFullYear()-1,now.getUTCMonth(),1)).toISOString().slice(0,10),period_end:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),0)).toISOString().slice(0,10),last_checked:day,avg_monthly_searches:'0',competition:'LOW',competition_index:'12',low_bid:'1.25',high_bid:'2.5',bid_currency_code:'UAH',keyword_bank_id:bankId,...patch};}
async function api(page,body,key){const r=await page.request.post(endpoint,{data:body,headers:key?{'Idempotency-Key':key}:{}});return {status:r.status(),body:await r.json(),cache:r.headers()['cache-control']};}
async function save(rows,key){
 const r=await api(ownerPage,{dry_run:false,rows,context_evidence_ref:'fixture:runtime-context'},key);return {...r.body,httpStatus:r.status};
}

async function login(page,email,password){await page.goto(base+'/admin/login?next=/admin/seo-engine/keyword-metrics');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Пароль',{exact:true}).fill(password);const action=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/admin/login');await page.getByRole('button',{name:'Войти',exact:true}).click();const response=await action;console.log('Login Server Action status: '+response.status());}
await mkdir(out,{recursive:true});
try {
 assert.equal(METRIC_IMPORT_RUNTIME_VERIFIED,true,'This suite must exercise the real Next write path.');
 assert.ok(!process.env.SUPABASE_ACCESS_TOKEN&&!process.env.SUPABASE_SERVICE_ROLE_KEY,'No cloud credentials allowed in runtime job');
 execFileSync('docker',['info'],{stdio:'ignore'});
 work=await mkdtemp(join(tmpdir(),'feya-metric-runtime-'));
 cli(['init','--workdir',work,'--yes']);
 const configFile=join(work,'supabase/config.toml');let config=await readFile(configFile,'utf8');
 config=config.replace(/^project_id = .*$/m,'project_id = "feya-metric-runtime"');
 // Keep real Auth/API; no email is sent and public signup is disabled.
 const authSection=/\[auth\]\n[\s\S]*?(?=\n\[)/;
 assert.match(config.match(authSection)?.[0]||'',/enable_signup = true/);
 config=config.replace(authSection,section=>section.replace('enable_signup = true','enable_signup = false'));
 await writeFile(configFile,config);
 console.log('Starting isolated Supabase services.');
 started=true;cli(['start','--workdir',work,'--exclude','realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor']);
 const status=JSON.parse(cli(['status','--workdir',work,'-o','json']));
 const url=status.API_URL||status.api_url,anon=status.ANON_KEY||status.anon_key,key=status.SERVICE_ROLE_KEY||status.service_role_key,dbURL=status.DB_URL||status.db_url;
 local(url,['http:'],54321);const dbLocation=local(dbURL,['postgresql:','postgres:'],54322);assert.equal(dbLocation.pathname,'/postgres');assert.ok(anon&&key);
 runtimeSecrets.push(anon,key);
 db=new pg.Client({connectionString:dbURL,statement_timeout:30000,connectionTimeoutMillis:5000});await db.connect();
 await check('Fresh isolated database; real Supabase roles exist',async()=>{
  assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);
  assert.equal((await db.query("select count(*)::int n from pg_roles where rolname in ('anon','authenticated','service_role','authenticator')")).rows[0].n,4);
 });
 await check('Extended SELECT closure and six unapplied migrations restore in Supabase',async()=>{
  await db.query(await observedMetricSchemaSQL({existingSupabaseRoles:true}));await db.query(await metricClosureSchemaSQL());await db.query(await internalViewExtensionSchemaSQL());await db.query(await internalViewSeedSQL());
  await db.query(`insert into public.seo_keyword_bank_v1(id,keyword,keyword_norm,bank_bucket,review_status,score,avg_monthly_searches) values($1,'synthetic shoulder armor','synthetic shoulder armor','product','approved_draft',77,90)`,[bankId]);
  await db.query(`insert into public.feya_commerce_seo_keyword_master_v1(keyword_id,keyword,keyword_norm,keyword_word_count,priority_tier,validation_priority) values(800,'synthetic shoulder armor','synthetic shoulder armor',3,'test','test');
   insert into public.${snapshots}(snapshot_id,keyword_norm,source_api,geo,language,avg_monthly_searches,data_freshness_status) values(900,'synthetic shoulder armor','google_ads_csv','US','en',90,'fresh_manual_import');
   insert into public.${staging}(import_row_id,batch_code,keyword_norm,avg_monthly_searches,import_status) values(900,'legacy-fixture','synthetic shoulder armor',90,'promoted_to_snapshots');`);
  await db.query(await metricMigrationSQL());await db.query(await readerMigrationSQL());await db.query(await functionHardeningSQL());await db.query(await accessBoundarySQL());await db.query(await internalViewAccessSQL());
  await db.query(await readFile('supabase/migrations/20260924095003_google_ads_atomic_evidence_v1.sql','utf8'));await db.query("notify pgrst, 'reload schema'");
 });
 service=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 await check('PostgREST exposes storage, reader and access service-only contracts',async()=>{
  let ready=false;for(let i=0;i<40;i++){if(await verifyMetricReaderBoundary(service)){ready=true;break;}await new Promise(r=>setTimeout(r,500));}
  assert.equal(ready,true,'Reader boundary must be visible through PostgREST');
  const r=await service.rpc('feya_commerce_keyword_metric_import_contract_v1');assert.equal(r.error,null);assert.equal(r.data,'atomic_keyword_metric_import_v1');
 });
 const password='T!'+randomBytes(24).toString('base64url'),adminEmail='owner-runtime@example.test',otherEmail='outsider-runtime@example.test';
 runtimeSecrets.push(password);
 const admin=await service.auth.admin.createUser({email:adminEmail,password,email_confirm:true});assert.equal(admin.error,null);
 const other=await service.auth.admin.createUser({email:otherEmail,password,email_confirm:true,user_metadata:{role:'admin',is_admin:true}});assert.equal(other.error,null);
 const outsider=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});assert.equal((await outsider.auth.signInWithPassword({email:otherEmail,password})).error,null);
 await check('Public signup stays disabled while pre-created email users can log in',async()=>{
  const c=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await c.auth.signUp({email:'signup-denied@example.test',password});assert.ok(result.error);assert.equal(result.error.code,'signup_disabled');
 });
 await check('Anon and signed-in outsider cannot call private RPCs or read receipts',async()=>{
  const payload=prepareMetricImport(previewDemandImport({rows:[input()]},new Date()),'fixture:denied');
  for(const c of [createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}}),outsider]){
   for(const name of [METRIC_IMPORT_RPC,'feya_commerce_metric_reader_boundary_health_v1','feya_commerce_metric_access_boundary_health_v1','feya_commerce_keyword_metric_import_contract_v1','feya_commerce_google_ads_import_contract_v1']){const r=await c.rpc(name,name===METRIC_IMPORT_RPC?{p_request_key:'f'.repeat(64),p_payload:payload}:{});assert.ok(r.error,'Private RPC must reject public roles');}
   const r=await c.from(receipts).select('*');assert.ok(r.error,'Private receipts must not be readable');
  }
  assert.deepEqual(await counts(),[1,1,0]);
 });
 await check('Real Data API denies raw, direct and downstream metric reads while service keeps queue access',async()=>{
  for(const name of [snapshots,'feya_commerce_v_query_cluster_review_queue_v1','feya_commerce_v_growth_signal_candidates_safe_v2']){
   for(const client of [createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}}),outsider]){const r=await client.from(name).select('*').limit(1);assert.ok(r.error);assert.ok([401,403].includes(r.status),'Known object must be denied, not absent');}
   const r=await service.from(name).select('*').limit(1);assert.equal(r.error,null,name);
  }
 });
 await check('Data API denies all ten related views to public roles while service preserves review and shortlist records',async()=>{
  for(const name of (await internalViewFixture()).downstream){
   for(const client of [createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}}),outsider]){const r=await client.from(name).select('*').limit(1);assert.ok(r.error);assert.ok([401,403].includes(r.status),name);}
   const r=await service.from(name).select('*').limit(1);assert.equal(r.error,null,name);if(!['feya_commerce_v_seo_keyword_metric_import_ready_v1','feya_commerce_v_seo_keyword_metric_import_validation_report_v1'].includes(name))assert.ok(r.data.length>0,name);
  }
  const shortlist=await service.from('feya_commerce_v_page_ownership_shortlist_v1').select('seo_page_id,shortlist_method');assert.equal(shortlist.error,null);
  assert.equal(shortlist.data[0].seo_page_id,'20000000-0000-4000-8000-000000000024');assert.equal(shortlist.data[0].shortlist_method,'lexical_candidate_retrieval_not_ownership');
 });
 const internalToken=randomUUID();runtimeSecrets.push(internalToken);
 googleProvider=await startGoogleProviderFixture();
 const internalRoutes=[['content-prechecks','POST'],['content-qa','POST'],['google-ads-health','GET'],['google-ads-keyword-metrics','GET'],['google-ads-keyword-metrics','POST'],['openai-health','GET'],['page-ownership-proposals','POST'],['query-cluster-proposals','POST'],['sco-shadow','POST'],['seo-keyword-cleanup','POST'],['seo-keyword-review','POST']];
 const env={...cleanEnv,FEYA_INTERNAL_API_TOKEN:internalToken,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:key,FEYA_ADMIN_AUTH_REQUIRED:'true',FEYA_ADMIN_ALLOWED_USER_IDS:admin.data.user.id,FEYA_METRIC_IMPORT_STORAGE_ENABLED:'true',FEYA_SEARCH_INDEXING_ENABLED:'false'};
 Object.assign(env,{FEYA_GOOGLE_ADS_IMPORT_ENABLED:'true',GOOGLE_ADS_CUSTOMER_ID:'1234567890',GOOGLE_ADS_CLIENT_ID:'synthetic-client-id',GOOGLE_ADS_CLIENT_SECRET:'synthetic-client-secret',GOOGLE_ADS_REFRESH_TOKEN:'synthetic-refresh-token',FEYA_TEST_GOOGLE_ORIGIN:googleProvider.origin,NODE_OPTIONS:'--require='+resolve('tests/runtime/google-fetch-preload.cjs')});
 console.log('Building the unchanged production Next application against the isolated stack.');
 await new Promise((res,rej)=>{const p=spawn('npm',['run','build'],{env,stdio:['ignore','pipe','pipe']});let log='';p.stdout.on('data',b=>{log+=b;});p.stderr.on('data',b=>{log+=b;});p.on('error',rej);p.on('exit',async code=>{await writeFile(join(out,'build.log'),log);code===0?res():rej(Error('Next build failed; see build.log'));});});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3000'],{env,stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>{appLog+=b;});server.stderr.on('data',b=>{appLog+=b;});
 let ready=false;for(let i=0;i<80;i++){try{const r=await fetch(base+'/admin/login');if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.equal(ready,true,'Next did not start');
 browser=await chromium.launch({headless:true});const anonymous=await browser.newContext();const anonymousPage=await anonymous.newPage();
 await check('Next denies anonymous API calls and redirects protected pages to login',async()=>{
  assert.equal((await api(anonymousPage,{rows:[input()]})).status,401);
  assert.equal((await api(anonymousPage,{dry_run:false,rows:[input()]})).status,401);
  await anonymousPage.goto(base+'/admin/seo-engine/keyword-metrics');assert.equal(new URL(anonymousPage.url()).pathname,'/admin/login');
 });
 await check('All 10 internal endpoints reject missing/wrong tokens before work, including OpenAI health',async()=>{
  const before=await counts();
  for(const [route,method] of internalRoutes){
   for(const headers of [{},{authorization:'Bearer invalid-fixture-token'}]){
    const r=await fetch(base+'/api/internal/'+route,{method,headers,...(method==='POST'?{body:'{'}:{})});
    assert.equal(r.status,401,route);assert.match(r.headers.get('cache-control'),/private.*no-store/);
    assert.deepEqual(await r.json(),{ok:false,code:'internal_auth_required'});
   }
  }
  assert.deepEqual(await counts(),before);
 });
 await check('Authenticated internal input rejects coercion and GET execution; health works without provider credentials',async()=>{
  const before=await counts(),headers={'x-feya-internal-token':internalToken};
  for(const [route,method] of internalRoutes.filter(([,method])=>method==='POST')){
   for(const body of ['null','{','{"dryRun":"false"}','{"dryRun":true,"dry_run":false}']){
    const r=await fetch(base+'/api/internal/'+route,{method,headers,body});assert.equal(r.status,400,route);
    assert.match(r.headers.get('cache-control'),/private.*no-store/);
   }
  }
  for(const [query,status] of [['?dry_run=false',405],['?dry_run=flase',400],['?dryRun=true&dryRun=false',400]]){
   const r=await fetch(base+'/api/internal/google-ads-keyword-metrics'+query,{headers});assert.equal(r.status,status);
   if(status===405)assert.equal(r.headers.get('allow'),'POST');
  }
  const health=await fetch(base+'/api/internal/openai-health',{headers:{authorization:'Bearer '+internalToken}});
  assert.equal(health.status,200);assert.match(health.headers.get('cache-control'),/private.*no-store/);
  const h=await health.json();assert.equal(h.authorizedForTestCall,true);assert.equal(h.openAiTest.attempted,false);
  assert.deepEqual(await counts(),before);
 });
 await check('Real browser login rejects outsider despite editable admin metadata',async()=>{
  await login(anonymousPage,otherEmail,password);await anonymousPage.waitForURL('**/admin/login?error=not_authorized');
  const r=await api(anonymousPage,{rows:[input()]});assert.equal(r.status,401);assert.match(r.cache,/no-store/);
 });
 await check('Previously authenticated outsider is still denied by middleware',async()=>{
  const jar=new Map();const client=createServerClient(url,anon,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(c=>jar.set(c.name,c.value))}});
  assert.equal((await client.auth.signInWithPassword({email:otherEmail,password})).error,null);
  const context=await browser.newContext();await context.addCookies([...jar].map(([name,value])=>({name,value,url:base})));
  const page=await context.newPage();const r=await api(page,{rows:[input()]});assert.equal(r.status,403);assert.match(r.cache,/no-store/);await context.close();
 });
 const owner=await browser.newContext();ownerPage=await owner.newPage();const pageErrors=[];ownerPage.on('pageerror',e=>pageErrors.push(e.message));
 await check('Allowlisted browser user logs in through the actual Server Action',async()=>{
  await login(ownerPage,adminEmail,password);await ownerPage.waitForURL('**/admin/seo-engine/keyword-metrics');await ownerPage.getByRole('heading',{name:'Keyword Metrics',exact:true}).waitFor();
  assert.equal(await ownerPage.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow, nocache');
  assert.equal(await ownerPage.getByText('Не удалось получить полную сводку наблюдений:',{exact:false}).count(),0);
 });
 await check('Disabled and absent Auth flags lock admin reads/writes even with an owner cookie; public routes remain available',async()=>{
  const before=await counts(),lockedBase='http://127.0.0.1:3001';
  for(const flag of ['false',undefined]){
   const lockedEnv={...env};delete lockedEnv.FEYA_INTERNAL_API_TOKEN;if(flag===undefined)delete lockedEnv.FEYA_ADMIN_AUTH_REQUIRED;else lockedEnv.FEYA_ADMIN_AUTH_REQUIRED=flag;
   const locked=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3001'],{env:lockedEnv,stdio:'ignore'});
   try{
    let ready=false;for(let i=0;i<60;i++){try{if((await fetch(lockedBase+'/admin/login')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready,'Locked-mode server must start');
    for(const client of [anonymousPage.request,ownerPage.request]){
     for(const path of ['/admin/company','/admin/seo-engine/keyword-metrics','/api/admin/seo-change-sets']){const r=await client.get(lockedBase+path);assert.equal(r.status(),503);assert.match(r.headers()['cache-control'],/private.*no-store/);}
     const r=await client.post(lockedBase+'/api/admin/review-events',{data:{}});assert.equal(r.status(),503);
    }
    for(const [route,method] of internalRoutes){
     const r=await fetch(lockedBase+'/api/internal/'+route,{method,headers:{authorization:'Bearer '+internalToken},...(method==='POST'?{body:'{'}:{})});
     assert.equal(r.status,503,route);assert.match(r.headers.get('cache-control'),/private.*no-store/);
     assert.deepEqual(await r.json(),{ok:false,code:'internal_auth_unavailable'});
    }
    assert.equal((await fetch(lockedBase+'/shop')).status,200);
    assert.deepEqual(await counts(),before);
   }finally{locked.kill('SIGTERM');await Promise.race([once(locked,'exit'),new Promise(r=>setTimeout(r,5000))]);if(locked.exitCode===null)locked.kill('SIGKILL');}
  }
 });
 await check('Existing cluster queue and Growth signal screens load through guarded server reads after public revocation',async()=>{
  for(const [path,heading] of [['/admin/seo-clusters','Группировка запросов'],['/admin/signals','Диагностика сигналов']]){
   const response=await ownerPage.goto(base+path);assert.equal(response.status(),200);await ownerPage.getByRole('heading',{name:heading,exact:true}).waitFor();
   assert.equal(await ownerPage.locator('.owner-error-code').count(),0,'Protected read must succeed, not render a data error');
   if(path==='/admin/seo-clusters'){
    const row=ownerPage.getByRole('row').filter({hasText:'synthetic shoulder armor'});assert.equal(await row.count(),1);await row.getByText('90',{exact:true}).waitFor();
   }else{
    const expected=await service.from('feya_commerce_v_growth_signal_candidates_safe_v2').select('signal_fingerprint');
    assert.equal(expected.error,null);assert.ok(expected.data.length>0);assert.equal(await ownerPage.locator('article.owner-list-row').count(),Math.min(20,expected.data.length));
   }
   assert.match(response.headers()['cache-control'],/no-store/);
  }
  await ownerPage.goto(base+'/admin/seo-engine/keyword-metrics');
 });
 await check('Existing keyword review screen loads its recommendation after public revocation; owner approval stays pending',async()=>{
  const r=await ownerPage.goto(base+'/admin/seo-keyword-review');assert.equal(r.status(),200);await ownerPage.getByRole('heading',{name:'Проверка ключевых слов',exact:true}).waitFor();
  const row=ownerPage.getByRole('row').filter({hasText:'synthetic review armor'});assert.equal(await row.count(),1);await row.getByText('Отложить',{exact:true}).waitFor();
  assert.equal((await db.query('select review_status from public.feya_commerce_seo_keyword_ai_cleanup_v1 where cleanup_id=820')).rows[0].review_status,'pending');
  await ownerPage.screenshot({path:join(out,'internal-keyword-review.png'),fullPage:true});
  await ownerPage.goto(base+'/admin/seo-engine/keyword-metrics');
 });
 const csv=metricRowsToCsv([input()]);
 await check('Existing CSV form calls real API, shows preview and never claims a save',async()=>{
  const before=await counts();await ownerPage.getByLabel('CSV или JSON с метриками').fill(csv);
  const response=ownerPage.waitForResponse(r=>r.url()===endpoint&&r.request().method()==='POST');
  await ownerPage.getByRole('button',{name:'Проверить данные',exact:true}).click();const r=await response;assert.equal(r.status(),200);
  const data=await r.json();assert.equal(data.writes_performed,0);assert.equal(data.observations.length,1);assert.equal(data.can_assign_primary,false);
  await ownerPage.getByText('Сохранено: 0.',{exact:false}).waitFor();assert.deepEqual(await counts(),before);
  assert.equal(await ownerPage.getByText('Импорт готов:',{exact:false}).count(),0);await ownerPage.evaluate(()=>window.scrollTo(0,0));await ownerPage.screenshot({path:join(out,'metric-preview.png'),fullPage:true});
 });
 await check('Malformed CSV and incomplete context are held without writes',async()=>{
  const before=await counts();const bad=await api(ownerPage,{dry_run:true,csv_text:'keyword\n"unclosed'});assert.equal(bad.status,422);
  const held=await api(ownerPage,{rows:[input({network:''})]});assert.equal(held.status,200);assert.equal(held.body.observations.length,0);assert.deepEqual(await counts(),before);
  const writeHeld=await api(ownerPage,{dry_run:false,rows:[input({network:''})],context_evidence_ref:'fixture:held'});assert.equal(writeHeld.status,422);assert.deepEqual(await counts(),before);
 });
 let saved;
 await check('Authenticated Next API → PostgREST → atomic receipt',async()=>{
  saved=await save([input()],'runtime-first');assert.equal(saved.ok,true,saved.error);assert.equal(saved.httpStatus,201);assert.deepEqual(await counts(),[2,2,1]);
  assert.equal(saved.can_assign_primary,false);assert.equal(saved.can_publish,false);assert.equal(saved.can_index,false);
  const r=await service.from(snapshots).select('*').eq('snapshot_id',saved.receipt.entries[0].snapshot_id).single();assert.equal(r.error,null);assert.equal(r.data.avg_monthly_searches,0);assert.equal(r.data.bid_currency_code,'UAH');assert.equal(r.data.data_freshness_status,'context_review_required');assert.equal(r.data.demand_evidence_json.evidence.fetched_at,input().last_checked);
  assert.match(legacySnapshotToDemandRow(r.data).parse_issues,/source_context_review_required/);
 });
 await check('Same-key retry retains string IDs; conflicting payload returns 409',async()=>{
  const replay=await save([input()],'runtime-first');assert.equal(replay.httpStatus,200);assert.deepEqual(replay.receipt.entries,saved.receipt.entries);
  const conflict=await save([input({avg_monthly_searches:'10'})],'runtime-first');assert.equal(conflict.httpStatus,409);assert.deepEqual(await counts(),[2,2,1]);
 });
 await check('Injected receipt failure rolls back all rows; same request recovers',async()=>{
  const before=await counts();await db.query(`create function public.runtime_fail_receipt() returns trigger language plpgsql as $$ begin raise exception 'runtime injected receipt failure'; end $$; create trigger runtime_fail_receipt before insert on public.${receipts} for each row execute function public.runtime_fail_receipt();`);
  try {const failed=await save([input({source_ref:'fixture:runtime-failure'})],'runtime-failure');assert.equal(failed.httpStatus,500);assert.deepEqual(await counts(),before);}
  finally{await db.query(`drop trigger runtime_fail_receipt on public.${receipts}; drop function public.runtime_fail_receipt();`);}
  const recovered=await save([input({source_ref:'fixture:runtime-failure'})],'runtime-failure');assert.equal(recovered.httpStatus,201);
 });
 await check('Reader drift closes PostgREST health and the enabled Next write path',async()=>{
  const before=await counts();await db.query('alter view public.feya_commerce_v_seo_metric_system_status_v1 set (security_barrier=true)');
  try{assert.equal(await verifyMetricReaderBoundary(service),false);assert.equal((await save([input({source_ref:'fixture:drift'})],'runtime-drift')).httpStatus,503);assert.deepEqual(await counts(),before);}
  finally{await db.query('alter view public.feya_commerce_v_seo_metric_system_status_v1 reset (security_barrier)');}
  assert.equal(await verifyMetricReaderBoundary(service),true);
 });
 await check('Downstream grant drift closes enabled Next writes without changing rows',async()=>{
  const before=await counts();await db.query('grant select on public.feya_commerce_v_growth_signal_candidates_safe_v2 to anon');
  try{assert.equal(await verifyMetricReaderBoundary(service),false);assert.equal((await save([input({source_ref:'fixture:access-drift'})],'runtime-access-drift')).httpStatus,503);assert.deepEqual(await counts(),before);}
  finally{await db.query('revoke select on public.feya_commerce_v_growth_signal_candidates_safe_v2 from anon');}
  assert.equal(await verifyMetricReaderBoundary(service),true);
 });
 await check('New internal-view grant drift closes actual Next metric writes without changing receipts',async()=>{
  const before=await counts();await db.query('grant select on public.feya_commerce_v_page_ownership_shortlist_v1 to anon');
  try{assert.equal(await verifyMetricReaderBoundary(service),false);assert.equal((await save([input({source_ref:'fixture:internal-view-drift'})],'internal-view-drift')).httpStatus,503);assert.deepEqual(await counts(),before);}
  finally{await db.query('revoke select on public.feya_commerce_v_page_ownership_shortlist_v1 from anon');}
  assert.equal(await verifyMetricReaderBoundary(service),true);
 });
 await check('Historical bank approvals, IDs and original metric remain unchanged',async()=>{
  const b=(await db.query('select review_status,score,avg_monthly_searches from public.seo_keyword_bank_v1 where id=$1',[bankId])).rows[0];assert.deepEqual(b,{review_status:'approved_draft',score:77,avg_monthly_searches:90});
  assert.equal((await db.query(`select avg_monthly_searches from public.${snapshots} where snapshot_id=900`)).rows[0].avg_monthly_searches,90);assert.deepEqual(pageErrors,[]);
  const robots=await (await fetch(base+'/robots.txt')).text();assert.match(robots,/Disallow: \//);
 });
 const googleEndpoint=base+'/api/internal/google-ads-keyword-metrics';
 const googleBody={dry_run:false,batch_id:googleBatch,...googleProvider.fixture.input};
 const googleCall=async(body=googleBody,key='runtime-google-request')=>{
  const response=await fetch(googleEndpoint,{method:'POST',headers:{'x-feya-internal-token':internalToken,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});
  return {status:response.status,body:await response.json(),cache:response.headers.get('cache-control')};
 };
 await seedGoogleBatch(db,googleProvider.fixture);
 await check('Google explicit preview is read-only; targeting/selection errors do not reach provider',async()=>{
  const before=await counts(),calls=googleProvider.state.calls.length;
  const preview=await googleCall({...googleBody,dry_run:true});assert.equal(preview.status,200);assert.deepEqual(preview.body.google_ads_request,googleProvider.fixture.plan.request);
  const invalid=await googleCall({...googleBody,keyword_ids:[googleBatch]});assert.equal(invalid.status,400);assert.equal(googleProvider.state.calls.length,calls);assert.deepEqual(await counts(),before);
 });
 await check('Google provider errors, missing account context and partial periods hold all writes',async()=>{
  const before=await counts();for(const [mode,status] of [['currency_failure',502],['provider_error',502],['partial',422]]){
   googleProvider.state.mode=mode;const r=await googleCall();assert.equal(r.status,status,JSON.stringify(r.body));assert.deepEqual(await counts(),before);
   assert.equal((await db.query('select batch_status from public.feya_metric_request_batch_v1 where metric_batch_id=$1',[googleBatch])).rows[0].batch_status,'ready');
  }googleProvider.state.mode='complete';
 });
 await check('Google boundary drift blocks provider execution and database writes',async()=>{
  const before=await counts(),calls=googleProvider.state.calls.length;await db.query('grant select on public.feya_commerce_v_page_ownership_shortlist_v1 to anon');
  try{assert.equal((await googleCall()).status,503);assert.deepEqual(await counts(),before);assert.equal(googleProvider.state.calls.length,calls);}
  finally{await db.query('revoke select on public.feya_commerce_v_page_ownership_shortlist_v1 from anon');}
 });
 await check('Google receipt failure rolls back metrics and statuses; real Next retry stores one grouped capture',async()=>{
  const before=await counts();await db.query(`create function public.runtime_fail_google() returns trigger language plpgsql as $$ begin raise exception 'synthetic Google receipt failure'; end $$; create trigger runtime_fail_google before insert on public.${receipts} for each row execute function public.runtime_fail_google();`);
  try{assert.equal((await googleCall()).status,503);assert.deepEqual(await counts(),before);assert.equal((await db.query('select batch_status from public.feya_metric_request_batch_v1 where metric_batch_id=$1',[googleBatch])).rows[0].batch_status,'ready');}
  finally{await db.query(`drop trigger runtime_fail_google on public.${receipts}; drop function public.runtime_fail_google();`);}
  const r=await googleCall();assert.equal(r.status,201,JSON.stringify(r.body));assert.equal(r.body.saved_rows,2);assert.equal(r.body.context_review_required,true);assert.equal(r.body.can_assign_primary,false);assert.equal(r.body.can_publish,false);assert.equal(r.body.can_index,false);assert.match(r.cache,/private.*no-store/);
  const rows=(await db.query(`select demand_evidence_json,data_freshness_status from public.${snapshots} where source_api='google_ads_api'`)).rows;assert.equal(rows.length,2);assert.ok(rows.every(r=>r.data_freshness_status==='context_review_required'));assert.equal(rows[0].demand_evidence_json.metadata.observation_group,rows[1].demand_evidence_json.metadata.observation_group);
  const calls=googleProvider.state.calls.length;const replay=await googleCall();assert.equal(replay.status,200);assert.deepEqual(replay.body.receipt.entries,r.body.receipt.entries);assert.equal(googleProvider.state.calls.length,calls);
  const conflict=await googleCall({...googleBody,keyword_ids:[googleProvider.fixture.input.keyword_ids[0]]});assert.equal(conflict.status,409);assert.equal(googleProvider.state.calls.length,calls);
  assert.deepEqual(googleProvider.state.errors,[]);report.google_ads_provider='synthetic_loopback_not_live_google';report.google_ads_atomic_runtime_pass=true;
 });
 await verifyVariantDraftRuntime({db,browser,ownerPage,env,out,check,report,service,outsider,url,anon,otherEmail,password});
 await check('Local advisor confirms hardened paths; other findings retained for review',async()=>{
  const findings=cli(['db','advisors','--local','--workdir',work,'--type','security','--fail-on','none','-o','json']);
  await writeFile(join(out,'security-advisors.json'),findings);report.local_advisors_executed=true;report.advisor_release_pass=false;
  const parsed=JSON.parse(findings);assert.ok(Array.isArray(parsed),'Expected CLI advisory list');
  const fixed=['feya_commerce_apply_seo_keyword_metric_import_v1','feya_commerce_fn_promote_keyword_metric_import_v1','feya_fn_apply_manual_keyword_metrics_v1','seo_keyword_bank_v1_set_updated_at'];
  assert.equal(parsed.filter(f=>f.name==='function_search_path_mutable'&&fixed.includes(f.metadata?.name)).length,0);
  report.function_path_advisor_pass=true;
  const protectedNames=new Set([...(await metricClosureFixture()).relations.filter(r=>r.in_metric_closure).map(r=>r.name),...(await internalViewFixture()).downstream]);
  assert.equal(parsed.filter(f=>f.name==='security_definer_view'&&protectedNames.has(f.metadata?.name)).length,0);
  assert.equal(parsed.filter(f=>f.name==='rls_disabled_in_public').length,0);
  report.metric_access_advisor_pass=true;report.internal_view_access_advisor_pass=true;report.metric_access_contract='metric_access_boundary_v2';
  report.advisor_counts=Object.fromEntries([...new Set(parsed.map(f=>f.name))].sort().map(name=>[name,parsed.filter(f=>f.name===name).length]));
 });
 await verifyApprovedContentRuntime({db,browser,ownerPage,env,out,check,report});
 report.next_write_path_verified=true;
 report.status='pass';await writeFile(join(out,'next.log'),appLog);
} catch(e){report.status='fail';report.error=String(e.message).slice(0,1000);console.error(report.error);process.exitCode=1;}
finally{
 for(const secret of runtimeSecrets)appLog=appLog.replaceAll(secret,'[redacted]');
 await writeFile(join(out,'next.log'),appLog);
 if(report.status==='fail'&&browser){
  const pages=browser.contexts().flatMap(c=>c.pages());const diagnostic=[];
  for(const [index,page] of pages.entries()){
   const u=new URL(page.url());let text=(await page.locator('body').innerText().catch(()=>''));for(const secret of runtimeSecrets)text=text.replaceAll(secret,'[redacted]');
   diagnostic.push({path:u.pathname,error:u.searchParams.get('error'),text:text.slice(0,4000)});
   for(const field of await page.locator('input[type="password"]').all())await field.fill('').catch(()=>{});
   await page.screenshot({path:join(out,`failure-page-${index}.png`),fullPage:true}).catch(()=>{});
  }
  await writeFile(join(out,'browser-diagnostic.json'),JSON.stringify(diagnostic,null,2));
  console.error('Runtime failure diagnostics: '+JSON.stringify({pages:diagnostic,server:appLog.slice(-6000)}));
 }
 await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 await browser?.close();if(server){server.kill('SIGTERM');await Promise.race([once(server,'exit'),new Promise(r=>setTimeout(r,5000))]);if(server.exitCode===null)server.kill('SIGKILL');}
 await googleProvider?.close();await db?.end();if(started){try{cli(['stop','--workdir',work,'--no-backup']);}catch{console.error('Ephemeral stack cleanup needs runner teardown.');}}
 if(work)await rm(work,{recursive:true,force:true});
}
