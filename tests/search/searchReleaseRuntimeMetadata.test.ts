import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('release-bound metadata is request-time while visible collection payload stays cacheable',()=>{
  const indexation=readFileSync('lib/searchReleaseIndexationServer.ts','utf8');
  const collection=readFileSync('app/collections/[slug]/page.tsx','utf8');

  assert.match(indexation,/import \{connection\} from 'next\/server'/);
  assert.match(indexation,/releaseRobotsForPath[\s\S]*await connection\(\);[\s\S]*readSearchReleasePathState/);

  assert.match(collection,/import \{connection\} from 'next\/server'/);
  assert.match(collection,/readSearchLandingMetadata, readCachedSearchLandingRelease/);
  assert.match(collection,/generateMetadata[\s\S]*await connection\(\);/);
  assert.match(collection,/readSearchLandingMetadata\(slug\)/);
  assert.doesNotMatch(collection,/readCachedSearchLandingMetadata\(slug\)/);
  assert.match(collection,/readCachedSearchLandingRelease\(slug\)/);
});
