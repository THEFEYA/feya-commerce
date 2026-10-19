/**
 * TheFEYA Growth OS / G2d — read-only, deterministic technical measurement
 * preflight. The FIRST action is to decide whether a metric is even observable.
 *
 * Compatible with the structural G2c V1 envelope, but intentionally does NOT
 * consume PR CI badges as production evidence or grant Measurement Spec writes.
 * GitHub verification + ACTIVE Search Release read must happen server-side;
 * these are INPUTS from a trusted future adapter, not cryptographic signatures.
 *
 * No Supabase, HTTP, model, budget, execution or case side effects.
 */
import { createHash } from 'node:crypto';

export const G2D_METRIC_CANDIDATE = 'TSEO_HTTP_INTENT_MISMATCH_COUNT' as const;
export type G2dCohort = 'ALL_INDEX_INTENT_URLS' | 'PINNED_PRODUCT_NOINDEX_SAMPLE';
type HttpRow = {
  path: string;
  status?: number | null;
  noindex?: boolean | null;
  canonical?: string | null;
  pass?: boolean | null;
  error?: string | null;
};
type G2cSummary = {
  schema: string;
  verdict: string;
  evidenceLevel: string;
  origin: string;
  deploymentCommitSha: string | null;
  release: { id: string; code: string; version: number; hash: string } | null;
  observation: { startedAt: string | null; finishedAt: string | null };
  coverage: {
    indexIntent: { expected: number; verified: number };
    productNoindex: {
      expected: number; sampled: number; reportedPassed: number;
      perPathVerified: number; untested: number;
      proof: string;
    };
  };
  source: {
    repository: string; workflowRunId: string;
    gitEvent: string; gitRef: string; artifactPayloadSha256: string;
    sourceType: string;
  };
  reasonCodes: string[];
};
export type G2dSource = {
  envelope: G2cSummary;
  /** Original pinned Search Release paths, not a new auto-discovered cohort. */
  indexIntentPaths: string[];
  productNoindexManifestPaths: string[];
  productNoindexSamplePaths: string[];
  indexHttpRows: HttpRow[];
  productHttpRows: HttpRow[] | null;
  /**
   * Attested by independently checked GitHub job / artifact / deployment.
   * Caller MUST verify this with the authenticated GitHub connector.
   * A plain object from an external LLM/user is NEVER suitable as this input.
   */
  attestation: {
    repository: string;
    event: string;
    ref: string;
    runId: string;
    headSha: string;
    artifactId: number;
    artifactSha256: string;
    jobCompleted: boolean;
    jobConclusion: 'success' | 'failure' | 'unknown';
    fullyCapturedFailure?: boolean;
    independentlyVerified: boolean;
  };
};
export type G2dAuthority = {
  activeReleaseCount: number;
  origin: string;
  releaseId: string;
  releaseCode: string;
  releaseVersion: number;
  releaseHash: string;
  approvedProductBindings: number | null;
  indexIntentPaths: string[];
  productNoindexPaths: string[];
};
export type G2dMetricRegistry = {
  metric_code: string;
  metric_state: string;
  owner_role: string;
  authority_source: string;
  version_no: number;
} | null;
export type G2dReviewPolicy = {
  /** An explicitly approved limit. Omission is NOT an assumed default. */
  approvedMaxAgeHours: number | null;
  /** If a change has begun, its Measurement Spec must already be locked. */
  interventionStartedAt: string | null;
  lockedBeforeInterventionAt: string | null;
  /** Distinct approved source verification; owner-only UI cannot self-attest. */
  reviewerConfirmed: boolean;
};
export type G2dInput = {
  cohort: G2dCohort;
  current: G2dSource | null;
  baseline?: G2dSource | null;
  authority: G2dAuthority | null;
  metric: G2dMetricRegistry;
  policy: G2dReviewPolicy;
  now: string;
};
export type G2dObservation = {
  cohort: G2dCohort;
  pathSetHash: string | null;
  observedCount: number;
  confirmedPass: number;
  confirmedMismatch: number;
  unknownCount: number;
  denominator: number;
  /** Never average a partial denominator or impute unknown as zero. */
  mismatchRate: number | null;
  releaseHash: string | null;
  deploymentSha: string | null;
  observedAt: string | null;
  runId: string | null;
  provenanceSha256: string | null;
};
export type G2dPreflight = {
  state: 'SOURCE_BLOCKED' | 'SOURCE_OBSERVABLE_REVIEW_REQUIRED' |
    'METRIC_GOVERNANCE_REQUIRED' | 'SPEC_DESIGN_ELIGIBLE' |
    'TWO_OBSERVATIONS_NOT_YET_COMPARABLE' | 'TWO_OBSERVATIONS_COMPARABLE';
  evidenceLevel: 'L0_OBSERVATION' | 'NONE';
  current: G2dObservation;
  baseline: G2dObservation | null;
  reasonCodes: string[];
  proposedMetricCode: typeof G2D_METRIC_CANDIDATE;
  /** Deliberately not a real DB spec or registration permission. */
  canLockMeasurementSpec: false;
  canWriteOutcome: false;
  independentQaPassed: false;
  googleIndexationConfirmed: false;
  revenueOrConversionMeasured: false;
  validatedWin: false;
};

const ORIGIN = 'https://thefeya.com';
const SHA40=/^[0-9a-f]{40}$/i, SHA64=/^[0-9a-f]{64}$/i;

const goodTime=(s:string|null|undefined):number|null=>{
  if(typeof s!=='string'||s.length>60)return null;
  const t=Date.parse(s);
  return Number.isFinite(t)?t:null;
};
const validPath=(v:unknown):v is string=>{
  if(typeof v!=='string'||!v.startsWith('/')||v.startsWith('//')||
      v.length>450||/[?#\u0000-\u001f]/.test(v))return false;
  try{
    const u=new URL(v,ORIGIN);
    return u.origin===ORIGIN && u.pathname===v && !u.search&&!u.hash;
  }catch{return false;}
};
const expectedCanonical=(path:string)=>new URL(path,ORIGIN).toString();
const uniqueValid=(list:readonly string[])=>list.length>0 &&
  list.every(validPath) && new Set(list).size===list.length;
const identicalPaths=(a:readonly string[],b:readonly string[])=>
  a.length===b.length&&uniqueValid(a)&&uniqueValid(b)&&
  a.every(p=>b.includes(p));
const makeHash=(values:readonly string[])=>createHash('sha256')
  .update(JSON.stringify([...values].sort())).digest('hex');

function blank(cohort:G2dCohort):G2dObservation {
  return {cohort,pathSetHash:null,observedCount:0,confirmedPass:0,
    confirmedMismatch:0,unknownCount:0,denominator:0,mismatchRate:null,
    releaseHash:null,deploymentSha:null,observedAt:null,
    runId:null,provenanceSha256:null};
}

type CheckedSnapshot = {
  observation:G2dObservation;
  reasons:string[];
  validSource:boolean;
  comparable:false | true;
};
function inspect(
  source:G2dSource|null,
  cohort:G2dCohort,
  authority:G2dAuthority|null,
  nowMs:number|null,
  ageLimitHours:number|null,
  requireCurrentAge:boolean,
):CheckedSnapshot {
  const observation=blank(cohort);
  const reasons:string[]=[];
  if (!source || !authority) return {
    observation,reasons:['SOURCE_OR_ACTIVE_RELEASE_MISSING'],
    validSource:false,comparable:false,
  };
  const e=source.envelope,a=source.attestation;
  const liveIndex=authority.indexIntentPaths;
  const liveProduct=authority.productNoindexPaths;
  const sourceIndex=source.indexIntentPaths,sourceProduct=source.productNoindexManifestPaths;
  const cohortPaths=cohort==='ALL_INDEX_INTENT_URLS'
    ?sourceIndex:source.productNoindexSamplePaths;
  if(!uniqueValid(cohortPaths) ||
     !identicalPaths(sourceIndex,liveIndex) ||
     !identicalPaths(sourceProduct,liveProduct) ||
     !cohortPaths.every(p=>cohort==='ALL_INDEX_INTENT_URLS'?
       liveIndex.includes(p):liveProduct.includes(p))){
    reasons.push('COHORT_OR_RELEASE_URL_MEMBERSHIP_DRIFT');
  }
  const releaseValid=authority.activeReleaseCount===1&&
    authority.origin===ORIGIN&&
    e.release?.id===authority.releaseId&&
    e.release.code===authority.releaseCode&&
    e.release.version===authority.releaseVersion&&
    e.release.hash===authority.releaseHash&&
    e.origin===ORIGIN&&
    e.schema==='FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1'&&
    (e.verdict==='PRODUCTION_HTTP_OBSERVED'||
     e.verdict==='PRODUCTION_HTTP_MISMATCH')&&
    e.evidenceLevel==='L0_OBSERVATION'&&
    authority.approvedProductBindings!==null &&
    authority.approvedProductBindings===liveProduct.length &&
    sourceIndex.length===e.coverage.indexIntent.expected&&
    sourceProduct.length===e.coverage.productNoindex.expected;
  if(!releaseValid)reasons.push('G2C_ENVELOPE_OR_LIVE_AUTHORITY_INVALID');
  if(e.verdict==='PRODUCTION_HTTP_MISMATCH' &&
     (!Array.isArray(e.reasonCodes)||e.reasonCodes.length===0)){
    reasons.push('MISMATCH_WITHOUT_REASON_CODES');
  }

  // The attested repository and commit are checked independently; no envelope
  // field alone is an authenticated source signature.
  const verifiedJob=!!a.independentlyVerified &&
    a.repository==='THEFEYA/feya-commerce'&&
    a.event==='push'&&a.ref==='refs/heads/main'&&
    a.jobCompleted===true &&
    (a.jobConclusion==='success' ||
      (a.jobConclusion==='failure'&&a.fullyCapturedFailure===true))&&
    SHA40.test(a.headSha)&&SHA64.test(a.artifactSha256)&&
    Number.isSafeInteger(a.artifactId)&&a.artifactId>0&&
    /^[1-9]\d{0,15}$/.test(a.runId)&&
    a.headSha===e.deploymentCommitSha&&
    e.source.repository===a.repository&&
    e.source.gitEvent===a.event&&
    e.source.gitRef===a.ref&&
    e.source.workflowRunId===a.runId&&
    e.source.sourceType==='EXTERNAL_HTTP_GITHUB_CI'&&
    SHA64.test(e.source.artifactPayloadSha256);
  if(!verifiedJob)reasons.push('GITHUB_PRODUCTION_ARTIFACT_NOT_ATTESTED');

  const endMs=goodTime(e.observation.finishedAt);
  const startMs=goodTime(e.observation.startedAt);
  const clockOk=startMs!==null&&endMs!==null&&nowMs!==null&&
    endMs>=startMs&&endMs<=nowMs+5*60*1000&&
    endMs-startMs<=25*60*1000;
  if(!clockOk)reasons.push('OBSERVATION_CLOCK_INVALID');
  if(requireCurrentAge){
    if(ageLimitHours===null||!Number.isFinite(ageLimitHours)||
       ageLimitHours<=0||ageLimitHours>720){
      reasons.push('FRESHNESS_POLICY_NOT_APPROVED');
    }else if(clockOk&&nowMs!==null&&endMs!==null&&
       nowMs-endMs>ageLimitHours*3600000){
      reasons.push('CURRENT_OBSERVATION_STALE');
    }
  }

  const items=cohort==='ALL_INDEX_INTENT_URLS'?
    source.indexHttpRows:source.productHttpRows;
  if(cohort==='PINNED_PRODUCT_NOINDEX_SAMPLE'){
    // Aggregate historical 24/24 is not 24 independently observed URL rows.
    if(!Array.isArray(items))reasons.push('PRODUCT_PER_PATH_OBSERVATION_MISSING');
    if(e.coverage.productNoindex.proof!=='PER_PATH_CI_RECEIPT' ||
      e.coverage.productNoindex.perPathVerified!==cohortPaths.length){
      // Important: a valid actual mismatch can reduce G2c "passed" to zero.
      // For that case full raw paths + failure-specific G2c reason are required.
      const validNegative=e.verdict==='PRODUCTION_HTTP_MISMATCH' &&
        e.reasonCodes.includes('PRODUCT_NOINDEX_SAMPLE_UNVERIFIED') &&
        Array.isArray(items);
      if(!validNegative)reasons.push('PRODUCT_PER_PATH_RECEIPT_NOT_AVAILABLE');
    }
  }

  if(!Array.isArray(items)||items.length!==cohortPaths.length||
     !uniqueValid(cohortPaths)||
     new Set(items.map(x=>x.path)).size!==items.length||
     !items.every(x=>cohortPaths.includes(x.path))){
    reasons.push('PER_URL_OBSERVATIONS_INCOMPLETE_OR_DUPLICATED');
  }
  observation.pathSetHash=uniqueValid(cohortPaths)?makeHash(cohortPaths):null;
  observation.denominator=uniqueValid(cohortPaths)?cohortPaths.length:0;
  observation.releaseHash=e.release?.hash??null;
  observation.deploymentSha=e.deploymentCommitSha;
  observation.observedAt=e.observation.finishedAt;
  observation.runId=e.source.workflowRunId;
  observation.provenanceSha256=e.source.artifactPayloadSha256;

  if(Array.isArray(items)&&observation.denominator&&
     !reasons.includes('PER_URL_OBSERVATIONS_INCOMPLETE_OR_DUPLICATED')){
    let knownPass=0,knownBad=0,unknown=0;
    const expectedNoindex=cohort==='PINNED_PRODUCT_NOINDEX_SAMPLE';
    for(const p of cohortPaths){
      const found=items.find(v=>v.path===p);
      if(!found || found.error || !Number.isInteger(found.status) ||
        typeof found.noindex!=='boolean' ||
        typeof found.canonical!=='string'){
        unknown++;continue;
      }
      if(found.status===200 &&
         found.noindex===expectedNoindex &&
         found.canonical===expectedCanonical(p)){
        knownPass++;
      }else{
        knownBad++;
      }
    }
    observation.observedCount=knownPass+knownBad;
    observation.confirmedPass=knownPass;
    observation.confirmedMismatch=knownBad;
    observation.unknownCount=unknown;
    if(unknown===0 && knownPass+knownBad===observation.denominator){
      observation.mismatchRate=knownBad/observation.denominator;
    }else reasons.push('UNKNOWN_HTTP_OBSERVATION_NOT_ZERO');
  }
  const validSource=reasons.length===0;
  return {observation,reasons,validSource,
    comparable:validSource&&observation.mismatchRate!==null};
}

export function evaluateG2dTechnicalMeasurement(input:G2dInput):G2dPreflight {
  const nowMs=goodTime(input.now);
  const curr=inspect(input.current,input.cohort,input.authority,nowMs,
    input.policy.approvedMaxAgeHours,true);
  const base=input.baseline===undefined?null:inspect(input.baseline,
    input.cohort,input.authority,nowMs,null,false);
  const reasons=[...curr.reasons];
  if(base)reasons.push(...base.reasons.map(r=>'BASELINE_'+r));
  if(!input.policy.reviewerConfirmed)reasons.push('INDEPENDENT_REVIEW_NOT_ATTESTED');

  // The new technical metric is NOT among the 14 currently registered
  // measurements. Do not invent a ready metric or write a new one.
  const metric=input.metric;
  const metricApproved=!!metric&&
    metric.metric_code===G2D_METRIC_CANDIDATE &&
    (metric.metric_state==='AVAILABLE'||
      metric.metric_state==='AVAILABLE_WITH_LIMITATIONS')&&
    metric.owner_role==='GMEL'&&
    metric.authority_source==='FEYA_GROWTH_G2C_HTTP_OBSERVATION_V1'&&
    Number.isSafeInteger(metric.version_no)&&metric.version_no>0;
  if(!metricApproved)reasons.push('METRIC_REGISTRY_GOVERNANCE_MISSING');

  const interventionAt=goodTime(input.policy.interventionStartedAt);
  const lockedAt=goodTime(input.policy.lockedBeforeInterventionAt);
  if(input.policy.interventionStartedAt!==null &&
    (interventionAt===null||lockedAt===null||lockedAt>interventionAt)){
    reasons.push('NO_LOCKED_SPEC_BEFORE_INTERVENTION');
  }
  let sameCohort=false;
  if(base){
    sameCohort=base.comparable&&curr.comparable&&
      base.observation.pathSetHash===curr.observation.pathSetHash&&
      base.observation.releaseHash===curr.observation.releaseHash&&
      base.observation.runId!==curr.observation.runId&&
      goodTime(base.observation.observedAt)!<goodTime(curr.observation.observedAt)!;
    if(!sameCohort)reasons.push('BASELINE_FOLLOWUP_NOT_COMPARABLE');
  }

  let state:G2dPreflight['state'];
  if(!curr.validSource||base&&!base.validSource){
    state='SOURCE_BLOCKED';
  }else if(!metricApproved){
    state='METRIC_GOVERNANCE_REQUIRED';
  }else if(!input.policy.reviewerConfirmed){
    state='SOURCE_OBSERVABLE_REVIEW_REQUIRED';
  }else if(input.policy.interventionStartedAt!==null&&
    reasons.includes('NO_LOCKED_SPEC_BEFORE_INTERVENTION')){
    state='TWO_OBSERVATIONS_NOT_YET_COMPARABLE';
  }else if(base){
    state=sameCohort?'TWO_OBSERVATIONS_COMPARABLE':'TWO_OBSERVATIONS_NOT_YET_COMPARABLE';
  }else{
    state='SPEC_DESIGN_ELIGIBLE';
  }
  return {
    state,
    evidenceLevel:curr.validSource?'L0_OBSERVATION':'NONE',
    current:curr.observation,
    baseline:base?.observation??null,
    reasonCodes:[...new Set(reasons)],
    proposedMetricCode:G2D_METRIC_CANDIDATE,
    canLockMeasurementSpec:false,
    canWriteOutcome:false,
    independentQaPassed:false,
    googleIndexationConfirmed:false,
    revenueOrConversionMeasured:false,
    validatedWin:false,
  };
}
