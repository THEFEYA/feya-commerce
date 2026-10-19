import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectGdaeArchiveForCase,type GdaeArchiveReceiptRow}
  from '../../lib/owner-ui/gdaeArchivedSourceGate.ts';

const ready={releaseCode:'organic-wave-a-20260926',releaseVersion:12,
  intendedIndex:18,approvedProducts:207,targetOrigin:'https://thefeya.com'};
const canonical={
  release_id:'2dc86d7c-6269-5327-9154-6b5178931254',
  release_code:ready.releaseCode,release_version:ready.releaseVersion,
  release_hash:'05d79c4ddc07da7e7fc60045f6ad39fabea40cb16f702bcfb6ea3b154d4bcd0b',
  release_status:'ACTIVE',target_origin:'https://thefeya.com',
};
const source:GdaeArchiveReceiptRow={
  receipt_id:'3a75f5c0-2724-4b4f-82cd-9c905bb2f0d8',
  release_id:canonical.release_id,origin:canonical.target_origin,
  source_code:'TSEO_PRODUCTION_HTTP_OBSERVATION',
  source_channel:'GITHUB_ACTIONS_PRODUCTION_ORIGIN',
  release_code:ready.releaseCode,release_version:ready.releaseVersion,
  release_hash:'05d79c4ddc07da7e7fc60045f6ad39fabea40cb16f702bcfb6ea3b154d4bcd0b',
  evidence_level:'L0_OBSERVATION',
  verification_state:'PROVENANCE_REVIEW_REQUIRED',
  index_urls_observed:18,product_urls_sampled:24,product_urls_in_release:207,
  workflow_run_id:'39180879535',artifact_id:'12155269341',
  artifact_zip_sha256:'198ba252a30b36471795aceefa5eecedf1364fd7fa440e628e9fbae5557d9ae7',
  payload_sha256:'3f532c5cb54fdd4f25d475378d904a2da7de1aec1a4baf6eab6f58c31e6eae92',
  independent_qa_passed:false,google_indexed_state_known:false,
  business_outcome_measured:false,source_health_promoted:false,
  finished_at:'2026-10-19T00:28:39.990Z',
  recorded_at:'2026-10-19T22:28:43.335Z',
};
const evaluate=(rows:readonly GdaeArchiveReceiptRow[]|null,opts:{
  readError?:boolean;caseType?:string;expectedRelease?:typeof ready|null;
  canonicalRows?:typeof canonical[]|null;
}={})=>projectGdaeArchiveForCase({
  caseType:opts.caseType??'TSEO_INDEXABILITY_SHADOW',
  expectedRelease:opts.expectedRelease===undefined?ready:opts.expectedRelease,
  rows,canonicalRows:opts.canonicalRows===undefined?[canonical]:opts.canonicalRows,
  readError:opts.readError??false,
});

test('actual archived v12 L0 is linked to the TSEO Case without promotion',()=>{
 const x=evaluate([source]);
 assert.equal(x.status,'SOURCE_RETAINED_REVIEW_REQUIRED');
 assert.equal(x.receiptId,source.receipt_id);
 assert.equal(x.indexObserved,18);
 assert.equal(x.indexExpected,18);
 assert.equal(x.productObserved,24);
 assert.equal(x.productExpected,207);
 assert.equal(x.productsUnobserved,183);
 assert.equal(x.evidenceLevel,'L0_OBSERVATION');
 assert.equal(x.canonicalReleaseMatched,true);
 const postgrest=evaluate([{...source,workflow_run_id:39180879535,artifact_id:12155269341}]);
 assert.equal(postgrest.status,'SOURCE_RETAINED_REVIEW_REQUIRED');
 assert.equal(postgrest.sourceRunId,'39180879535');
 for(const field of ['independentQaConfirmed','googleIndexedConfirmed',
   'commercialOutcomeMeasured','canPromoteSource','canAdvanceCase',
   'canLockMeasurementSpec'] as const)assert.equal(x[field],false,field);
});

test('archive missing, release unavailable or HTTP read denied never becomes success/zero',()=>{
 assert.equal(evaluate([]).status,'NOT_STAGED');
 assert.equal(evaluate(null,{readError:true}).status,'SOURCE_UNAVAILABLE');
 assert.equal(evaluate([source],{expectedRelease:null}).status,'CASE_RELEASE_UNCONFIRMED');
 assert.equal(evaluate([source],{canonicalRows:null,readError:true}).status,'SOURCE_UNAVAILABLE');
 assert.equal(evaluate([source],{canonicalRows:[]}).status,'CASE_RELEASE_UNCONFIRMED');
 assert.equal(evaluate([source],{canonicalRows:[canonical,canonical]}).status,'CASE_RELEASE_UNCONFIRMED');
 assert.equal(evaluate([source],{expectedRelease:{...ready,intendedIndex:19}}).status,'ARCHIVE_NOT_ADMISSIBLE');
 assert.equal(evaluate([source],{expectedRelease:{...ready,approvedProducts:208}}).status,'ARCHIVE_NOT_ADMISSIBLE');
 assert.equal(evaluate([source],{caseType:'OTHER_CASE'}).status,'CASE_RELEASE_UNCONFIRMED');
 const hidden=evaluate(null,{readError:true});
 assert.equal(hidden.indexObserved,null);
 assert.equal(hidden.productObserved,null);
});

test('wrong release, non-private source, missing flags or invented coverage are rejected',()=>{
 for(const edit of [
  {release_version:11},{release_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'},
  {origin:'https://invalid.example'},{release_hash:'f'.repeat(64)},
  {source_code:'GSC_CLICK_PERFORMANCE'},
  {source_channel:'OTHER'},{verification_state:'APPROVED'},
  {independent_qa_passed:true},{google_indexed_state_known:true},
  {source_health_promoted:true},{business_outcome_measured:true},
  {product_urls_sampled:207},{product_urls_in_release:23},
  {workflow_run_id:'not-a-run'},{workflow_run_id:9.5},{artifact_id:-1},{artifact_zip_sha256:'invalid'},
  {recorded_at:'invalid'},{recorded_at:'2026-10-18T22:28:43.335Z'},
 ]) {
  const x=evaluate([{...source,...edit}]);
  assert.equal(x.status,'ARCHIVE_NOT_ADMISSIBLE',JSON.stringify(edit));
  assert.equal(x.canPromoteSource,false);
 }
});

test('canonical Search Release identity drift is independently rejected',()=>{
 for(const edit of [
   {release_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'},
   {release_hash:'f'.repeat(64)},
   {release_status:'RETIRED'},
   {target_origin:'https://wrong-domain.invalid'},
   {release_version:11},
 ]){
   const res=evaluate([source],{canonicalRows:[{...canonical,...edit}]});
   assert.notEqual(res.status,'SOURCE_RETAINED_REVIEW_REQUIRED',JSON.stringify(edit));
   assert.equal(res.canPromoteSource,false);
 }
 const x=evaluate([{...source},{...source,release_id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'}]);
 assert.equal(x.status,'ARCHIVE_NOT_ADMISSIBLE');
});

test('owner page uses only a bounded server-only metadata SELECT and has no write path',()=>{
 const page=readFileSync('app/admin/company/work/[id]/page.tsx','utf8');
 const visual=readFileSync('components/admin/OwnerGdaeArchivedEvidence.tsx','utf8');
 const logic=readFileSync('lib/owner-ui/gdaeArchivedSourceGate.ts','utf8');
 assert.match(page,/getAdminReadClient\(\)/);
 assert.match(page,/from\('feya_growth_external_http_observation_receipts_v1'\)/);
 assert.match(page,/\.eq\('release_code', readinessReceipt\.releaseCode\)/);
 assert.match(page,/\.eq\('release_version', readinessReceipt\.releaseVersion\)/);
 assert.match(page,/from\('feya_search_releases_v1'\)/);
 assert.match(page,/\.select\('release_id,release_code,release_version,release_hash,release_status,target_origin'\)/);
 assert.match(page,/\.limit\(2\)/);
 assert.match(page,/\.order\('recorded_at', \{ ascending: false \}\)\.limit\(3\)/);
 assert.doesNotMatch(page+visual+logic,/\.rpc\(|\.insert\(|\.upsert\(|\.update\(|\.delete\(|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(page,/\.select\(['\"][^'\"]*payload_json/);
 assert.match(visual,/GDAE · ЦЕПОЧКА ДОКАЗАТЕЛЬСТВ/);
 assert.match(visual,/Независимая QA не зарегистрирована/);
 assert.match(visual,/ID, SHA и домен архива совпадают/);
 assert.match(visual,/План GMEL/);
 assert.match(visual,/productsUnobserved/);
 assert.match(visual,/Готовность определения метрики GMEL/);
 assert.match(page,/projectGmelMetricGate\(/);
 assert.match(page,/feya_commerce_v_growth_metric_registry_safe_v1/);
});
