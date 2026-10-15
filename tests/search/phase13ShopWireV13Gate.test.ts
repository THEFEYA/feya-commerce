import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isApprovedV13Presentation,
  PUBLIC_V13_PROJECT,
  PHASE13_SHOP_WIRE_QA_BRANCH,
} from '../../lib/approvedV13Presentation.ts';

test('Shop payload QA renders exact frozen V13 only on a single protected Preview branch and project', () => {
  const base = {
    VERCEL: '1',
    VERCEL_PROJECT_ID: PUBLIC_V13_PROJECT,
    VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: PHASE13_SHOP_WIRE_QA_BRANCH,
  };
  assert.equal(isApprovedV13Presentation(base), true);
  assert.equal(isApprovedV13Presentation({...base,VERCEL_ENV:'production'}), true);
  assert.equal(isApprovedV13Presentation({...base,VERCEL_ENV:'development'}), false);
  assert.equal(isApprovedV13Presentation({...base,VERCEL_GIT_COMMIT_REF:'another-branch'}), false);
  assert.equal(isApprovedV13Presentation({...base,VERCEL_PROJECT_ID:'another-project'}), false);
  assert.equal(isApprovedV13Presentation({...base,FEYA_OWNER_PREVIEW_DISABLED:'true'}), false);
  assert.equal(isApprovedV13Presentation({...base,VERCEL:'0'}), false);
});

test('V13 QA preview does not grant approved PDP copy publication or indexing', () => {
  assert.equal(PHASE13_SHOP_WIRE_QA_BRANCH,'work/phase13-shop-wire-payload-20261015');
  assert.equal(isApprovedV13Presentation({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:PHASE13_SHOP_WIRE_QA_BRANCH}),false);
});