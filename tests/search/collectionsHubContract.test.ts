import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {getBusinessCaseLandingCandidates} from '../../config/searchLandingCandidates.ts';

test('collections hub exposes every current business-case collection through release-aware metadata',async()=>{
  const page=await readFile(new URL('../../app/collections/page.tsx',import.meta.url),'utf8');
  assert.match(page,/releaseRobotsForPath/);
  assert.match(page,/getBusinessCaseLandingCandidates/);
  assert.match(page,/\/collections\/\$\{collection\.slug\}/);
  assert.equal(getBusinessCaseLandingCandidates().length,10);
});

test('homepage crawl path points Explore collections at the server-rendered collection hub',async()=>{
  const home=await readFile(new URL('../../app/page.tsx',import.meta.url),'utf8');
  assert.match(home,/href="\/collections" className="btn-ghost">Explore collections/);
});
