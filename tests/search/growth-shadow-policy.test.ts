import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('shadow TSEO uses canonical ACTIVE release evidence and never legacy portfolio readiness',()=>{
  const routeSource=readFileSync(new URL('../../app/api/admin/company/work/shadow-indexability/route.ts',import.meta.url),'utf8');
  const readerSource=readFileSync(new URL('../../lib/owner-ui/activeSearchReleaseEvidenceServer.ts',import.meta.url),'utf8');
  const newMigration=readFileSync(new URL('../../supabase/migrations/20261016003000_growth_os_active_search_authority_v1.sql',import.meta.url),'utf8');
  assert.match(routeSource,/getActiveSearchEvidence/);
  assert.match(routeSource,/TSEO_ACTIVE_SEARCH_RELEASE_AUDIT_V1/);
  assert.match(routeSource,/canonical_release_intent_not_google_actual_indexing/);
  assert.doesNotMatch(routeSource,/feya_commerce_v_page_indexability_readiness_v1|countReadiness\(/);
  assert.match(readerSource,/\.eq\('release_status', 'ACTIVE'\)/);
  assert.match(readerSource,/feya_search_release_items_v1/);
  assert.match(readerSource,/feya_storefront_approved_product_bindings_v1/);
  assert.match(newMigration,/VERIFY_ACTIVE_SEARCH_RELEASE/);
  assert.doesNotMatch(newMigration,/READ_PORTFOLIO_INDEXABILITY|feya_commerce_v_page_indexability_readiness_v1/);
});

test('TSEO snapshot completion remains in active work until independent review is finished',()=>{
  const presenter = readFileSync(new URL('../../lib/owner-ui/presenters.ts',import.meta.url),'utf8');
  const labels = readFileSync(new URL('../../lib/owner-ui/terminology.ts',import.meta.url),'utf8');
  assert.match(presenter,/TSEO_INDEXABILITY_SHADOW/);
  assert.match(presenter,/workflow_status\) === 'COMPLETED'/);
  assert.match(presenter,/\['CLOSED', 'CANCELLED'\]/);
  assert.match(presenter,/shadowAwaitingReview[\s\S]*WAITING_REVIEW/);
  assert.match(labels,/WAITING_REVIEW: 'Ожидает независимой проверки'/);
});
