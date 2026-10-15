import test from 'node:test';
import assert from 'node:assert/strict';
import { isOwnerActionStepUpPath,ownerPreviewMutationAllowed } from '../../lib/ownerActionStepUpPolicy.ts';

const route='/api/admin/company/work/shadow-indexability';
const preview={VERCEL:'1',VERCEL_ENV:'preview',FEYA_OWNER_ACTION_AUTH_REQUIRED:'true'};
test('TSEO manual shadow route is recognized as protected owner-only action',()=>{
  assert.equal(isOwnerActionStepUpPath(route),true);
});
test('preview blocks shadow work by default and never opens unrelated mutations',()=>{
  assert.equal(ownerPreviewMutationAllowed(route,'POST',preview),false);
  assert.equal(ownerPreviewMutationAllowed(route,'GET',preview),false);
  assert.equal(ownerPreviewMutationAllowed('/api/admin/company/execution-approval','POST',preview),false);
});
test('dedicated feature flag opens only POST for the owner step-up route',()=>{
  const enabled={...preview,FEYA_GROWTH_SHADOW_WORK_ENABLED:'true'};
  assert.equal(ownerPreviewMutationAllowed(route,'POST',enabled),true);
  assert.equal(ownerPreviewMutationAllowed(route,'GET',enabled),false);
  assert.equal(ownerPreviewMutationAllowed('/api/admin/review-events','POST',enabled),false);
  assert.equal(ownerPreviewMutationAllowed('/api/admin/company/execution-approval','POST',enabled),false);
});
test('feature flag without mandatory owner step-up does not allow public POST',()=>{
  assert.equal(ownerPreviewMutationAllowed(route,'POST',{
    FEYA_OWNER_ACTION_AUTH_REQUIRED:'false',FEYA_GROWTH_SHADOW_WORK_ENABLED:'true'
  }),false);
});
