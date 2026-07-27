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

test('catalog and pilot routes give the bounded residual review the same line-editing contract', () => {
  const routes = [
    readFileSync(new URL('../../app/api/admin/seo-engine/catalog-draft-generate/route.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('../../app/api/admin/seo-engine/draft-generate-pilot-auto/route.ts', import.meta.url), 'utf8'),
  ];

  routes.forEach((route) => {
    assert.ok(route.includes('Within each About sentence, use each meaningful content noun only once'));
    assert.match(
      route,
      /generateSeoDraftWithOpenAi\(residualReviewPrompt,\s*\{[\s\S]*?FEYA_SEO_OPENAI_EDITOR_MODEL[\s\S]*?reasoningEffort: 'medium'/,
    );
  });
});
