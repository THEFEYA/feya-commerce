import {readFile,mkdir,writeFile} from 'node:fs/promises';

const manifest=JSON.parse(await readFile(new URL('./fixtures/phase12-wave-a-v12-production-crawl.json',import.meta.url),'utf8'));
const origin=new URL(manifest.release.targetOrigin).origin;
const path='/api/production-revision';
const enforced=process.env.PHASE13_REQUIRE_PRODUCTION_SHA==='true';
const expected=(process.env.PHASE13_EXPECTED_PRODUCTION_SHA||'').trim().toLowerCase();
const shaPattern=/^[a-f0-9]{40}$/;
const startedAt=new Date().toISOString();
const started=Date.now();
const maxWaitMs=240000,intervalMs=10000,timeoutMs=8000;
let attempts=0,matched=false,lastReason='not_checked',lastStatus=null,lastObservedSha=null;
const report={
  contract:'phase13_exact_production_sha_proof_v1',origin,path,
  startedAt,expectedSha:enforced?expected:null,enforced,matched:false,
  attempts:0,elapsedMs:0,lastStatus:null,lastReason:null,lastObservedSha:null,
};

const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
async function oneCheck(){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(new URL(path,origin),{
      redirect:'manual',
      cache:'no-store',
      signal:controller.signal,
      headers:{'accept':'application/json','cache-control':'no-cache','user-agent':'TheFEYA-release-provenance/1.0'},
    });
    lastStatus=response.status;
    if(response.status!==200){lastReason='not_yet_ready_or_unavailable';return false;}
    const text=await response.text();
    if(text.length>2048){lastReason='oversize_response';return false;}
    let data;
    try{data=JSON.parse(text);}catch{lastReason='invalid_json';return false;}
    const sha=typeof data?.sha==='string'?data.sha.toLowerCase():'';
    if(data?.contract!=='feya_production_revision_v1'||data?.production!==true||!shaPattern.test(sha)){
      lastReason='not_validated_production_origin';return false;
    }
    lastObservedSha=sha;
    if(sha!==expected){lastReason='old_production_revision';return false;}
    lastReason='matching_deployed_sha';
    return true;
  }catch(error){
    lastReason=error?.name==='AbortError'?'origin_timeout':'origin_fetch_failed';
    return false;
  }finally{clearTimeout(timeout);controller.abort();}
}

if(!enforced){
  lastReason='PR_advisory_no_deployment_needed';
}else if(!shaPattern.test(expected)){
  lastReason='missing_or_invalid_expected_git_sha';
}else{
  do {
    attempts+=1;
    matched=await oneCheck();
    if(matched)break;
    if(Date.now()-started+intervalMs>=maxWaitMs)break;
    await sleep(intervalMs);
  }while(Date.now()-started<maxWaitMs);
}
Object.assign(report,{
  finishedAt:new Date().toISOString(),matched,attempts,
  elapsedMs:Date.now()-started,lastStatus,lastReason,lastObservedSha,
});
await mkdir('runtime-results',{recursive:true});
await writeFile('runtime-results/phase13-production-revision-gate.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({contract:report.contract,enforced,matched,attempts,elapsedMs:report.elapsedMs,lastStatus,lastReason,expectedSha:report.expectedSha,observedSha:lastObservedSha},null,2));
if(enforced&&!matched){
  console.error('Exact Production SHA was not served after the bounded wait; refusing to validate an older deployment as the new release.');
  process.exitCode=1;
}
// Standalone CI subprocess: do not keep sockets open after proof is written.
process.exit(process.exitCode??0);
