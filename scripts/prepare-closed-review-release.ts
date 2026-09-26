/** Usage: node --experimental-strip-types scripts/prepare-closed-review-release.ts INPUT OUTPUT
 * INPUT contains release metadata, exact projected copies, safe product snapshots and owner decisions.
 * This command writes an offline candidate. It does not change the DB or active release pointer. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prepareReviewRelease, assertReviewReleaseIntegrity } from '../lib/searchReviewRelease.ts';
const [inputPath,outputPath]=process.argv.slice(2);
if(!inputPath||!outputPath||resolve(inputPath)===resolve(outputPath))throw new Error('Distinct input and output paths required');
const manifest=prepareReviewRelease(JSON.parse(readFileSync(inputPath,'utf8')));
const summary=assertReviewReleaseIntegrity(manifest,manifest.manifest_sha256);
writeFileSync(outputPath,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({release_id:manifest.release_id,manifest_sha256:manifest.manifest_sha256,...summary}));
