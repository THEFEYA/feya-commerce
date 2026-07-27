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

test('catalog and pilot routes use one writer plus one strong final editor', () => {
  const routes = [
    readFileSync(new URL('../../app/api/admin/seo-engine/catalog-draft-generate/route.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('../../app/api/admin/seo-engine/draft-generate-pilot-auto/route.ts', import.meta.url), 'utf8'),
  ];

  routes.forEach((route) => {
    assert.ok(route.includes('Within each About sentence, use each meaningful content noun only once'));
    assert.ok(route.includes('Two honest reasons are correct when the evidence does not support a third'));
    assert.ok(route.includes('visual_truth_evidence'));
    assert.ok(route.includes('required_why_plan'));
    assert.ok(route.includes('required_section_plan'));
    assert.ok(route.includes('One short factual sentence is sufficient'));
    assert.ok(route.includes('Never infer photography performance'));
    assert.ok(route.includes('firstGeneration.output'));
    assert.match(
      route,
      /generateSeoDraftWithOpenAi\(finalReviewPrompt,\s*\{[\s\S]*?FEYA_SEO_OPENAI_EDITOR_MODEL[\s\S]*?reasoningEffort: 'high'/,
    );
    assert.ok(route.includes('generation_passes: 2'));
    assert.equal(/generateSeoDraftWithOpenAi\(residualReviewPrompt/.test(route), false);
    assert.equal(/generateSeoDraftWithOpenAi\(repairPrompt/.test(route), false);
  });
});
