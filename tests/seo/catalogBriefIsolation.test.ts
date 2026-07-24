import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('catalog contract is isolated from the hardcoded pilot brief', () => {
  const server = readFileSync(new URL('../../lib/seoBriefContractServer.ts', import.meta.url), 'utf8');
  const catalog = readFileSync(new URL('../../lib/seoCatalogBrief.ts', import.meta.url), 'utf8');
  assert.equal(server.includes('buildSeoPilotBrief'), false);
  assert.equal(catalog.includes('PRIMARY_TRUTH_ORDER'), false);
  assert.equal(catalog.includes("PILOT_PRODUCT_ID"), false);
});
