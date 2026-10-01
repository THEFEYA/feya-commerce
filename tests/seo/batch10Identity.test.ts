import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeReviewDraftForSeoPack } from '../../lib/seoReviewDraftNormalization.ts';

test('reviewed details survive storage normalization only for the matching current product identity', () => {
  const draft={product_truth:{canonical_product_id:'82d2dc58-e635-4bc1-8571-2587641e627f',color:'Red',included_components:['Top','Skirt']},manual_focus:{event:['stage']},keyword_roles:{primary:[{keyword:'stage outfit'}]}};
  const candidate={seo_title:'Red Stage Outfit with Studded Details',h1:'Red Stage Outfit with Studded Details',generation_notes:[]};
  const result=normalizeReviewDraftForSeoPack(candidate,draft);
  assert.equal(result.seo_title,candidate.seo_title);
  assert.deepEqual(normalizeReviewDraftForSeoPack(result,draft),result);
  assert.notEqual(normalizeReviewDraftForSeoPack(candidate,{...draft,product_truth:{...draft.product_truth,canonical_product_id:'unreviewed'}}).seo_title,candidate.seo_title);
  assert.notEqual(normalizeReviewDraftForSeoPack(candidate,{...draft,keyword_roles:{primary:[{keyword:'stage performance outfit'}]}}).seo_title,candidate.seo_title);
  assert.notEqual(normalizeReviewDraftForSeoPack(candidate,{...draft,product_truth:{...draft.product_truth,color:'Gold'}}).seo_title,candidate.seo_title);
  assert.notEqual(normalizeReviewDraftForSeoPack(candidate,{...draft,manual_focus:{event:['festival']}}).seo_title,candidate.seo_title);
});
