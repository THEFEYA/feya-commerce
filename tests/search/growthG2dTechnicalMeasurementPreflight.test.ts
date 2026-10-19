import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  evaluateG2dTechnicalMeasurement, G2D_METRIC_CANDIDATE,
  type G2dInput, type G2dSource,
} from '../../lib/growthG2dTechnicalMeasurementPreflight.ts';

const manifest=JSON.parse(readFileSync(
  'tests/runtime/fixtures/phase12-wave-a-v12-production-crawl.json','utf8'));
const SHA='56208feed93a7f3f0f4984744203885cc7072a6b';
const ORIGIN='https://thefeya.com';
const now='2026-10-19T00:30:00.000Z';
const observedAt='2026-10-18T22:33:48.000Z';
const baselineAt='2026-10-17T22:33:48.000Z';
const A='a'.repeat(64), B='b'.repeat(64);

function mkSource(cohort:'ALL_INDEX_INTENT_URLS'|'PINNED_PRODUCT_NOINDEX_SAMPLE',
  at=observedAt,runId='39172621119'):G2dSource {
  const ix=manifest.indexCandidates as string[],product=manifest.productNoindexPaths as string[];
  const sample=product.slice(0,24);
  return {
    envelope:{
      schema:'FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1',verdict:'PRODUCTION_HTTP_OBSERVED',
      evidenceLevel:'L0_OBSERVATION',origin:ORIGIN,
      deploymentCommitSha:SHA,
      release:{
        id:manifest.release.id,code:manifest.release.code,
        version:manifest.release.version,hash:manifest.release.hash,
      },
      observation:{startedAt:new Date(Date.parse(at)-10000).toISOString(),finishedAt:at},
      coverage:{
        indexIntent:{expected:ix.length,verified:ix.length},
        productNoindex:{
          expected:product.length,sampled:24,reportedPassed:24,perPathVerified:24,
          untested:product.length-24,proof:'PER_PATH_CI_RECEIPT',
        },
      },
      source:{
        repository:'THEFEYA/feya-commerce',workflowRunId:runId,
        gitEvent:'push',gitRef:'refs/heads/main',artifactPayloadSha256:A,
        sourceType:'EXTERNAL_HTTP_GITHUB_CI',
      },
      reasonCodes:[],
    },
    indexIntentPaths:[...ix],
    productNoindexManifestPaths:[...product],
    productNoindexSamplePaths:sample,
    indexHttpRows:ix.map(path=>({
      path,status:200,noindex:false,canonical:new URL(path,ORIGIN).toString(),
      pass:true,error:null,
    })),
    productHttpRows:cohort==='PINNED_PRODUCT_NOINDEX_SAMPLE'
      ?sample.map(path=>({
        path,status:200,noindex:true,canonical:new URL(path,ORIGIN).toString(),
        pass:true,error:null,
      })) : null,
    attestation:{
      repository:'THEFEYA/feya-commerce',event:'push',ref:'refs/heads/main',
      runId,headSha:SHA,artifactId:12152039988,artifactSha256:B,
      jobCompleted:true,jobConclusion:'success',independentlyVerified:true,
    },
  };
}
function mkInput(cohort:G2dInput['cohort']='ALL_INDEX_INTENT_URLS'):G2dInput {
  return {
    cohort,current:mkSource(cohort),
    authority:{
      activeReleaseCount:1,origin:ORIGIN,
      releaseId:manifest.release.id,
      releaseCode:manifest.release.code,releaseVersion:manifest.release.version,
      releaseHash:manifest.release.hash,
      approvedProductBindings:manifest.productNoindexPaths.length,
      indexIntentPaths:[...manifest.indexCandidates],
      productNoindexPaths:[...manifest.productNoindexPaths],
    },
    metric:null,
    policy:{
      approvedMaxAgeHours:48,
      interventionStartedAt:null,lockedBeforeInterventionAt:null,
      reviewerConfirmed:false,
    },
    now,
  };
}
const metric = {
  metric_code:G2D_METRIC_CANDIDATE,
  metric_state:'AVAILABLE_WITH_LIMITATIONS',
  owner_role:'GMEL',
  authority_source:'FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1',
  version_no:1,
};
function approved(cohort:G2dInput['cohort']='ALL_INDEX_INTENT_URLS') {
  const x=mkInput(cohort);x.metric=metric;x.policy.reviewerConfirmed=true;
  return x;
}

test('actual v12 membership is used, and missing Metric Registry blocks readiness',()=>{
  const r=evaluateG2dTechnicalMeasurement(mkInput());
  assert.equal(r.state,'METRIC_GOVERNANCE_REQUIRED');
  assert.equal(r.current.denominator,18);
  assert.equal(r.current.confirmedPass,18);
  assert.equal(r.current.confirmedMismatch,0);
  assert.equal(r.current.unknownCount,0);
  assert.equal(r.current.mismatchRate,0); // derived only from 18 individually verified rows
  assert.equal(r.current.releaseHash,manifest.release.hash);
  assert.equal(r.evidenceLevel,'L0_OBSERVATION');
  assert.ok(r.reasonCodes.includes('METRIC_REGISTRY_GOVERNANCE_MISSING'));
  assert.ok(r.reasonCodes.includes('INDEPENDENT_REVIEW_NOT_ATTESTED'));
  assert.match(r.current.pathSetHash!,/^[a-f0-9]{64}$/);
  assert.equal(r.canLockMeasurementSpec,false);
  assert.equal(r.canWriteOutcome,false);
  assert.equal(r.validatedWin,false);
});

test('read-only baseline is eligible only after metric + independent source review',()=>{
  const withoutReview=mkInput();withoutReview.metric=metric;
  assert.equal(evaluateG2dTechnicalMeasurement(withoutReview).state,
    'SOURCE_OBSERVABLE_REVIEW_REQUIRED');
  const r=evaluateG2dTechnicalMeasurement(approved());
  assert.equal(r.state,'SPEC_DESIGN_ELIGIBLE');
  assert.equal(r.evidenceLevel,'L0_OBSERVATION');
  for(const k of ['canLockMeasurementSpec','canWriteOutcome','independentQaPassed',
    'googleIndexationConfirmed','revenueOrConversionMeasured','validatedWin'] as const){
    assert.equal(r[k],false);
  }
});

test('HTTP status and canonical mismatch are OBSERVED errors, not invented zeros',()=>{
  const x=approved();const s=x.current!;
  s.indexHttpRows[0]={...s.indexHttpRows[0],status:404,pass:false};
  s.envelope.verdict='PRODUCTION_HTTP_MISMATCH';
  s.envelope.reasonCodes=['INDEX_INTENT_HTTP_COVERAGE_MISMATCH'];
  const r=evaluateG2dTechnicalMeasurement(x);
  assert.equal(r.state,'SPEC_DESIGN_ELIGIBLE');
  assert.equal(r.current.confirmedMismatch,1);
  assert.equal(r.current.confirmedPass,17);
  assert.equal(r.current.unknownCount,0);
  assert.equal(r.current.mismatchRate,1/18);
  assert.equal(r.validatedWin,false);
});

test('network error and unknown canonical mean UNKNOWN data, not zero successful pages',()=>{
  for(const bad of [
    {status:null,pass:false,error:'network timeout'},
    {canonical:null,pass:false,error:null},
    {noindex:null,pass:false,error:null},
  ]){
    const x=approved();
    x.current!.indexHttpRows[0]={...x.current!.indexHttpRows[0],...bad};
    x.current!.envelope.verdict='PRODUCTION_HTTP_MISMATCH';
    x.current!.envelope.reasonCodes=['INDEX_INTENT_HTTP_COVERAGE_MISMATCH'];
    const r=evaluateG2dTechnicalMeasurement(x);
    assert.equal(r.state,'SOURCE_BLOCKED');
    assert.equal(r.current.unknownCount,1);
    assert.equal(r.current.confirmedPass,17);
    assert.equal(r.current.confirmedMismatch,0);
    assert.equal(r.current.mismatchRate,null);
    assert.ok(r.reasonCodes.includes('UNKNOWN_HTTP_OBSERVATION_NOT_ZERO'));
  }
});

test('a claimed successful crawl contradicting the observed fields is refused',()=>{
  const x=approved();
  x.current!.indexHttpRows[0].canonical='https://thefeya.com/not-canonical';
  const r=evaluateG2dTechnicalMeasurement(x);
  assert.equal(r.state,'SOURCE_BLOCKED');
  assert.ok(r.reasonCodes.includes('PER_URL_CRAWLER_RECEIPT_CONFLICT'));
  assert.ok(r.reasonCodes.includes('ENVELOPE_CLAIMS_PASS_BUT_HTTP_MISMATCHES'));
});

test('missing, duplicate or out-of-release URL observations fail closed',()=>{
  for(const mod of [
    (s:G2dSource)=>{s.indexHttpRows.pop();},
    (s:G2dSource)=>{s.indexHttpRows[0].path=s.indexHttpRows[1].path;},
    (s:G2dSource)=>{s.indexHttpRows[0].path='/shop/not-eligible';},
  ]){
    const x=approved();mod(x.current!);
    const r=evaluateG2dTechnicalMeasurement(x);
    assert.equal(r.state,'SOURCE_BLOCKED');
    assert.ok(r.reasonCodes.includes('PER_URL_OBSERVATIONS_INCOMPLETE_OR_DUPLICATED'));
  }
});

test('historical aggregate 24/24 cannot become a product per-path denominator',()=>{
  const x=approved('PINNED_PRODUCT_NOINDEX_SAMPLE');
  x.current!.productHttpRows=null;
  x.current!.envelope.coverage.productNoindex.proof='AGGREGATE_CI_RECEIPT';
  x.current!.envelope.coverage.productNoindex.perPathVerified=0;
  const r=evaluateG2dTechnicalMeasurement(x);
  assert.equal(r.state,'SOURCE_BLOCKED');
  assert.equal(r.current.mismatchRate,null);
  assert.ok(r.reasonCodes.includes('PRODUCT_PER_PATH_OBSERVATION_MISSING'));
  assert.ok(r.reasonCodes.includes('PRODUCT_PER_PATH_RECEIPT_NOT_AVAILABLE'));
  assert.equal(r.current.denominator,24);
  assert.equal(r.validatedWin,false);
});

test('complete fresh 24-URL per-path sample is measurable ONLY within those 24 URLs',()=>{
  const r=evaluateG2dTechnicalMeasurement(approved('PINNED_PRODUCT_NOINDEX_SAMPLE'));
  assert.equal(r.state,'SPEC_DESIGN_ELIGIBLE');
  assert.equal(r.current.denominator,24);
  assert.equal(r.current.observedCount,24);
  assert.equal(r.current.mismatchRate,0);
  assert.equal(r.current.confirmedPass,24);
  assert.notEqual(r.current.denominator,207);
});

test('one measured bad noindex from independent detailed rows is countable',()=>{
  const x=approved('PINNED_PRODUCT_NOINDEX_SAMPLE');
  x.current!.productHttpRows![2]={
    ...x.current!.productHttpRows![2],noindex:false,pass:false,
  };
  x.current!.envelope.verdict='PRODUCTION_HTTP_MISMATCH';
  x.current!.envelope.reasonCodes=['PRODUCT_NOINDEX_SAMPLE_UNVERIFIED'];
  x.current!.envelope.coverage.productNoindex.proof='AGGREGATE_CI_RECEIPT';
  x.current!.envelope.coverage.productNoindex.perPathVerified=0;
  const r=evaluateG2dTechnicalMeasurement(x);
  assert.equal(r.state,'SPEC_DESIGN_ELIGIBLE');
  assert.equal(r.current.confirmedMismatch,1);
  assert.equal(r.current.denominator,24);
  assert.equal(r.current.mismatchRate,1/24);
});

test('unattested, preview, forged or wrong-revision CI sources are denied',()=>{
  for(const change of [
    (s:G2dSource)=>{s.attestation.independentlyVerified=false;},
    (s:G2dSource)=>{s.attestation.ref='refs/pull/185/merge';},
    (s:G2dSource)=>{s.envelope.verdict='PR_SNAPSHOT_ONLY';},
    (s:G2dSource)=>{s.envelope.deploymentCommitSha='f'.repeat(40);},
    (s:G2dSource)=>{s.attestation.runId='987654321';},
    (s:G2dSource)=>{s.attestation.jobCompleted=false;},
    (s:G2dSource)=>{s.attestation.artifactSha256='unverified';},
  ]){
    const x=approved();change(x.current!);
    const r=evaluateG2dTechnicalMeasurement(x);
    assert.equal(r.state,'SOURCE_BLOCKED');
    assert.equal(r.evidenceLevel,'NONE');
  }
});

test('stale clock, missing approved freshness and release identity changes are blocked',()=>{
  const x=approved();x.policy.approvedMaxAgeHours=null;
  assert.equal(evaluateG2dTechnicalMeasurement(x).state,'SOURCE_BLOCKED');
  const y=approved();y.now='2026-11-12T00:30:00Z';
  assert.ok(evaluateG2dTechnicalMeasurement(y).reasonCodes.includes('CURRENT_OBSERVATION_STALE'));
  const z=approved();z.authority!.releaseHash='f'.repeat(64);
  assert.equal(evaluateG2dTechnicalMeasurement(z).state,'SOURCE_BLOCKED');
  const w=approved();w.authority!.activeReleaseCount=2;
  assert.equal(evaluateG2dTechnicalMeasurement(w).state,'SOURCE_BLOCKED');
});

test('same URL cohort and release across two different runs may be compared observationally',()=>{
  const x=approved();
  x.baseline=mkSource('ALL_INDEX_INTENT_URLS',baselineAt,'39172600000');
  const r=evaluateG2dTechnicalMeasurement(x);
  assert.equal(r.state,'TWO_OBSERVATIONS_COMPARABLE');
  assert.equal(r.baseline!.pathSetHash,r.current.pathSetHash);
  assert.equal(r.baseline!.mismatchRate,0);
  assert.equal(r.current.mismatchRate,0);
  assert.equal(r.validatedWin,false);
  assert.equal(r.independentQaPassed,false);
});

test('changing the 24-URL sample between runs blocks longitudinal comparison',()=>{
  const x=approved('PINNED_PRODUCT_NOINDEX_SAMPLE');
  x.baseline=mkSource('PINNED_PRODUCT_NOINDEX_SAMPLE',baselineAt,'39172600000');
  const b=x.baseline;
  const before=b.productNoindexSamplePaths[0],after=b.productNoindexManifestPaths[27];
  b.productNoindexSamplePaths[0]=after;
  b.productHttpRows![0].path=after;
  b.productHttpRows![0].canonical=new URL(after,ORIGIN).toString();
  assert.notEqual(before,after);
  const r=evaluateG2dTechnicalMeasurement(x);
  assert.equal(r.state,'TWO_OBSERVATIONS_NOT_YET_COMPARABLE');
  assert.ok(r.reasonCodes.includes('BASELINE_FOLLOWUP_NOT_COMPARABLE'));
});

test('baseline must precede follow-up, use distinct run, and cannot be a PR',()=>{
  for(const change of [
    (s:G2dSource)=>{s.envelope.observation.finishedAt=
      new Date(Date.parse(observedAt)+1000).toISOString();},
    (s:G2dSource)=>{s.attestation.runId='39172621119';
      s.envelope.source.workflowRunId='39172621119';},
    (s:G2dSource)=>{s.attestation.event='pull_request';},
  ]){
    const x=approved();x.baseline=mkSource('ALL_INDEX_INTENT_URLS',baselineAt,'39172600000');
    change(x.baseline);
    const r=evaluateG2dTechnicalMeasurement(x);
    assert.notEqual(r.state,'TWO_OBSERVATIONS_COMPARABLE');
  }
});

test('a technical intervention must have a locked spec BEFORE intervention start',()=>{
  const x=approved();
  x.baseline=mkSource('ALL_INDEX_INTENT_URLS',baselineAt,'39172600000');
  x.policy.interventionStartedAt='2026-10-18T00:30:00Z';
  assert.ok(evaluateG2dTechnicalMeasurement(x).reasonCodes
    .includes('NO_LOCKED_SPEC_BEFORE_INTERVENTION'));
  x.policy.lockedBeforeInterventionAt='2026-10-18T02:30:00Z';
  assert.ok(evaluateG2dTechnicalMeasurement(x).reasonCodes
    .includes('NO_LOCKED_SPEC_BEFORE_INTERVENTION'));
  x.policy.lockedBeforeInterventionAt='2026-10-17T18:00:00Z';
  assert.equal(evaluateG2dTechnicalMeasurement(x).state,'TWO_OBSERVATIONS_COMPARABLE');
});

test('unrelated production robots/Shop guardrail failure cannot sneak in as a green metric',()=>{
  const x=approved();
  x.current!.envelope.verdict='PRODUCTION_HTTP_MISMATCH';
  x.current!.envelope.reasonCodes=['ORIGIN_ROBOTS_SITEMAP_OR_REDIRECT_UNVERIFIED'];
  const r=evaluateG2dTechnicalMeasurement(x);
  assert.equal(r.state,'SOURCE_BLOCKED');
  assert.ok(r.reasonCodes.includes('UNRELATED_SOURCE_GUARDRAIL_FAILURE'));
});

test('no power to publish, lock DB specs or approve spend can be inferred from a preflight',()=>{
  const s=readFileSync('lib/growthG2dTechnicalMeasurementPreflight.ts','utf8');
  assert.doesNotMatch(s,/\.rpc\(|\.insert\(|\.update\(|\.delete\(|fetch\(|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(s,/canLockMeasurementSpec:false/);
  assert.match(s,/canWriteOutcome:false/);
  assert.match(s,/validatedWin:false/);
});
