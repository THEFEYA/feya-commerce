import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Production crawler checks the active Search v13 release contract',()=>{
  const crawler=readFileSync('tests/runtime/phase12-production-origin-crawl.mjs','utf8');
  const v12=JSON.parse(readFileSync('tests/runtime/fixtures/phase12-wave-a-v12-production-crawl.json','utf8'));
  const fixture=JSON.parse(readFileSync('tests/runtime/fixtures/search-v13-production-crawl.json','utf8'));

  // v12 stays as immutable historical evidence for its other consumers.
  assert.equal(v12.release.version,12);
  assert.equal(v12.indexCandidates.length,18);
  assert.equal(v12.productNoindexPaths.length,207);

  // v13 = the 18 v12 landings + the 207 PDPs promoted to index; no new URLs.
  assert.equal(fixture.release.version,13);
  assert.equal(fixture.release.status,'ACTIVE');
  assert.equal(fixture.release.activeReleaseCount,1);
  assert.equal(fixture.indexCandidates.length,225);
  assert.equal(fixture.productNoindexPaths.length,0);
  assert.deepEqual([...fixture.indexCandidates].sort(),[...new Set([...v12.indexCandidates,...v12.productNoindexPaths])].sort());
  assert.deepEqual(fixture.utilityNoindexPaths,v12.utilityNoindexPaths);
  assert.deepEqual(fixture.retiredRedirects,v12.retiredRedirects);
  assert.deepEqual(fixture.filterNoindexPaths,v12.filterNoindexPaths);

  assert.match(crawler,/search-v13-production-crawl\.json/);
  assert.match(crawler,/releaseActive/);
  assert.match(crawler,/checkIndexPath/);
  assert.match(crawler,/ACTIVE release index\/canonical contract/);
  assert.match(crawler,/robots\.txt failed ACTIVE-release contract/);
  assert.match(crawler,/exact ACTIVE-release corpus contract/);
  assert.match(crawler,/releaseActive\?hasSitemap:!hasSitemap/);
  assert.match(crawler,/releaseActive[\s\S]*!hasNoindex/);
});
