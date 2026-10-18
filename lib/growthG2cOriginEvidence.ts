/**
 * FEYA Growth OS G2c — deterministic evidence contract for the existing
 * external HTTP Production origin CI crawl. No network I/O, no Supabase write,
 * no "independent AI reviewer" or Google indexation claim.
 *
 * The file is a candidate provenance envelope; a downstream consumer must
 * independently verify the GitHub Actions job conclusion and artifact origin,
 * compare the release with LIVE Search authority, and apply freshness policy
 * before attaching a human/GMEL QA decision to a Growth Case.
 */
import { createHash } from 'node:crypto';

type Row = Record<string,unknown>;
const ORIGIN = 'https://thefeya.com';
const SHA = /^[0-9a-f]{40}$/i;
const HASH = /^[0-9a-f]{64}$/i;

export type G2cEvidenceInput = {
  manifest: unknown;
  crawl: unknown;
  revision: unknown;
  shop: unknown;
  collections: unknown;
  pdp: unknown;
  context: {
    repository: string;
    event: string;
    ref: string;
    commitSha: string;
    workflowRunId: string;
  };
};
export type G2cEvidenceResult = {
  schema: 'FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1';
  verdict: 'PRODUCTION_HTTP_OBSERVED'|'PRODUCTION_HTTP_MISMATCH'|'PR_SNAPSHOT_ONLY'|'UNVERIFIABLE';
  evidenceLevel: 'L0_OBSERVATION'|'NONE';
  origin: typeof ORIGIN;
  deploymentCommitSha: string | null;
  release: { id:string; code:string; version:number; hash:string; manifestGitSha:string } | null;
  observation: { startedAt:string|null; finishedAt:string|null };
  coverage: {
    indexIntent:{ expected:number; verified:number };
    productNoindex:{ expected:number; sampled:number; reportedPassed:number; untested:number; proof:'AGGREGATE_CI_RECEIPT' };
    shop:{ expected:number; verified:number };
    collections:{ expected:number; verified:number };
    pdpCopySample:{ expected:number; verified:number };
  };
  source: {
    repository: string;
    workflowRunId: string;
    gitEvent: string;
    gitRef: string;
    artifactPayloadSha256: string;
    sourceType: 'EXTERNAL_HTTP_GITHUB_CI';
  };
  reasonCodes: string[];
  /** Explicit ceilings: code cannot accidentally promote this envelope. */
  googleIndexationConfirmed: false;
  autonomousReviewerExecuted: false;
  independentHumanQaConfirmed: false;
  fullProductNoindexCoverageConfirmed: false;
  measuredBusinessOutcome: false;
  caseMutationAllowed: false;
  sourceHealthPromoted: false;
};

function row(v:unknown):Row|null {
  return v!==null && typeof v==='object' && !Array.isArray(v) ? v as Row : null;
}
function array(v:unknown):unknown[] {
  return Array.isArray(v)?v:[];
}
function str(v:unknown,max=160):string {
  return typeof v==='string'?v.trim().slice(0,max):'';
}
function int(v:unknown):number|null {
  return typeof v==='number' && Number.isSafeInteger(v) && v>=0 ?v:null;
}
function time(v:unknown):number|null {
  if (typeof v!=='string' || v.length>60) return null;
  const n=Date.parse(v);
  return Number.isFinite(n)?n:null;
}
function canonical(path:string) {
  try {
    const u=new URL(path,ORIGIN);
    if (u.origin!==ORIGIN) return null;
    if (u.pathname!=='/' && u.pathname.endsWith('/')) u.pathname=u.pathname.slice(0,-1);
    return u.toString();
  }catch{return null;}
}
function exactSet(a:string[],b:string[]) {
  return a.length===b.length && new Set(a).size===a.length &&
    new Set(b).size===b.length && a.every(v=>b.includes(v));
}
function validPath(p:unknown):p is string {
  return typeof p==='string' && p.startsWith('/') && !p.startsWith('//') &&
    p.length<=450 && !/[#\u0000-\u001f]/.test(p) && canonical(p)!==null;
}
function allMatches(actual:unknown,expectedPaths:string[],predicate:(o:Row,path:string)=>boolean) {
  const values=array(actual).map(row);
  if (values.length!==expectedPaths.length || values.some(v=>v===null)) return false;
  const actualPaths=values.map(x=>str(x?.path,450));
  if (!exactSet(actualPaths,expectedPaths)) return false;
  return values.every(x=>!!x && predicate(x,str(x.path,450)));
}
function boundedObservedFile(v:unknown,contract:string,expectedOrigin=ORIGIN){
  const r=row(v);
  return !!r && r.contract===contract && r.origin===expectedOrigin;
}

/** No effects or credentials. Can run on PR, but PR evidence is never production proof. */
export function projectG2cOriginEvidence(input:G2cEvidenceInput):G2cEvidenceResult {
  const {context}=input;
  const manifest=row(input.manifest),crawl=row(input.crawl),revision=row(input.revision);
  const shop=row(input.shop),collections=row(input.collections),pdp=row(input.pdp);
  const release=row(manifest?.release), observedRelease=row(crawl?.release);
  const manifestIndex=array(manifest?.indexCandidates);
  const manifestProducts=array(manifest?.productNoindexPaths);
  const indexPaths=manifestIndex.filter(validPath);
  const productPaths=manifestProducts.filter(validPath);
  const isMainPush=context.event==='push' && context.ref==='refs/heads/main' &&
    context.repository==='THEFEYA/feya-commerce' && SHA.test(context.commitSha);
  const sha=context.commitSha.toLowerCase();
  const counts={
    indexIntent:{expected:indexPaths.length,verified:0},
    productNoindex:{
      expected:productPaths.length,sampled:0,reportedPassed:0,untested:productPaths.length,
      proof:'AGGREGATE_CI_RECEIPT' as const,
    },
    shop:{expected:4,verified:0},
    collections:{expected:3,verified:0},
    pdpCopySample:{expected:5,verified:0},
  };
  const hashes=[input.manifest,input.crawl,input.revision,input.shop,input.collections,input.pdp];
  const payloadHash=createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
  const result:G2cEvidenceResult={
    schema:'FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1',
    verdict:'UNVERIFIABLE',
    evidenceLevel:'NONE',
    origin:ORIGIN,
    deploymentCommitSha:SHA.test(sha)?sha:null,
    release:release&&typeof release.version==='number'?{
      id:str(release.id,55),code:str(release.code),version:release.version,
      hash:str(release.hash,75),manifestGitSha:str(release.gitSha,60),
    }:null,
    observation:{startedAt:str(crawl?.startedAt,60)||null,finishedAt:str(crawl?.finishedAt,60)||null},
    coverage:counts,
    source:{
      repository:str(context.repository),workflowRunId:str(context.workflowRunId,55),
      gitEvent:str(context.event,30),gitRef:str(context.ref,100),
      artifactPayloadSha256:payloadHash,sourceType:'EXTERNAL_HTTP_GITHUB_CI',
    },
    reasonCodes:[],
    googleIndexationConfirmed:false,
    autonomousReviewerExecuted:false,
    independentHumanQaConfirmed:false,
    fullProductNoindexCoverageConfirmed:false,
    measuredBusinessOutcome:false,
    caseMutationAllowed:false,
    sourceHealthPromoted:false,
  };
  const reasons=result.reasonCodes;
  if (!isMainPush) {
    result.verdict='PR_SNAPSHOT_ONLY';
    reasons.push('NOT_EXACT_MAIN_PUSH');
    return result;
  }
  const manifestOk=!!release &&
    manifest?.contract==='phase12_wave_a_v12_active_production_crawl_v1' &&
    release.status==='ACTIVE' && release.activeReleaseCount===1 &&
    release.targetOrigin===ORIGIN &&
    typeof release.id==='string' && /^[0-9a-f-]{36}$/i.test(release.id) &&
    typeof release.code==='string' && release.code.length>1 &&
    typeof release.version==='number' && Number.isSafeInteger(release.version) && release.version>0 &&
    typeof release.hash==='string' && HASH.test(release.hash) &&
    indexPaths.length===18 && productPaths.length===207 &&
    exactSet(indexPaths,manifestIndex as string[]) &&
    exactSet(productPaths,manifestProducts as string[]) &&
    (new Set([...indexPaths,...productPaths]).size===indexPaths.length+productPaths.length);
  if (!manifestOk) reasons.push('EXPECTED_RELEASE_MANIFEST_INVALID');

  const revisionOk=boundedObservedFile(revision,'phase13_exact_production_sha_proof_v1') &&
    revision?.path==='/api/production-revision' &&
    revision?.enforced===true && revision?.matched===true &&
    revision?.lastStatus===200 &&
    revision?.expectedSha===sha && revision?.lastObservedSha===sha;
  if (!revisionOk) reasons.push('PRODUCTION_DEPLOY_SHA_NOT_PROVEN');

  const sourceOk=!!crawl && manifestOk &&
    crawl.contract==='phase12_production_origin_crawl_evidence_v3' &&
    crawl.origin===ORIGIN && crawl.releaseMode==='ACTIVE' &&
    !!observedRelease &&
    ['id','code','version','status','hash','gitSha','targetOrigin','activeReleaseCount']
      .every(k=>observedRelease[k]===release?.[k]) &&
    typeof context.workflowRunId==='string' &&
    /^[1-9]\d{0,14}$/.test(context.workflowRunId);
  if (!sourceOk) reasons.push('CRAWL_IDENTITY_OR_RELEASE_MISMATCH');

  const started=time(crawl?.startedAt),finished=time(crawl?.finishedAt);
  const timestamps=[time(revision?.finishedAt),time(shop?.at),time(collections?.at),time(pdp?.timestamp)];
  const timesOk=started!==null && finished!==null && finished>=started &&
    finished-started<=20*60*1000 &&
    timestamps.every(t=>t!==null && t>=started-5*60*1000 && t<=finished+20*60*1000);
  if(!timesOk) reasons.push('OBSERVATION_CLOCKS_NOT_COMPARABLE');

  const indexOk=sourceOk &&
    allMatches(crawl?.indexCandidates,indexPaths,(r,p)=>
      r.pass===true && r.status===200 && r.noindex===false &&
      r.canonical===canonical(p) && r.expectedCanonical===canonical(p)) &&
    row(crawl?.summary)?.indexCandidatesChecked===indexPaths.length &&
    row(crawl?.summary)?.indexCandidatesPassed===indexPaths.length;
  if(!indexOk) reasons.push('INDEX_INTENT_HTTP_COVERAGE_MISMATCH');
  else counts.indexIntent.verified=indexPaths.length;

  const noindex=row(crawl?.productNoindex);
  const sample=array(noindex?.samplePaths).filter(validPath);
  const sampleExpected=Math.min(24,productPaths.length);
  const productOk=sourceOk && !!noindex &&
    noindex.manifestExpected===productPaths.length &&
    noindex.httpSampleExpected===sampleExpected &&
    noindex.checked===sampleExpected && noindex.passed===sampleExpected &&
    sample.length===sampleExpected && exactSet(sample,array(noindex.samplePaths) as string[]) &&
    sample.every(p=>productPaths.includes(p)) &&
    array(noindex.failed).length===0 &&
    row(crawl?.summary)?.productNoindexManifestExpected===productPaths.length &&
    row(crawl?.summary)?.productNoindexChecked===sampleExpected &&
    row(crawl?.summary)?.productNoindexPassed===sampleExpected;
  if (!productOk) reasons.push('PRODUCT_NOINDEX_SAMPLE_UNVERIFIED');
  else {
    counts.productNoindex.sampled=sampleExpected;
    counts.productNoindex.reportedPassed=sampleExpected;
    counts.productNoindex.untested=productPaths.length-sampleExpected;
  }

  const redirects=array(crawl?.retiredRedirects),utilities=array(crawl?.utilityNoindex),
    filters=array(crawl?.filterNoindex);
  const siteSupportOk=sourceOk &&
    redirects.length===2 && redirects.every(x=>row(x)?.pass===true && row(x)?.status===308) &&
    utilities.length===3 && utilities.every(x=>row(x)?.pass===true && row(x)?.noindex===true) &&
    filters.length===1 && filters.every(x=>row(x)?.pass===true && row(x)?.noindex===true) &&
    array(crawl?.originChecks).length===2 &&
    array(crawl?.originChecks).every(x=>row(x)?.pass===true) &&
    row(crawl?.robots)?.pass===true && row(crawl?.robots)?.hasSitemap===true &&
    row(crawl?.robots)?.disallowAdmin===true &&
    row(crawl?.robots)?.disallowInternal===true &&
    row(crawl?.sitemap)?.pass===true &&
    row(crawl?.sitemap)?.urlCount===indexPaths.length &&
    exactSet(array(row(crawl?.sitemap)?.locs) as string[],indexPaths.map(p=>canonical(p)!)) &&
    row(crawl?.summary)?.passed===true &&
    row(crawl?.summary)?.errorCount===0 &&
    array(crawl?.errors).length===0 &&
    crawl?.deepCrawlSkipped!==true;
  if (!siteSupportOk) reasons.push('ORIGIN_ROBOTS_SITEMAP_OR_REDIRECT_UNVERIFIED');

  const shopPaths=['/shop','/shop?page=2','/shop?color=Gold','/shop?piece=Skirt'];
  const shopsOk=boundedObservedFile(shop,'phase13_shop_full_stream_origin_v1') &&
    shop?.checked===4 && shop?.passed===4 && shop?.degraded===0 &&
    allMatches(shop?.cases,shopPaths,(c,p)=>{
      const found=array(c.attempts).map(row).find(r=>r?.pass===true);
      return c.pass===true && c.degraded===false && !!found &&
        found.path===p && found.status===200 &&
        found.streamed404===false && found.unavailable===false &&
        found.truncated===false && typeof found.visibleCards==='number' &&
        typeof found.minCards==='number' && found.visibleCards>=found.minCards;
    });
  if (!shopsOk) reasons.push('SHOP_FULL_STREAM_UNVERIFIED');
  else counts.shop.verified=4;

  const colPaths=['/collections/shoulder-armor','/collections/festival-outfits','/collections/costume-masks'];
  const colOk=boundedObservedFile(collections,'phase13_collections_full_stream_v1') &&
    collections?.checked===3 && collections?.passed===3 && collections?.degraded===0 &&
    allMatches(collections?.cases,colPaths,(c,p)=>{
      const found=array(c.attempts).map(row).find(r=>r?.pass===true);
      return c.pass===true && c.degraded===false && !!found &&
        found.path===p && found.status===200 &&
        typeof found.renderedCards==='number' && found.renderedCards>0 &&
        typeof found.expectedMemberCount==='number' && found.expectedMemberCount>0 &&
        array(found.errors).length===0;
    });
  if (!colOk) reasons.push('COLLECTION_FULL_STREAM_UNVERIFIED');
  else counts.collections.verified=3;

  const samples=array(pdp?.samples).map(row);
  const pdpPaths=samples.map(x=>str(x?.path,450));
  const pdpOk=boundedObservedFile(pdp,'phase13_public_pdp_copy_postflight_v1') &&
    pdp?.gitAuthorized===true && pdp?.mainPush===true &&
    pdp?.strict===true && pdp?.skipped===false &&
    pdp?.checked===5 && pdp?.passed===5 &&
    array(pdp?.reasons).length===0 && samples.length===5 &&
    new Set(pdpPaths).size===5 &&
    samples.every(x=>!!x && validPath(x.path) && productPaths.includes(x.path as string) &&
      x.status===200 && x.pass===true && array(x.errors).length===0);
  if (!pdpOk) reasons.push('PDP_COPY_SAMPLING_UNVERIFIED');
  else counts.pdpCopySample.verified=5;

  const proven=manifestOk&&revisionOk&&sourceOk&&timesOk;
  result.verdict=!proven?'UNVERIFIABLE':reasons.length
    ?'PRODUCTION_HTTP_MISMATCH':'PRODUCTION_HTTP_OBSERVED';
  result.evidenceLevel=proven?'L0_OBSERVATION':'NONE';
  // Success here is NOT autonomous independent QA: these are only external
  // observed HTTP facts. All stronger interpretations are delegated to GMEL.
  return result;
}
