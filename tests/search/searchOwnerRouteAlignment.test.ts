import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {SEARCH_OWNER_ROUTES,PENDING_SEARCH_OWNER_RENAMES,APPROVED_SEARCH_OWNER_RENAMES} from '../../config/searchOwnerRoutes.ts';
import {getBusinessCaseLandingCandidates,getSearchLandingCandidate} from '../../config/searchLandingCandidates.ts';

test('Phase 9 binds exactly ten commercial owners to the current governed landing routes',()=>{
  const candidates=getBusinessCaseLandingCandidates();
  assert.equal(candidates.length,10);
  assert.equal(SEARCH_OWNER_ROUTES.length,10);
  const candidateByCode=new Map(candidates.map((candidate)=>[candidate.code,candidate]));
  for(const route of SEARCH_OWNER_ROUTES){
    const candidate=candidateByCode.get(route.code);
    assert.ok(candidate,route.code);
    assert.equal(route.currentPath,`/collections/${candidate.slug}`);
    assert.equal(candidate.searchStatus,'business_case_noindex');
  }
});

test('Burning Man and Performance renames are owner-approved and no rename remains pending',()=>{
  assert.equal(PENDING_SEARCH_OWNER_RENAMES.length,0);
  assert.deepEqual(
    APPROVED_SEARCH_OWNER_RENAMES.map((route)=>[route.previousPath,route.currentPath]),
    [
      ['/collections/burning-man-looks','/collections/burning-man-outfits'],
      ['/collections/stage-outfits','/collections/performance-costumes'],
    ],
  );
  assert.equal(getSearchLandingCandidate('burning-man-outfits')?.code,'BURNING_MAN_OUTFITS');
  assert.equal(getSearchLandingCandidate('performance-costumes')?.code,'PERFORMANCE_COSTUMES');
  assert.equal(getSearchLandingCandidate('burning-man-looks'),null);
  assert.equal(getSearchLandingCandidate('stage-outfits'),null);
});

test('public navigation uses canonical owner routes and never links to retired slugs',()=>{
  const sources=[
    readFileSync('config/storefrontNavigation.ts','utf8'),
    readFileSync('config/discoveryHubs.ts','utf8'),
    readFileSync('config/homePresentation.ts','utf8'),
    readFileSync('components/Footer.tsx','utf8'),
  ].join('\n');
  assert.match(sources,/\/collections\/burning-man-outfits/);
  assert.match(sources,/\/collections\/performance-costumes/);
  assert.doesNotMatch(sources,/\/collections\/burning-man-looks/);
  assert.doesNotMatch(sources,/\/collections\/stage-outfits/);
});

test('owner pages stay release-gated noindex and related PDP links come only from governed memberships',()=>{
  const collection=readFileSync('app/collections/[slug]/page.tsx','utf8');
  const related=readFileSync('lib/searchProductLandingLinks.ts','utf8');
  const release=readFileSync('lib/searchReleaseIndexationServer.ts','utf8');
  assert.match(collection,/releaseRobotsForPath\(\`\/collections\/\$\{candidate\.slug\}\`\)/);
  assert.match(collection,/export const instant = false/);
  assert.match(collection,/if\(!candidate\|\|candidate\.searchStatus==='hold_noindex'\)notFound\(\)/);
  assert.ok(
    collection.indexOf("if(!candidate||candidate.searchStatus==='hold_noindex')notFound()")
      < collection.indexOf('return <Suspense'),
    'Unknown or HOLD collection slugs must fail before any streamed collection shell',
  );
  assert.match(related,/feya_search_membership_items_v1/);
  assert.match(related,/eligibility_status','eligible'/);
  assert.match(related,/orderability_status','confirmed'/);
  assert.match(related,/candidate\.searchStatus!=='business_case_noindex'/);
  assert.match(release,/return\{index:false,follow:true,nocache:true\}/);
});

test('preferred owner URLs are no longer blocked by pre-approval middleware',()=>{
  const middleware=readFileSync('middleware.ts','utf8');
  assert.doesNotMatch(middleware,/PENDING_SEARCH_OWNER_RENAMES|PENDING_SEARCH_OWNER_PATHS/);
  assert.doesNotMatch(middleware,/\/collections\/burning-man-outfits|\/collections\/performance-costumes/);
});

test('owner-approved old URLs have permanent redirects and migration preserves canonical history',()=>{
  const nextConfig=readFileSync('next.config.ts','utf8');
  const migration=readFileSync('supabase/migrations/20261001143000_phase12_owner_route_renames_v1.sql','utf8');

  assert.match(nextConfig,/source: '\/collections\/burning-man-looks', destination: '\/collections\/burning-man-outfits', permanent: true/);
  assert.match(nextConfig,/source: '\/collections\/stage-outfits', destination: '\/collections\/performance-costumes', permanent: true/);
  assert.match(migration,/OWNER_APPROVED_PREINDEX_ROUTE_RENAME/);
  assert.match(migration,/feya_commerce_seo_page_url_history_v1/);
  assert.match(migration,/feya_search_page_versions_v1/);
  assert.match(migration,/version_number\+1/);
  assert.match(migration,/extensions\.digest/);
  assert.match(migration,/phase12_owner_route_rename_requires_zero_active_search_releases/);
  assert.match(migration,/phase12_owner_route_rename_stale_latest_content/);
});
