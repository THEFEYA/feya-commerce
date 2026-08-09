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

test('catalog route uses one bounded writer with no automatic editor or retry', () => {
  const route = readFileSync(
    new URL('../../app/api/admin/seo-engine/catalog-draft-generate/route.ts', import.meta.url),
    'utf8',
  );

  assert.ok(route.includes('buildCompactSeoWriterPrompt'));
  assert.ok(route.includes('normalizeDeterministicSeoIdentity'));
  assert.ok(route.includes('normalizeCodeOwnedPdpBlockOrder'));
  assert.ok(route.indexOf('compactWriter.preflight.ok') < route.indexOf('await generateSeoDraftWithOpenAi('));
  assert.equal((route.match(/await generateSeoDraftWithOpenAi\(/g) || []).length, 1);
  assert.ok(route.includes('generation_passes: 1'));
  assert.ok(route.includes('automatic_retries: 0'));
  assert.ok(route.includes("reasoningEffort: 'low'"));
  assert.ok(route.includes('timeoutMs: 120_000'));
  assert.ok(route.includes('maxOutputTokens: 2_500'));
  assert.ok(route.includes("reason: 'manual_explicit_action_only'"));
  assert.equal(route.includes('FEYA_SEO_OPENAI_EDITOR_MODEL'), false);
  assert.equal(route.includes('shouldRunFinalReview'), false);
});

test('exact Primary ownership is checked before the only paid writer call', () => {
  const route = readFileSync(
    new URL('../../app/api/admin/seo-engine/catalog-draft-generate/route.ts', import.meta.url),
    'utf8',
  );
  const candidateRoute = readFileSync(
    new URL('../../app/api/admin/seo-engine/first-draft-candidates/route.ts', import.meta.url),
    'utf8',
  );
  const client = readFileSync(
    new URL('../../app/admin/seo-engine/first-real-draft/FirstRealDraftClient.tsx', import.meta.url),
    'utf8',
  );

  assert.ok(route.includes('getSeoPortfolioGenerationBlockers(portfolioStrategy)'));
  assert.ok(route.indexOf('getSeoPortfolioGenerationBlockers(portfolioStrategy)') < route.indexOf('await generateSeoDraftWithOpenAi('));
  assert.ok(candidateRoute.includes('getSeoPortfolioGenerationBlockers(bundle?.portfolioStrategy)'));
  assert.ok(client.includes('enforce_portfolio_strategy: true'));
  assert.equal(client.includes('enforce_portfolio_strategy: false'), false);
});

test('legacy two-pass pilot route is disabled before any OpenAI call', () => {
  const route = readFileSync(
    new URL('../../app/api/admin/seo-engine/draft-generate-pilot-auto/route.ts', import.meta.url),
    'utf8',
  );

  assert.equal(route.includes('generateSeoDraftWithOpenAi'), false);
  assert.equal(route.includes('OPENAI_API_KEY'), false);
  assert.ok(route.includes('deprecated_multi_pass_route_disabled'));
  assert.ok(route.includes('openai_calls: 0'));
  assert.ok(route.includes('{ status: 410 }'));
});

test('targeted repair is a separate one-call route behind an explicit attempt gate', () => {
  const repairRoute = readFileSync(
    new URL('../../app/api/admin/seo-engine/catalog-draft-repair/route.ts', import.meta.url),
    'utf8',
  );
  const client = readFileSync(
    new URL('../../app/admin/seo-engine/first-real-draft/FirstRealDraftClient.tsx', import.meta.url),
    'utf8',
  );

  assert.equal((repairRoute.match(/await generateSeoDraftWithOpenAi\(/g) || []).length, 1);
  assert.ok(repairRoute.includes('repairAttempt !== 1'));
  assert.ok(repairRoute.includes('automatic_retry_calls: 0'));
  assert.equal(repairRoute.includes('setInterval'), false);
  assert.ok(client.includes("fetch('/api/admin/seo-engine/catalog-draft-repair'"));
  assert.ok(client.includes('onClick={runTargetedRepair}'));
  assert.ok(client.includes('repair_attempt: 1'));
  assert.equal(client.includes('void runTargetedRepair()'), false);
});
