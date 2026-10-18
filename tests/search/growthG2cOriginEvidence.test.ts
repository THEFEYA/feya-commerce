import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectG2cOriginEvidence, type G2cEvidenceInput } from '../../lib/growthG2cOriginEvidence.ts';

const SHA='56208feed93a7f3f0f4984744203885cc7072a6b';
const ORIGIN='https://thefeya.com';
const indexPaths=['/',...Array.from({length:17},(_,i)=>'/collections/test-'+i)];
const productPaths=Array.from({length:207},(_,i)=>'/shop/product-'+i);
const indexUrl=(p:string)=>new URL(p,ORIGIN).toString();

function fixture():G2cEvidenceInput {
  const release={
    id:'2dc86d7c-6269-5327-9154-6b5178931254',
    code:'organic-wave-a-20260926',version:12,status:'ACTIVE',
    hash:'05d79c4ddc07da7e7fc60045f6ad39fabea40cb16f702bcfb6ea3b154d4bcd0b',
    gitSha:'7699e7cdcfc1cdf75716f006d5533fe1efbdf4b7',
    targetOrigin:ORIGIN,activeReleaseCount:1,
  };
  const sample=productPaths.slice(0,24);
  const shopPaths=['/shop','/shop?page=2','/shop?color=Gold','/shop?piece=Skirt'];
  const collectionPaths=[
    '/collections/shoulder-armor','/collections/festival-outfits','/collections/costume-masks',
  ];
  return {
    manifest:{
      contract:'phase12_wave_a_v12_active_production_crawl_v1',
      release,indexCandidates:indexPaths,productNoindexPaths:productPaths,
    },
    revision:{
      contract:'phase13_exact_production_sha_proof_v1',origin:ORIGIN,
      path:'/api/production-revision',
      expectedSha:SHA,enforced:true,matched:true,
      lastStatus:200,lastObservedSha:SHA,
      finishedAt:'2026-10-18T22:33:23.816Z',
    },
    crawl:{
      contract:'phase12_production_origin_crawl_evidence_v3',
      startedAt:'2026-10-18T22:33:23.892Z',
      finishedAt:'2026-10-18T22:33:36.462Z',
      origin:ORIGIN,releaseMode:'ACTIVE',release,
      summary:{
        passed:true,errorCount:0,indexCandidatesChecked:18,indexCandidatesPassed:18,
        productNoindexManifestExpected:207,productNoindexChecked:24,productNoindexPassed:24,
      },
      indexCandidates:indexPaths.map(p=>({
        path:p,status:200,noindex:false,canonical:indexUrl(p),
        expectedCanonical:indexUrl(p),pass:true,
      })),
      productNoindex:{
        manifestExpected:207,httpSampleExpected:24,samplePaths:sample,
        checked:24,passed:24,failed:[],
      },
      retiredRedirects:[
        {status:308,pass:true},{status:308,pass:true},
      ],
      utilityNoindex:[
        {pass:true,noindex:true},{pass:true,noindex:true},{pass:true,noindex:true},
      ],
      filterNoindex:[{pass:true,noindex:true}],
      originChecks:[{pass:true},{pass:true}],
      robots:{pass:true,hasSitemap:true,disallowAdmin:true,disallowInternal:true},
      sitemap:{pass:true,urlCount:18,locs:indexPaths.map(indexUrl)},
      errors:[],
    },
    shop:{
      contract:'phase13_shop_full_stream_origin_v1',origin:ORIGIN,
      at:'2026-10-18T22:33:41.303Z',
      checked:4,passed:4,degraded:0,
      cases:shopPaths.map(path=>({
        path,pass:true,degraded:false,
        attempts:[{path,status:200,pass:true,visibleCards:20,minCards:1,
          streamed404:false,unavailable:false,truncated:false}],
      })),
    },
    collections:{
      contract:'phase13_collections_full_stream_v1',origin:ORIGIN,
      at:'2026-10-18T22:33:41.793Z',
      checked:3,passed:3,degraded:0,
      cases:collectionPaths.map(path=>({
        path,pass:true,degraded:false,attempts:[
          {path,pass:true,status:200,expectedMemberCount:40,renderedCards:20,errors:[]},
        ],
      })),
    },
    pdp:{
      contract:'phase13_public_pdp_copy_postflight_v1',origin:ORIGIN,
      timestamp:'2026-10-18T22:33:46.305Z',
      gitAuthorized:true,mainPush:true,strict:true,skipped:false,
      checked:5,passed:5,reasons:[],
      samples:productPaths.slice(0,5).map(path=>({path,pass:true,status:200,errors:[]})),
    },
    context:{
      repository:'THEFEYA/feya-commerce',event:'push',ref:'refs/heads/main',
      commitSha:SHA,workflowRunId:'39172621119',
    },
  };
}
function clone<T>(v:T):T {
  return JSON.parse(JSON.stringify(v)) as T;
}

test('the real production-shaped HTTP receipt is L0, not a reviewer or Google indexing',()=>{
  const result=projectG2cOriginEvidence(fixture());
  assert.equal(result.verdict,'PRODUCTION_HTTP_OBSERVED');
  assert.equal(result.evidenceLevel,'L0_OBSERVATION');
  assert.deepEqual(result.reasonCodes,[]);
  assert.equal(result.release?.version,12);
  assert.equal(result.deploymentCommitSha,SHA);
  assert.deepEqual(result.coverage.indexIntent,{expected:18,verified:18});
  assert.equal(result.coverage.productNoindex.expected,207);
  assert.equal(result.coverage.productNoindex.sampled,24);
  assert.equal(result.coverage.productNoindex.untested,183);
  assert.equal(result.coverage.productNoindex.proof,'AGGREGATE_CI_RECEIPT');
  assert.equal(result.coverage.shop.verified,4);
  assert.equal(result.coverage.collections.verified,3);
  assert.equal(result.coverage.pdpCopySample.verified,5);
  assert.match(result.source.artifactPayloadSha256,/^[0-9a-f]{64}$/);
  for(const claim of [
    'googleIndexationConfirmed','autonomousReviewerExecuted',
    'independentHumanQaConfirmed','fullProductNoindexCoverageConfirmed',
    'measuredBusinessOutcome','caseMutationAllowed','sourceHealthPromoted',
  ] as const) assert.equal(result[claim],false);
});

test('a PR running against old production is NEVER a production attestation',()=>{
  for(const patch of [
    {event:'pull_request',ref:'refs/pull/183/merge'},
    {event:'push',ref:'refs/heads/feature'},
    {repository:'another/repo'},
    {commitSha:'x'.repeat(40)},
  ]){
    const f=fixture();f.context={...f.context,...patch};
    const r=projectG2cOriginEvidence(f);
    assert.equal(r.verdict,'PR_SNAPSHOT_ONLY');
    assert.equal(r.evidenceLevel,'NONE');
    assert.ok(r.reasonCodes.includes('NOT_EXACT_MAIN_PUSH'));
  }
});

test('wrong production revision SHA or relaxed revision check denies L0 proof',()=>{
  for(const patch of [
    {lastObservedSha:'f'.repeat(40)},
    {expectedSha:'f'.repeat(40)},
    {enforced:false}, {matched:false},{lastStatus:404},
    {origin:'https://another.example'},
  ]){
    const f=fixture();f.revision={...(f.revision as object),...patch};
    const r=projectG2cOriginEvidence(f);
    assert.equal(r.verdict,'UNVERIFIABLE');
    assert.equal(r.evidenceLevel,'NONE');
    assert.ok(r.reasonCodes.includes('PRODUCTION_DEPLOY_SHA_NOT_PROVEN'));
  }
});

test('release manifest identity and active status are required',()=>{
  for(const change of [
    {activeReleaseCount:2},{targetOrigin:'https://wrong.example'},
    {version:13},{status:'DRAFT'},{hash:'invalid'},
  ]){
    const f=fixture();(f.manifest as any).release={
      ...(f.manifest as any).release,...change,
    };
    const r=projectG2cOriginEvidence(f);
    assert.equal(r.verdict,'UNVERIFIABLE');
    assert.ok(r.reasonCodes.includes('EXPECTED_RELEASE_MANIFEST_INVALID')||
      r.reasonCodes.includes('CRAWL_IDENTITY_OR_RELEASE_MISMATCH'));
  }
});

test('index checks require every expected route, canonical and correct noindex',()=>{
  for(const changed of [
    {canonical:'https://thefeya.com/incorrect'},
    {noindex:true},{status:404},{pass:false},
  ]){
    const f=fixture();(f.crawl as any).indexCandidates[0]={
      ...(f.crawl as any).indexCandidates[0],...changed,
    };
    const r=projectG2cOriginEvidence(f);
    assert.equal(r.verdict,'PRODUCTION_HTTP_MISMATCH');
    assert.ok(r.reasonCodes.includes('INDEX_INTENT_HTTP_COVERAGE_MISMATCH'));
    assert.equal(r.coverage.indexIntent.verified,0);
  }
});

test('24/207 product sampling cannot be promoted to full product coverage',()=>{
  const f=fixture();const r=projectG2cOriginEvidence(f);
  assert.equal(r.coverage.productNoindex.untested,183);
  assert.equal(r.fullProductNoindexCoverageConfirmed,false);
  (f.crawl as any).productNoindex.passed=207;
  const changed=projectG2cOriginEvidence(f);
  assert.ok(changed.reasonCodes.includes('PRODUCT_NOINDEX_SAMPLE_UNVERIFIED'));
  assert.notEqual(changed.verdict,'PRODUCTION_HTTP_OBSERVED');
});

test('missing support observation and noncompliant Shop streaming are flagged',()=>{
  const f=fixture();(f.crawl as any).robots.disallowAdmin=false;
  let r=projectG2cOriginEvidence(f);
  assert.equal(r.verdict,'PRODUCTION_HTTP_MISMATCH');
  assert.ok(r.reasonCodes.includes('ORIGIN_ROBOTS_SITEMAP_OR_REDIRECT_UNVERIFIED'));
  const f2=fixture();(f2.shop as any).cases[0].attempts[0].streamed404=true;
  r=projectG2cOriginEvidence(f2);
  assert.ok(r.reasonCodes.includes('SHOP_FULL_STREAM_UNVERIFIED'));
  const f3=fixture();(f3.collections as any).cases[0].attempts[0].renderedCards=0;
  r=projectG2cOriginEvidence(f3);
  assert.ok(r.reasonCodes.includes('COLLECTION_FULL_STREAM_UNVERIFIED'));
  const f4=fixture();(f4.pdp as any).samples[0].errors=['copy mismatch'];
  r=projectG2cOriginEvidence(f4);
  assert.ok(r.reasonCodes.includes('PDP_COPY_SAMPLING_UNVERIFIED'));
});

test('clock drift and incomplete crawl cannot be hidden by a passed summary badge',()=>{
  const f=fixture();(f.crawl as any).deepCrawlSkipped=true;
  assert.ok(projectG2cOriginEvidence(f).reasonCodes
    .includes('ORIGIN_ROBOTS_SITEMAP_OR_REDIRECT_UNVERIFIED'));
  const f2=fixture();(f2.crawl as any).finishedAt='2026-10-19T22:33:36.462Z';
  const r=projectG2cOriginEvidence(f2);
  assert.equal(r.verdict,'UNVERIFIABLE');
  assert.ok(r.reasonCodes.includes('OBSERVATION_CLOCKS_NOT_COMPARABLE'));
});

test('envelope checksum changes when any input is altered but adds no write authority',()=>{
  const f=fixture(),r=projectG2cOriginEvidence(f);
  const other=clone(f);
  (other.crawl as any).internalBusinessRevenue=999999;
  const changed=projectG2cOriginEvidence(other);
  assert.notEqual(changed.source.artifactPayloadSha256,r.source.artifactPayloadSha256);
  assert.equal(changed.measuredBusinessOutcome,false);
  assert.equal(changed.caseMutationAllowed,false);
  assert.equal(changed.autonomousReviewerExecuted,false);
});

test('CI script must never call external credentials, LLM or insert a Growth Case',()=>{
  const script=readFileSync('scripts/verify-growth-g2c-origin-evidence.ts','utf8');
  assert.match(script,/GITHUB_EVENT_NAME/);
  assert.match(script,/GITHUB_REF/);
  assert.match(script,/GITHUB_SHA/);
  assert.match(script,/growth-g2c-origin-observation\.json/);
  assert.match(script,/if\(isMainPush&&projection\.verdict!=='PRODUCTION_HTTP_OBSERVED'\)/);
  assert.doesNotMatch(script,/SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|\.insert\(|\.rpc\(|fetch\(/);
});
