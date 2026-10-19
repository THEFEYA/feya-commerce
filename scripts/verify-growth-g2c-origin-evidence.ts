/**
 * G2c read-only origin observation envelope, saved into existing CI artifact.
 *
 * GitHub PR runs are always labeled PR_SNAPSHOT_ONLY even when the currently
 * published main production origin is healthy. ONLY exact main push with
 * exact production revision proof may be PRODUCTION_HTTP_OBSERVED.
 *
 * The CI job's final success and artifact identity must be confirmed from
 * GitHub independently by a future importer/reviewer. No DB writes here.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { projectG2cOriginEvidence } from '../lib/growthG2cOriginEvidence.ts';

async function readJson(path:string) {
  return JSON.parse(await readFile(path,'utf8')) as unknown;
}
const base='runtime-results/';
const paths={
  manifest:'tests/runtime/fixtures/phase12-wave-a-v12-production-crawl.json',
  crawl:base+'phase12-production-origin-crawl.json',
  revision:base+'phase13-production-revision-gate.json',
  shop:base+'phase13-shop-origin-smoke.json',
  collections:base+'phase13-collection-origin-smoke.json',
  pdp:base+'phase13-public-pdp-copy-postflight.json',
};
const isMainPush=process.env.GITHUB_EVENT_NAME==='push' &&
  process.env.GITHUB_REF==='refs/heads/main';
const ctx={
  repository:process.env.GITHUB_REPOSITORY||'',
  event:process.env.GITHUB_EVENT_NAME||'unknown',
  ref:process.env.GITHUB_REF||'unknown',
  commitSha:process.env.GITHUB_SHA||'unknown',
  workflowRunId:process.env.GITHUB_RUN_ID||'unknown',
};
let projection:ReturnType<typeof projectG2cOriginEvidence>;
try{
  const [manifest,crawl,revision,shop,collections,pdp]=await Promise.all([
    readJson(paths.manifest),readJson(paths.crawl),readJson(paths.revision),
    readJson(paths.shop),readJson(paths.collections),readJson(paths.pdp),
  ]);
  projection=projectG2cOriginEvidence({
    manifest,crawl,revision,shop,collections,pdp,context:ctx,
  });
}catch(error){
  console.error('G2c origin evidence files cannot be parsed/verified.',
    error instanceof Error?error.message:String(error));
  // Mandatory main production proof must fail; PR is a non-production preview.
  process.exit(isMainPush?1:0);
}
await mkdir(base,{recursive:true});
await writeFile(base+'growth-g2c-origin-observation.json',
  JSON.stringify(projection,null,2)+'\n','utf8');
console.log(JSON.stringify({
  schema:projection.schema,verdict:projection.verdict,
  commit:projection.deploymentCommitSha,release:projection.release?.version,
  index:projection.coverage.indexIntent,
  productNoindex:projection.coverage.productNoindex,
  shop:projection.coverage.shop,
  collections:projection.coverage.collections,
  pdpSample:projection.coverage.pdpCopySample,
  reasonCodes:projection.reasonCodes,
  note:'L0 external HTTP only. This is NOT Google indexing, independent AI QA or a measured business result.',
}));
if(isMainPush&&projection.verdict!=='PRODUCTION_HTTP_OBSERVED')process.exitCode=1;
