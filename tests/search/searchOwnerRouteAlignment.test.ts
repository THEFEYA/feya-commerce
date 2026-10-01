import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {SEARCH_OWNER_ROUTES,PENDING_SEARCH_OWNER_RENAMES} from '../../config/searchOwnerRoutes.ts';
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

test('only Burning Man and Performance are owner-pending pre-index renames',()=>{
  assert.deepEqual(
    PENDING_SEARCH_OWNER_RENAMES.map((route)=>[route.currentPath,route.preferredPath]),
    [
      ['/collections/burning-man-looks','/collections/burning-man-outfits'],
      ['/collections/stage-outfits','/collections/performance-costumes'],
    ],
  );
  assert.equal(getSearchLandingCandidate('burning-man-outfits'),null);
  assert.equal(getSearchLandingCandidate('performance-costumes'),null);
});

test('public navigation still uses the approved current routes until the owner approves renames',()=>{
  const sources=[
    readFileSync('config/storefrontNavigation.ts','utf8'),
    readFileSync('config/discoveryHubs.ts','utf8'),
    readFileSync('config/homePresentation.ts','utf8'),
    readFileSync('components/Footer.tsx','utf8'),
  ].join('\n');
  assert.match(sources,/\/collections\/burning-man-looks/);
  assert.match(sources,/\/collections\/stage-outfits/);
  assert.doesNotMatch(sources,/\/collections\/burning-man-outfits/);
  assert.doesNotMatch(sources,/\/collections\/performance-costumes/);
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

test('Phase 9 does not install redirects before the explicit owner decision',()=>{
  const nextConfig=readFileSync('next.config.ts','utf8');
  assert.doesNotMatch(nextConfig,/burning-man-outfits|performance-costumes/);
});
