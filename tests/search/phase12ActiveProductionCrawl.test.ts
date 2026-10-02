import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Phase 12 crawler supports the active v12 release contract',()=>{
  const crawler=readFileSync('tests/runtime/phase12-production-origin-crawl.mjs','utf8');
  const fixture=JSON.parse(readFileSync('tests/runtime/fixtures/phase12-wave-a-v12-production-crawl.json','utf8'));

  assert.equal(fixture.release.version,12);
  assert.equal(fixture.release.status,'ACTIVE');
  assert.equal(fixture.release.activeReleaseCount,1);
  assert.equal(fixture.indexCandidates.length,18);
  assert.equal(fixture.productNoindexPaths.length,207);

  assert.match(crawler,/phase12-wave-a-v12-production-crawl\.json/);
  assert.match(crawler,/releaseActive/);
  assert.match(crawler,/checkIndexPath/);
  assert.match(crawler,/ACTIVE release index\/canonical contract/);
  assert.match(crawler,/robots\.txt failed ACTIVE-release contract/);
  assert.match(crawler,/exact ACTIVE-release corpus contract/);
  assert.match(crawler,/releaseActive\?hasSitemap:!hasSitemap/);
  assert.match(crawler,/releaseActive[\s\S]*!hasNoindex/);
});
