import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildGrowthHttpArchiveCandidate} from '../../lib/growthHttpArchiveCandidate.ts';

const manifest=JSON.parse(readFileSync(
 'tests/runtime/fixtures/phase12-wave-a-v12-production-crawl.json','utf8'));
const zipSha='198ba252a30b36471795aceefa5eecedf1364fd7fa440e628e9fbae5557d9ae7';
const commit='533bc8e40f2fd1a9464495134459afde9308bd7d';
const run='39180879535';
function fixture(){
 const id=manifest.release.id,hash=manifest.release.hash;
 const product=manifest.productNoindexPaths.slice(0,24);
 const ix=manifest.indexCandidates;
 return {
  crawl:{
   contract:'phase12_production_origin_crawl_evidence_v3',
   origin:'https://thefeya.com',release:manifest.release,
   indexCandidates:ix.map((path:string)=>({
    path,status:200,noindex:false,canonical:'https://thefeya.com'+path,
    pass:true,error:null,
   })),
   productNoindex:{observations:product.map((path:string)=>({
    path,status:200,noindex:true,canonical:'https://thefeya.com'+path,
    pass:true,error:null,
   }))},
  },
  revision:{
   contract:'phase13_exact_production_sha_proof_v1',
   enforced:true,matched:true,expectedSha:commit,lastObservedSha:commit,lastStatus:200,
  },
  g2c:{
   schema:'FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1',
   verdict:'PRODUCTION_HTTP_OBSERVED',evidenceLevel:'L0_OBSERVATION',
   origin:'https://thefeya.com',deploymentCommitSha:commit,
   release:{id,code:manifest.release.code,version:12,hash},
   observation:{startedAt:'2026-10-19T00:28:28.098Z',
     finishedAt:'2026-10-19T00:28:39.990Z'},
   coverage:{
    indexIntent:{expected:18,verified:18},
    productNoindex:{expected:207,sampled:24,perPathVerified:24,
     untested:183,proof:'PER_PATH_CI_RECEIPT'},
   },
   source:{repository:'THEFEYA/feya-commerce',
    workflowRunId:run,gitEvent:'push',gitRef:'refs/heads/main',
    artifactPayloadSha256:'a'.repeat(64),sourceType:'EXTERNAL_HTTP_GITHUB_CI'},
   reasonCodes:[],googleIndexationConfirmed:false,autonomousReviewerExecuted:false,
   independentHumanQaConfirmed:false,fullProductNoindexCoverageConfirmed:false,
   measuredBusinessOutcome:false,caseMutationAllowed:false,
   sourceHealthPromoted:false,
  },
 };
}
const ref={artifactId:'12155269341',zipSha256:zipSha};
const c=()=>structuredClone(fixture());

test('real Search Release v12 fixture yields exact 18 / 24 URL evidence with 183 untested',()=>{
 const x=buildGrowthHttpArchiveCandidate(c(),ref);
 assert.equal(x.payload.contract,'FEYA_GROWTH_HTTP_ARCHIVE_V1');
 assert.equal(x.payload.indexRows.length,18);
 assert.equal(x.payload.productRows.length,24);
 assert.equal((x.payload.g2c.coverage as {productNoindex:{untested:number}}).productNoindex.untested,183);
 assert.equal(x.payload.source.runId,run);
 assert.equal(x.payload.source.zipSha256,zipSha);
 assert.match(x.candidateUtf8Sha256,/^[a-f0-9]{64}$/);
 assert.equal(x.dbInserted,false);
 assert.equal(x.independentQaPassed,false);
 assert.equal(x.assessment,'UNVERIFIED_OFFLINE_CANDIDATE');
});
test('same input generates deterministic offline digest, not a trusted signature',()=>{
 const a=buildGrowthHttpArchiveCandidate(c(),ref);
 const b=buildGrowthHttpArchiveCandidate(c(),ref);
 assert.equal(a.candidateUtf8Sha256,b.candidateUtf8Sha256);
 const modified=c();modified.crawl.indexCandidates.reverse();
 const d=buildGrowthHttpArchiveCandidate(modified,ref);
 assert.notEqual(a.candidateUtf8Sha256,d.candidateUtf8Sha256);
});
test('preview run, fake origin and fake Google indexation or human review are refused',()=>{
 const cases:Array<(x:any)=>void>=[
  x=>{x.g2c.source.gitEvent='pull_request';},
  x=>{x.g2c.source.gitRef='refs/pull/185/merge';},
  x=>{x.g2c.source.repository='FORK/feya-commerce';},
  x=>{x.g2c.origin='https://other.example';},
  x=>{x.g2c.googleIndexationConfirmed=true;},
  x=>{x.g2c.independentHumanQaConfirmed=true;},
  x=>{x.g2c.caseMutationAllowed=true;},
  x=>{x.revision.lastObservedSha='f'.repeat(40);},
  x=>{x.crawl.release.version=13;},
 ];
 for(const edit of cases){const x=c();edit(x);
  assert.throws(()=>buildGrowthHttpArchiveCandidate(x,ref));}
});
test('partial, duplicate, wrong canonical or timed-out rows cannot be archived as success',()=>{
 const cases:Array<(x:any)=>void>=[
  x=>{x.crawl.productNoindex.observations.pop();},
  x=>{x.crawl.indexCandidates[0].canonical='https://thefeya.com/wrong';},
  x=>{x.crawl.productNoindex.observations[0].status=404;},
  x=>{x.crawl.productNoindex.observations[0].noindex=false;},
  x=>{x.crawl.productNoindex.observations[0].path=
    x.crawl.productNoindex.observations[1].path;},
  x=>{x.crawl.productNoindex.observations[0].pass=false;},
  x=>{x.crawl.productNoindex.observations[0].error='network_timeout';},
 ];
 for(const edit of cases){const x=c();edit(x);
  assert.throws(()=>buildGrowthHttpArchiveCandidate(x,ref));}
});
test('missing unique source IDs or ZIP digest fails, never guesses a value',()=>{
 const f=c();
 for(const r of [
  {artifactId:'',zipSha256:zipSha},
  {artifactId:'0',zipSha256:zipSha},
  {artifactId:'12155269341',zipSha256:'garbage'},
  {artifactId:'12155269341',zipSha256:'A'.repeat(64)},
 ])assert.throws(()=>buildGrowthHttpArchiveCandidate(f,r));
});
test('local archival builder has no Supabase secrets, client write action or network calls',()=>{
 const code=readFileSync('scripts/build-growth-http-archive-candidate.ts','utf8');
 assert.match(code,/writeFile\(file/);
 assert.match(code,/flag:'wx'/);
 assert.doesNotMatch(code,/supabase\.|\.rpc\(|\.insert\(|\.upsert\(|fetch\(|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});
