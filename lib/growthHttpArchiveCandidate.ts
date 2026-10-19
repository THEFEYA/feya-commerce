/**
 * G2c/GDAE durable archival *candidate*, not an authenticated GitHub importer.
 *
 * Inputs must originate from the same independently verified GitHub Actions ZIP.
 * Caller separately verifies GH run/job conclusion and ZIP SHA256 using GitHub
 * credentials. Never treat this deterministic normalizer as a signature,
 * source promotion, independent QA, or authorization to write to Supabase.
 */
import {createHash} from 'node:crypto';

type Obj=Record<string,unknown>;
export type GrowthHttpSourceFiles={
  crawl:unknown;
  g2c:unknown;
  revision:unknown;
};
export type GrowthHttpSourceReference={
  artifactId:string;
  zipSha256:string;
};
const SHA40=/^[a-f0-9]{40}$/;
const SHA64=/^[a-f0-9]{64}$/;
const BIGINT_POS=/^[1-9][0-9]{0,14}$/;
function obj(v:unknown):Obj {
  if(!v || typeof v!=='object' || Array.isArray(v))throw Error('G2C_ARCHIVE_OBJECT_REQUIRED');
  return v as Obj;
}
function text(v:unknown):string {return typeof v==='string'?v:'';}
function path(v:unknown):string {
  const x=text(v);
  if(!x.startsWith('/')||x.startsWith('//')||x.length>450||
    /[?#\u0000-\u001f]/.test(x))throw Error('G2C_ARCHIVE_PATH_INVALID');
  return x;
}
function observedRows(v:unknown,noindex:boolean) {
  if(!Array.isArray(v)||v.length===0||v.length>2048)
    throw Error('G2C_ARCHIVE_INDIVIDUAL_ROWS_REQUIRED');
  const seen=new Set<string>();
  return v.map(raw=>{
    const r=obj(raw),p=path(r.path);
    if(seen.has(p))throw Error('G2C_ARCHIVE_DUPLICATE_URL');
    seen.add(p);
    const valid=r.status===200 && r.noindex===noindex &&
      r.canonical==='https://thefeya.com'+p &&
      r.pass===true && (r.error===null || r.error===undefined);
    if(!valid)throw Error('G2C_ARCHIVE_ONLY_COMPLETE_HTTP_V1');
    return {path:p,status:200,noindex,canonical:text(r.canonical),pass:true,error:null};
  });
}
function asHexSha(hex:unknown,regex:RegExp,error:string):string{
  if(typeof hex!=='string'||!regex.test(hex))throw Error(error);
  return hex;
}
function posIntString(v:unknown):string{
  const id=String(v);
  if(!BIGINT_POS.test(id))throw Error('G2C_ARCHIVE_POSITIVE_ID_REQUIRED');
  return id;
}
export function buildGrowthHttpArchiveCandidate(
  files:GrowthHttpSourceFiles,sourceRef:GrowthHttpSourceReference,
){
  const crawl=obj(files.crawl),g2c=obj(files.g2c),revision=obj(files.revision);
  const release=obj(g2c.release),who=obj(g2c.source),observed=obj(g2c.observation);
  const count=obj(g2c.coverage),ix=obj(count.indexIntent),pno=obj(count.productNoindex);
  const product=obj(crawl.productNoindex);
  const sourceRun=posIntString(who.workflowRunId);
  const artifactId=posIntString(sourceRef.artifactId);
  const sha=asHexSha(g2c.deploymentCommitSha,SHA40,'G2C_ARCHIVE_GIT_SHA');
  const zipSha256=asHexSha(sourceRef.zipSha256,SHA64,'G2C_ARCHIVE_ZIP_SHA');
  if(g2c.schema!=='FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1' ||
    g2c.verdict!=='PRODUCTION_HTTP_OBSERVED' ||
    g2c.evidenceLevel!=='L0_OBSERVATION' ||
    g2c.origin!=='https://thefeya.com' ||
    who.repository!=='THEFEYA/feya-commerce' ||
    who.gitEvent!=='push' || who.gitRef!=='refs/heads/main' ||
    who.sourceType!=='EXTERNAL_HTTP_GITHUB_CI' ||
    !SHA64.test(text(who.artifactPayloadSha256)) ||
    !Array.isArray(g2c.reasonCodes)||g2c.reasonCodes.length!==0 ||
    g2c.googleIndexationConfirmed!==false ||
    g2c.autonomousReviewerExecuted!==false ||
    g2c.independentHumanQaConfirmed!==false ||
    g2c.fullProductNoindexCoverageConfirmed!==false ||
    g2c.measuredBusinessOutcome!==false ||
    g2c.caseMutationAllowed!==false ||
    g2c.sourceHealthPromoted!==false ||
    !SHA64.test(text(release.hash)) ||
    !Number.isSafeInteger(release.version)||Number(release.version)<=0 ||
    text(release.id).length!==36 ||
    crawl.origin!=='https://thefeya.com' ||
    revision.enforced!==true || revision.matched!==true ||
    revision.expectedSha!==sha || revision.lastObservedSha!==sha ||
    revision.lastStatus!==200 ||
    obj(crawl.release).id!==release.id ||
    obj(crawl.release).hash!==release.hash ||
    obj(crawl.release).version!==release.version ||
    !Array.isArray(crawl.indexCandidates) ||
    !Array.isArray(product.observations) ||
    pno.proof!=='PER_PATH_CI_RECEIPT'
  )throw Error('G2C_ARCHIVE_PROVENANCE_OR_SCOPE_UNVERIFIED');
  const indexRows=observedRows(crawl.indexCandidates,false);
  const productRows=observedRows(product.observations,true);
  if(ix.expected!==indexRows.length || ix.verified!==indexRows.length ||
    pno.sampled!==productRows.length ||
    pno.perPathVerified!==productRows.length ||
    pno.untested!==Number(pno.expected)-productRows.length ||
    !(Number(pno.expected)>productRows.length))throw Error('G2C_ARCHIVE_COVERAGE_DRIFT');
  if(!Number.isFinite(Date.parse(text(observed.startedAt)))||
     !Number.isFinite(Date.parse(text(observed.finishedAt)))||
     Date.parse(text(observed.finishedAt))<Date.parse(text(observed.startedAt)))
    throw Error('G2C_ARCHIVE_CLOCK_INVALID');

  const payload={
    contract:'FEYA_GROWTH_HTTP_ARCHIVE_V1',
    source:{
      repository:'THEFEYA/feya-commerce',
      event:'push',ref:'refs/heads/main',
      origin:'https://thefeya.com',
      runId:sourceRun,artifactId,deploymentSha:sha,zipSha256,
    },
    release:{
      id:text(release.id),
      code:text(release.code),
      version:release.version as number,
      hash:text(release.hash),
      origin:'https://thefeya.com',
    },
    g2c,
    indexRows,
    productRows,
  };
  if(Buffer.byteLength(JSON.stringify(payload),'utf8')>262144)
    throw Error('G2C_ARCHIVE_EXCEEDS_MAX_BYTES');
  // This is a local candidate digest, not PostgreSQL jsonb::text digest.
  // Staging RPC computes authoritative payload_sha256 itself.
  return {
    payload,
    candidateUtf8Sha256:createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
    assessment:'UNVERIFIED_OFFLINE_CANDIDATE' as const,
    dbInserted:false as const,
    independentQaPassed:false as const,
  };
}
