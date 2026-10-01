import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isOwnerActionAuthRequired,
  isOwnerActionStepUpPath,
  ownerPreviewMutationAllowed,
} from '../../lib/ownerActionStepUpPolicy.ts';

test('owner action auth can be enabled without global admin auth',()=>{
  assert.equal(isOwnerActionAuthRequired({FEYA_OWNER_ACTION_AUTH_REQUIRED:'true',FEYA_ADMIN_AUTH_REQUIRED:'false'}),true);
  assert.equal(isOwnerActionAuthRequired({FEYA_OWNER_ACTION_AUTH_REQUIRED:'false',FEYA_ADMIN_AUTH_REQUIRED:'true'}),true);
  assert.equal(isOwnerActionAuthRequired({}),false);
});

test('step-up path allowlist is deliberately narrow',()=>{
  assert.equal(isOwnerActionStepUpPath('/api/admin/review/prices/baseline-adoption/approval'),true);
  assert.equal(isOwnerActionStepUpPath('/api/admin/review/prices/baseline-adoption'),true);
  for(const path of [
    '/api/admin/review-events',
    '/api/admin/company/execution-approval',
    '/api/admin/company/owner-attention/decision',
    '/api/admin/products/x/offer-promotion',
    '/admin/products',
  ]) assert.equal(isOwnerActionStepUpPath(path),false);
});

test('owner preview permits login POST but no business write outside the narrow step-up list',()=>{
  const enabled={FEYA_OWNER_ACTION_AUTH_REQUIRED:'true'};
  assert.equal(ownerPreviewMutationAllowed('/admin/login','POST',enabled),true);
  assert.equal(ownerPreviewMutationAllowed('/api/admin/review/prices/baseline-adoption/approval','POST',enabled),true);
  assert.equal(ownerPreviewMutationAllowed('/api/admin/review/prices/baseline-adoption','POST',enabled),true);
  assert.equal(ownerPreviewMutationAllowed('/api/admin/review-events','POST',enabled),false);
  assert.equal(ownerPreviewMutationAllowed('/api/admin/products/x/offer-promotion','POST',enabled),false);
  assert.equal(ownerPreviewMutationAllowed('/api/admin/review/prices/baseline-adoption','DELETE',enabled),false);
  assert.equal(ownerPreviewMutationAllowed('/api/admin/review/prices/baseline-adoption','POST',{}),false);
});
