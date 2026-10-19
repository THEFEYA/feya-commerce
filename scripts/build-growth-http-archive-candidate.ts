/**
 * Offline G2c archive candidate builder. Does not call GitHub/Supabase or
 * authenticate a source. Requires a trusted operator to independently verify
 * GH run/job/deployment and the ZIP digest before enabling staging RPC.
 *
 * Usage after securely extracting the six GitHub Actions JSON files:
 * FEYA_G2C_ARTIFACT_ID=... FEYA_G2C_ZIP_SHA256=... \
 *   node --experimental-strip-types scripts/build-growth-http-archive-candidate.ts \
 *   ./verified-run-files ./out/growth-http-candidate.json
 *
 * Exclusive file creation: cannot silently rewrite a saved baseline.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {buildGrowthHttpArchiveCandidate} from '../lib/growthHttpArchiveCandidate.ts';

async function json(file:string){
 return JSON.parse(await readFile(file,'utf8')) as unknown;
}
const dir=process.argv[2],file=process.argv[3];
if(!dir||!file)throw Error('G2C_ARCHIVE_USAGE_MISSING_INPUT_OR_OUTPUT');
const artifactId=process.env.FEYA_G2C_ARTIFACT_ID||'';
const zipSha256=process.env.FEYA_G2C_ZIP_SHA256||'';
const root=resolve(dir);
const [crawl,g2c,revision]=await Promise.all([
 json(join(root,'phase12-production-origin-crawl.json')),
 json(join(root,'growth-g2c-origin-observation.json')),
 json(join(root,'phase13-production-revision-gate.json')),
]);
const candidate=buildGrowthHttpArchiveCandidate(
 {crawl,g2c,revision},{artifactId,zipSha256});
await mkdir(dirname(resolve(file)),{recursive:true});
await writeFile(file,JSON.stringify(candidate,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({
 schema:candidate.payload.contract,
 stage:'UNVERIFIED_OFFLINE_CANDIDATE',
 indexCount:candidate.payload.indexRows.length,
 productSampleCount:candidate.payload.productRows.length,
 runId:candidate.payload.source.runId,
 artifactId:candidate.payload.source.artifactId,
 candidateUtf8Sha256:candidate.candidateUtf8Sha256,
 doesNotWriteDatabase:true,
}));
