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

test('the exact owner-reviewed PDP override is applied before collection demotion', () => {
  const catalog = readFileSync(new URL('../../lib/seoCatalogBrief.ts', import.meta.url), 'utf8');
  const override = catalog.indexOf("if (ownerReviewedPdpPrimary) return 'primary'");
  const collection = catalog.indexOf("if (COLLECTION_BUCKET_PATTERN.test(bucket)) return 'collection'");

  assert.ok(override > -1);
  assert.ok(override < collection);
});

test('Listing Master persists unresolved Product Truth focus without opening generation', () => {
  const listingMaster = readFileSync(
    new URL('../../app/admin/listing-master/ListingMasterPage.tsx', import.meta.url),
    'utf8',
  );

  assert.equal(listingMaster.includes("return saveFailure(\n      'option_truth_mismatch'"), false);
  assert.ok(listingMaster.includes("decisionStatus === 'blocked_product_truth'"));
  assert.ok(listingMaster.includes("status.code === 'ready' && decisionIsCurrent"));
});

test('catalog route uses one bounded writer with no automatic editor or retry', () => {
  const route = readFileSync(
    new URL('../../app/api/admin/seo-engine/catalog-draft-generate/route.ts', import.meta.url),
    'utf8',
  );

  assert.ok(route.includes('buildCompactSeoWriterPrompt'));
  assert.ok(route.includes('normalizeSeoEditorialCandidate'));
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
  assert.ok(candidateRoute.includes('getSeoKeywordSelectionBlockers(draft)'));
  assert.ok(client.includes('enforce_portfolio_strategy: true'));
  assert.equal(client.includes('enforce_portfolio_strategy: false'), false);
});

test('unsaved queue candidates receive an exact read-only preflight before generation', () => {
  const candidateRoute = readFileSync(
    new URL('../../app/api/admin/seo-engine/first-draft-candidates/route.ts', import.meta.url),
    'utf8',
  );
  const client = readFileSync(
    new URL('../../app/admin/seo-engine/first-real-draft/FirstRealDraftClient.tsx', import.meta.url),
    'utf8',
  );

  assert.ok(candidateRoute.includes("verification_level: 'catalog'"));
  assert.ok(candidateRoute.includes("verification_level: 'exact'"));
  assert.ok(client.includes('!item.has_saved_draft'));
  assert.ok(client.includes('item.verification_level !== \'exact\''));
  assert.ok(client.includes('index += 3'));
  assert.ok(client.includes('/api/admin/seo-engine/first-draft-candidates?product_id='));
  assert.ok(client.includes("'exact_queue_preflight_failed'"));
  assert.ok(client.includes("verification_level === 'exact'"));
});

test('legacy null keyword placeholders cannot break exact Product Truth preflight', () => {
  const server = readFileSync(
    new URL('../../lib/seoBriefContractServer.ts', import.meta.url),
    'utf8',
  );
  const catalog = readFileSync(
    new URL('../../lib/seoCatalogBrief.ts', import.meta.url),
    'utf8',
  );

  assert.ok(server.includes('selectedRows.filter(isRecord)'));
  assert.ok(server.includes('value.filter(isRecord)'));
  assert.ok(catalog.includes('keyword?.keyword || keyword?.keyword_norm'));
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

test('draft storage reapplies zero-token editorial normalization before validation', () => {
  const saveRoute = readFileSync(
    new URL('../../app/api/admin/seo-engine/draft-save/route.ts', import.meta.url),
    'utf8',
  );

  assert.ok(saveRoute.includes('normalizeReviewDraftForSeoPack(providedAgentOutput, bundle.seoPackDraft)'));
  assert.ok(saveRoute.indexOf('normalizeReviewDraftForSeoPack(providedAgentOutput, bundle.seoPackDraft)') < saveRoute.indexOf('validateSeoAgentOutput(agentOutput)'));
  assert.equal(saveRoute.includes('generateSeoDraftWithOpenAi'), false);
});

test('saved-draft renormalization requires an explicit resave flag and stays token-free', () => {
  const page = readFileSync(
    new URL('../../app/admin/seo-storefront-preview/page.tsx', import.meta.url),
    'utf8',
  );
  const client = readFileSync(
    new URL('../../app/admin/seo-engine/first-real-draft/FirstRealDraftClient.tsx', import.meta.url),
    'utf8',
  );
  const previewRoute = readFileSync(
    new URL('../../app/api/admin/seo-engine/saved-draft-preview/route.ts', import.meta.url),
    'utf8',
  );

  assert.ok(page.includes("params.resave === '1' && loadSavedDraft"));
  assert.ok(client.includes('setSavedCurrentResult(!resaveSavedDraft)'));
  assert.ok(client.includes("&renormalize=${resaveSavedDraft ? '1' : '0'}"));
  assert.ok(client.includes('Сохранить новую нормализованную версию'));
  assert.ok(previewRoute.includes("searchParams.get('renormalize') === '1'"));
  assert.ok(previewRoute.includes('normalizeReviewDraftForSeoPack(data.agent_output_snapshot || {}, bundle.seoPackDraft)'));
  assert.ok(previewRoute.indexOf('normalizeReviewDraftForSeoPack(data.agent_output_snapshot || {}, bundle.seoPackDraft)') < previewRoute.indexOf('validateSeoAgentOutput(output)'));
  assert.equal(client.includes('generateSeoDraftWithOpenAi'), false);
  assert.equal(previewRoute.includes('generateSeoDraftWithOpenAi'), false);
});
