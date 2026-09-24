/** Ephemeral local Supabase + real Next production server. No linked/remote project. */
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import pg from 'pg';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';
import {observedMetricSchemaSQL,metricMigrationSQL} from '../search-db/helpers/observed-metric-schema.mjs';
import {readerBoundarySchemaSQL,readerMigrationSQL} from '../search-db/helpers/observed-reader-boundary.mjs';
import {previewDemandImport} from '../../lib/searchDemandImportPreview.ts';
import {prepareMetricImport,importMetricsAtomically,verifyMetricReaderBoundary,METRIC_IMPORT_RUNTIME_VERIFIED,METRIC_IMPORT_RPC} from '../../lib/searchMetricAtomicStorage.ts';
import {legacySnapshotToDemandRow} from '../../lib/searchLegacyDemandAdapter.ts';
import {metricRowsToCsv} from '../../lib/searchMetricCsv.ts';
const root=process.cwd(),out=resolve('runtime-results');
const report={contract:'metric_runtime_proof_v1',commit:process.env.GITHUB_SHA||null,environment:'ephemeral_loopback_supabase',production_connected:false,next_write_path_verified:false,checks:[],limitations:['Observed direct schema with typed upstream boundaries; not full production restore.','Hosted staging, platform advisors and production activation remain separate.']};
const base='http://127.0.0.1:3000',endpoint=base+'/api/admin/seo-engine/keyword-metrics/import';
const bankId='10000000-0000-4000-8000-000000000001';
const staging='feya_commerce_seo_keyword_metric_import_staging_v1',snapshots='feya_commerce_seo_keyword_metric_snapshots_v1',receipts='feya_commerce_seo_metric_import_receipts_v1';
let work,db,browser,server,started=false,service,ownerPage;
const cleanEnv=Object.fromEntries(Object.entries(process.env).filter(([k])=>!(/^(SUPABASE_|NEXT_PUBLIC_|FEYA_|OPENAI_|VERCEL_)/.test(k))));
function cli(args){return execFileSync('supabase',args,{encoding:'utf8',env:cleanEnv,maxBuffer:20*1024*1024,timeout:600000});}
function local(value,protocols,port){const u=new URL(value);assert.ok(['127.0.0.1','localhost'].includes(u.hostname),'Loopback required');assert.ok(protocols.includes(u.protocol));assert.equal(u.port,String(port));return u;}
async function check(name,fn){try{await fn();report.checks.push({name,status:'pass'});console.log('PASS '+name);}catch(e){report.checks.push({name,status:'fail',error:String(e.message).slice(0,700)});throw e;}}
async function counts(){return Promise.all([staging,snapshots,receipts].map(async t=>(await db.query(`select count(*)::int n from public.${t}`)).rows[0].n));}
function input(patch={}) {const now=new Date(),day=new Date(now.getTime()-86400000).toISOString().slice(0,10);return {keyword:'synthetic shoulder armor',metric_source:'google_ads_csv',source_ref:'fixture:runtime-metric',region:'US',language:'en',network:'GOOGLE_SEARCH',period_start:new Date(Date.UTC(now.getUTCFullYear()-1,now.getUTCMonth(),1)).toISOString().slice(0,10),period_end:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),0)).toISOString().slice(0,10),last_checked:day,avg_monthly_searches:'0',competition:'LOW',competition_index:'12',low_bid:'1.25',high_bid:'2.5',bid_currency_code:'UAH',keyword_bank_id:bankId,...patch};}
async function api(page,body,key){const r=await page.request.post(endpoint,{data:body,headers:key?{'Idempotency-Key':key}:{}});return {status:r.status(),body:await r.json(),cache:r.headers()['cache-control']};}
async function save(rows,key){
 if(METRIC_IMPORT_RUNTIME_VERIFIED){const r=await api(ownerPage,{dry_run:false,rows,context_evidence_ref:'fixture:runtime-context'},key);return {...r.body,httpStatus:r.status};}
 return importMetricsAtomically(service,prepareMetricImport(previewDemandImport({rows},new Date()),'fixture:runtime-context'),key);
}
async function login(page,email,password){await page.goto(base+'/admin/login?next=/admin/seo-engine/keyword-metrics');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Пароль',{exact:true}).fill(password);await page.getByRole('button',{name:'Войти',exact:true}).click();}
await mkdir(out,{recursive:true});
try {
 assert.ok(!process.env.SUPABASE_ACCESS_TOKEN&&!process.env.SUPABASE_SERVICE_ROLE_KEY,'No cloud credentials allowed in runtime job');
 execFileSync('docker',['info'],{stdio:'ignore'});
 work=await mkdtemp(join(tmpdir(),'feya-metric-runtime-'));
 cli(['init','--workdir',work,'--yes']);
 const configFile=join(work,'supabase/config.toml');let config=await readFile(configFile,'utf8');
 config=config.replace(/^project_id = .*$/m,'project_id = "feya-metric-runtime"');
 // Keep real Auth/API; no email is sent and public signup is disabled.
 config=config.replace(/enable_signup = true/g,'enable_signup = false');
 await writeFile(configFile,config);
 console.log('Starting isolated Supabase services.');
 started=true;cli(['start','--workdir',work,'--exclude','realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor']);
 const status=JSON.parse(cli(['status','--workdir',work,'-o','json']));
 const url=status.API_URL||status.api_url,anon=status.ANON_KEY||status.anon_key,key=status.SERVICE_ROLE_KEY||status.service_role_key,dbURL=status.DB_URL||status.db_url;
 local(url,['http:'],54321);const dbLocation=local(dbURL,['postgresql:','postgres:'],54322);assert.equal(dbLocation.pathname,'/postgres');assert.ok(anon&&key);
 db=new pg.Client({connectionString:dbURL,statement_timeout:30000,connectionTimeoutMillis:5000});await db.connect();
 await check('Fresh isolated database; real Supabase roles exist',async()=>{
  assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);
  assert.equal((await db.query("select count(*)::int n from pg_roles where rolname in ('anon','authenticated','service_role','authenticator')")).rows[0].n,4);
 });
 await check('Observed metric schema and both unapplied migrations restore in Supabase',async()=>{
  await db.query(await observedMetricSchemaSQL({existingSupabaseRoles:true}));await db.query(await readerBoundarySchemaSQL());
  await db.query(`insert into public.seo_keyword_bank_v1(id,keyword,keyword_norm,bank_bucket,review_status,score,avg_monthly_searches) values($1,'synthetic shoulder armor','synthetic shoulder armor','product','approved_draft',77,90)`,[bankId]);
  await db.query(`insert into public.feya_commerce_seo_keyword_master_v1(keyword_id,keyword,keyword_norm,keyword_word_count,priority_tier,validation_priority) values(800,'synthetic shoulder armor','synthetic shoulder armor',3,'test','test');
   insert into public.${snapshots}(snapshot_id,keyword_norm,source_api,geo,language,avg_monthly_searches,data_freshness_status) values(900,'synthetic shoulder armor','google_ads_csv','US','en',90,'fresh_manual_import');
   insert into public.${staging}(import_row_id,batch_code,keyword_norm,avg_monthly_searches,import_status) values(900,'legacy-fixture','synthetic shoulder armor',90,'promoted_to_snapshots');`);
  await db.query(await metricMigrationSQL());await db.query(await readerMigrationSQL());await db.query("notify pgrst, 'reload schema'");
 });
 service=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 await check('PostgREST exposes both exact service-only contracts',async()=>{
  let ready=false;for(let i=0;i<40;i++){if(await verifyMetricReaderBoundary(service)){ready=true;break;}await new Promise(r=>setTimeout(r,500));}
  assert.equal(ready,true,'Reader boundary must be visible through PostgREST');
  const r=await service.rpc('feya_commerce_keyword_metric_import_contract_v1');assert.equal(r.error,null);assert.equal(r.data,'atomic_keyword_metric_import_v1');
 });
 const password='T!'+randomBytes(24).toString('base64url'),adminEmail='owner-runtime@example.test',otherEmail='outsider-runtime@example.test';
 const admin=await service.auth.admin.createUser({email:adminEmail,password,email_confirm:true});assert.equal(admin.error,null);
 const other=await service.auth.admin.createUser({email:otherEmail,password,email_confirm:true,user_metadata:{role:'admin',is_admin:true}});assert.equal(other.error,null);
 const outsider=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});assert.equal((await outsider.auth.signInWithPassword({email:otherEmail,password})).error,null);
 await check('Anon and signed-in outsider cannot call private RPCs or read receipts',async()=>{
  const payload=prepareMetricImport(previewDemandImport({rows:[input()]},new Date()),'fixture:denied');
  for(const c of [createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}}),outsider]){
   for(const name of [METRIC_IMPORT_RPC,'feya_commerce_metric_reader_boundary_health_v1','feya_commerce_keyword_metric_import_contract_v1']){const r=await c.rpc(name,name===METRIC_IMPORT_RPC?{p_request_key:'f'.repeat(64),p_payload:payload}:{});assert.ok(r.error,'Private RPC must reject public roles');}
   const r=await c.from(receipts).select('*');assert.ok(r.error,'Private receipts must not be readable');
  }
  assert.deepEqual(await counts(),[1,1,0]);
 });
 const env={...cleanEnv,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_ANON_KEY:anon,SUPABASE_SERVICE_ROLE_KEY:key,FEYA_ADMIN_AUTH_REQUIRED:'true',FEYA_ADMIN_ALLOWED_USER_IDS:admin.data.user.id,FEYA_METRIC_IMPORT_STORAGE_ENABLED:'true',FEYA_SEARCH_INDEXING_ENABLED:'false'};
 console.log('Building the unchanged production Next application against the isolated stack.');
 await new Promise((res,rej)=>{const p=spawn('npm',['run','build'],{env,stdio:['ignore','pipe','pipe']});let log='';p.stdout.on('data',b=>{log+=b;});p.stderr.on('data',b=>{log+=b;});p.on('error',rej);p.on('exit',async code=>{await writeFile(join(out,'build.log'),log);code===0?res():rej(Error('Next build failed; see build.log'));});});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3000'],{env,stdio:['ignore','pipe','pipe']});let appLog='';server.stdout.on('data',b=>{appLog+=b;});server.stderr.on('data',b=>{appLog+=b;});
 let ready=false;for(let i=0;i<80;i++){try{const r=await fetch(base+'/admin/login');if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.equal(ready,true,'Next did not start');
 browser=await chromium.launch({headless:true});const anonymous=await browser.newContext();const anonymousPage=await anonymous.newPage();
 await check('Next denies anonymous API calls and redirects protected pages to login',async()=>{
  assert.equal((await api(anonymousPage,{rows:[input()]})).status,401);
  assert.equal((await api(anonymousPage,{dry_run:false,rows:[input()]})).status,401);
  await anonymousPage.goto(base+'/admin/seo-engine/keyword-metrics');assert.equal(new URL(anonymousPage.url()).pathname,'/admin/login');
 });
 await check('Real browser login rejects outsider despite editable admin metadata',async()=>{
  await login(anonymousPage,otherEmail,password);await anonymousPage.waitForURL('**/admin/login?error=not_authorized');
  const r=await api(anonymousPage,{rows:[input()]});assert.equal(r.status,403);assert.match(r.cache,/no-store/);
 });
 const owner=await browser.newContext();ownerPage=await owner.newPage();const pageErrors=[];ownerPage.on('pageerror',e=>pageErrors.push(e.message));
 await check('Allowlisted browser user logs in through the actual Server Action',async()=>{
  await login(ownerPage,adminEmail,password);await ownerPage.waitForURL('**/admin/seo-engine/keyword-metrics');await ownerPage.getByRole('heading',{name:'Keyword Metrics',exact:true}).waitFor();
  assert.equal(await ownerPage.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow, nocache');
  assert.equal(await ownerPage.getByText('Не удалось получить полную сводку наблюдений:',{exact:false}).count(),0);
 });
 const csv=metricRowsToCsv([input()]);
 await check('Existing CSV form calls real API, shows preview and never claims a save',async()=>{
  const before=await counts();await ownerPage.getByLabel('CSV или JSON с метриками').fill(csv);
  const response=ownerPage.waitForResponse(r=>r.url()===endpoint&&r.request().method()==='POST');
  await ownerPage.getByRole('button',{name:'Проверить данные',exact:true}).click();const r=await response;assert.equal(r.status(),200);
  const data=await r.json();assert.equal(data.writes_performed,0);assert.equal(data.observations.length,1);assert.equal(data.can_assign_primary,false);
  await ownerPage.getByText('Сохранено: 0.',{exact:false}).waitFor();assert.deepEqual(await counts(),before);
  assert.equal(await ownerPage.getByText('Импорт готов:',{exact:false}).count(),0);await ownerPage.screenshot({path:join(out,'metric-preview.png'),fullPage:true});
 });
 await check('Malformed CSV and incomplete context are held without writes',async()=>{
  const before=await counts();const bad=await api(ownerPage,{dry_run:true,csv_text:'keyword\n"unclosed'});assert.equal(bad.status,422);
  const held=await api(ownerPage,{rows:[input({network:''})]});assert.equal(held.status,200);assert.equal(held.body.observations.length,0);assert.deepEqual(await counts(),before);
 });
 let saved;
 await check(METRIC_IMPORT_RUNTIME_VERIFIED?'Authenticated Next API → PostgREST → atomic receipt':'PostgREST → atomic receipt; Next write gate remains closed',async()=>{
  if(!METRIC_IMPORT_RUNTIME_VERIFIED){const closed=await api(ownerPage,{dry_run:false,rows:[input()]});assert.equal(closed.status,423);assert.ok(closed.body.blockers.includes('authenticated_metric_import_runtime_not_verified'));}
  saved=await save([input()],'runtime-first');assert.equal(saved.ok,true,saved.error);assert.equal(saved.httpStatus,201);assert.deepEqual(await counts(),[2,2,1]);
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
  try{assert.equal(await verifyMetricReaderBoundary(service),false);if(METRIC_IMPORT_RUNTIME_VERIFIED)assert.equal((await save([input({source_ref:'fixture:drift'})],'runtime-drift')).httpStatus,503);assert.deepEqual(await counts(),before);}
  finally{await db.query('alter view public.feya_commerce_v_seo_metric_system_status_v1 reset (security_barrier)');}
  assert.equal(await verifyMetricReaderBoundary(service),true);
 });
 await check('Historical bank approvals, IDs and original metric remain unchanged',async()=>{
  const b=(await db.query('select review_status,score,avg_monthly_searches from public.seo_keyword_bank_v1 where id=$1',[bankId])).rows[0];assert.deepEqual(b,{review_status:'approved_draft',score:77,avg_monthly_searches:90});
  assert.equal((await db.query(`select avg_monthly_searches from public.${snapshots} where snapshot_id=900`)).rows[0].avg_monthly_searches,90);assert.deepEqual(pageErrors,[]);
  const robots=await (await fetch(base+'/robots.txt')).text();assert.match(robots,/Disallow: \//);
 });
 report.next_write_path_verified=METRIC_IMPORT_RUNTIME_VERIFIED;
 report.status='pass';await writeFile(join(out,'next.log'),appLog);
} catch(e){report.status='fail';report.error=String(e.message).slice(0,1000);console.error(report.error);process.exitCode=1;}
finally{
 await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 await browser?.close();if(server){server.kill('SIGTERM');await Promise.race([once(server,'exit'),new Promise(r=>setTimeout(r,5000))]);if(server.exitCode===null)server.kill('SIGKILL');}
 await db?.end();if(started){try{cli(['stop','--workdir',work,'--no-backup']);}catch{console.error('Ephemeral stack cleanup needs runner teardown.');}}
 if(work)await rm(work,{recursive:true,force:true});
}
