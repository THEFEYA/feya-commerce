// @ts-nocheck
import { NextResponse } from 'next/server';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import { canSaveSeoPackDraft } from '@/lib/seoPackContract';
import { buildSeoAgentPromptContract, summarizeSeoAgentPromptContract } from '@/lib/seoAgentDraftPrompt';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/admin/seo-engine/draft-generate',
    method: 'POST',
    mode: 'protected_generation_entrypoint',
    status: 'blocked_by_feature_flag',
    feature_flag: 'FEYA_SEO_AI_GENERATION_ENABLED',
    guardrails: generationGuardrails(),
    expected_body: {
      product_id: 'canonical_product_id UUID',
      dry_run: true,
    },
    generation_pipeline: [
      'load SeoAgentInputContract',
      'build seo_agent_prompt_v1',
      'call model only when feature flag and gates pass',
      'validate seo_agent_output_v1',
      'return draft for human review',
      'do not save automatically in this route',
    ],
    note: 'This route is intentionally gated. It does not call OpenAI unless FEYA_SEO_AI_GENERATION_ENABLED=true and all QA gates pass.',
  });
}

export async function POST(request: Request) {
  const body = await safeJson(request);
  const productId = String(body.product_id || body.productId || '').trim();
  const dryRun = body.dry_run !== false;
  const includePrompt = body.include_prompt === true;
  const generationEnabled = process.env.FEYA_SEO_AI_GENERATION_ENABLED === 'true';
  const hasServerKey = Boolean(process.env.OPENAI_API_KEY);
  const hasClientExposedKey = Boolean(process.env.NEXT_PUBLIC_OPENAI_API_KEY);

  if (!productId) {
    return NextResponse.json({
      ok: false,
      status: 'missing_product_id',
      error: 'product_id is required.',
      guardrails: generationGuardrails(),
    }, { status: 400 });
  }

  if (hasClientExposedKey) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_client_key_leak_risk',
      error: 'NEXT_PUBLIC_OPENAI_API_KEY must not exist. OpenAI API keys must be server-only.',
      guardrails: generationGuardrails(),
    }, { status: 409 });
  }

  const bundle = await buildSeoBriefContractBundle(productId);
  if (bundle.error) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_missing_supabase_env',
      error: bundle.error,
      guardrails: generationGuardrails(),
    }, { status: 503 });
  }

  if (!bundle.product || !bundle.seoPackDraft || !bundle.aiAgentInput) {
    return NextResponse.json({
      ok: false,
      status: 'product_not_found',
      error: 'Product not found in Product Focus view.',
      product_id: productId,
      guardrails: generationGuardrails(),
    }, { status: 404 });
  }

  const promptContract = buildSeoAgentPromptContract(bundle.aiAgentInput);
  const outputValidationGate = validateSeoAgentOutput(null);
  const canSaveDraft = canSaveSeoPackDraft(bundle.seoPackDraft);
  const blockers = collectGenerationBlockers({ generationEnabled, hasServerKey, dryRun, canSaveDraft, seoPackDraft: bundle.seoPackDraft });
  const preflightPayload = {
    route: '/api/admin/seo-engine/draft-generate',
    feature_flag: {
      name: 'FEYA_SEO_AI_GENERATION_ENABLED',
      enabled: generationEnabled,
    },
    dry_run: dryRun,
    source: {
      product_id: bundle.seoPackDraft.canonical_product_id,
      matched_etsy_listing_id: bundle.seoPackDraft.matched_etsy_listing_id,
      selected_keyword_count: bundle.keywords.length,
    },
    readiness: {
      has_server_openai_key: hasServerKey,
      has_client_exposed_openai_key: hasClientExposedKey,
      can_save_seo_pack_draft: canSaveDraft,
      prompt_contract_ready: true,
      output_validator_ready: true,
    },
    prompt_contract_summary: summarizeSeoAgentPromptContract(promptContract),
    prompt_contract: includePrompt ? promptContract : undefined,
    output_validation_gate: {
      status: 'ready',
      dry_run_null_output_result: outputValidationGate,
      note: 'The validator is wired. It will validate the real model JSON before any future draft save.',
    },
    seo_pack_draft: bundle.seoPackDraft,
    ai_agent_input: bundle.aiAgentInput,
    guardrails: generationGuardrails(),
  };

  if (blockers.length) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_before_generation',
      blocked: true,
      blockers,
      mode: 'preflight_only',
      ...preflightPayload,
    }, { status: 423 });
  }

  return NextResponse.json({
    ok: false,
    status: 'generation_not_implemented_yet',
    blocked: true,
    mode: 'preflight_passed_no_model_call',
    message: 'Preflight passed, prompt contract is ready, but the OpenAI model call is intentionally not implemented in this step.',
    ...preflightPayload,
  }, { status: 501 });
}

function collectGenerationBlockers({ generationEnabled, hasServerKey, dryRun, canSaveDraft, seoPackDraft }) {
  const blockers = [];
  if (!generationEnabled) blockers.push({ code: 'feature_flag_disabled', message: 'FEYA_SEO_AI_GENERATION_ENABLED is not true.' });
  if (!hasServerKey) blockers.push({ code: 'missing_openai_key', message: 'OPENAI_API_KEY is missing on the server.' });
  if (dryRun) blockers.push({ code: 'dry_run_only', message: 'dry_run is enabled, so no model call or save is allowed.' });
  if (!canSaveDraft) blockers.push({ code: 'seo_pack_draft_not_saveable', message: 'SeoPackDraftContract did not pass save gates.' });
  if (seoPackDraft?.similarity_check?.status === 'not_checked') blockers.push({ code: 'similarity_not_checked', message: 'Similarity/cannibalization check is required before publish readiness.' });
  return blockers;
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function generationGuardrails() {
  return [
    'Generation is disabled unless FEYA_SEO_AI_GENERATION_ENABLED=true.',
    'Default request mode is dry_run=true.',
    'No OpenAI call is made while blockers exist.',
    'No Supabase write is performed by this route in this step.',
    'No publish action is performed by this route.',
    'The model must consume SeoAgentInputContract, not raw product rows.',
    'The model must return seo_agent_output_v1 JSON only.',
    'Model output must pass validator before any future save.',
    'Product truth and QA gates must outrank keyword volume.',
  ];
}
