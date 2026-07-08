// @ts-nocheck
import { NextResponse } from 'next/server';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { buildSeoPilotBrief } from '@/lib/seoPilotDraft';
import { buildSeoAgentInputFromDraft, buildSeoPackDraftContractFromBrief } from '@/lib/seoPackContractBuilder';
import { canSaveSeoPackDraft } from '@/lib/seoPackContract';

const FOCUS_VIEW = 'feya_commerce_v_listing_master_product_focus_v1';
const DECISIONS_TABLE = 'feya_commerce_listing_master_decisions_v1';
const PRODUCT_SELECT = 'canonical_product_id,matched_etsy_listing_id,product_slug,card_title,h1,seo_title,meta_description,product_type,material,color,canonical_color_label,category_label,source_category_label,operator_section_label,world_label,primary_image_url,primary_image_alt,parent_components_json,child_components_json,component_groups_json,needs_component_review_count,has_component_review_risk,focus_text';

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
    note: 'This route is intentionally gated. It does not call OpenAI unless FEYA_SEO_AI_GENERATION_ENABLED=true and all QA gates pass.',
  });
}

export async function POST(request: Request) {
  const body = await safeJson(request);
  const productId = String(body.product_id || body.productId || '').trim();
  const dryRun = body.dry_run !== false;
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

  const data = await loadSeoBriefData(productId);
  if (data.error) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_missing_supabase_env',
      error: data.error,
      guardrails: generationGuardrails(),
    }, { status: 503 });
  }

  if (!data.product) {
    return NextResponse.json({
      ok: false,
      status: 'product_not_found',
      error: 'Product not found in Product Focus view.',
      product_id: productId,
      guardrails: generationGuardrails(),
    }, { status: 404 });
  }

  const brief = buildSeoPilotBrief(data.product, data.keywords, data.manualFocus);
  const seoPackDraft = attachProductIdentity(buildSeoPackDraftContractFromBrief(brief), data);
  const aiAgentInput = buildSeoAgentInputFromDraft(seoPackDraft);
  const canSaveDraft = canSaveSeoPackDraft(seoPackDraft);
  const blockers = collectGenerationBlockers({ generationEnabled, hasServerKey, dryRun, canSaveDraft, seoPackDraft });

  if (blockers.length) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_before_generation',
      blocked: true,
      blockers,
      route: '/api/admin/seo-engine/draft-generate',
      mode: 'preflight_only',
      feature_flag: {
        name: 'FEYA_SEO_AI_GENERATION_ENABLED',
        enabled: generationEnabled,
      },
      dry_run: dryRun,
      source: {
        product_id: seoPackDraft.canonical_product_id,
        matched_etsy_listing_id: seoPackDraft.matched_etsy_listing_id,
        selected_keyword_count: data.keywords.length,
      },
      readiness: {
        has_server_openai_key: hasServerKey,
        has_client_exposed_openai_key: hasClientExposedKey,
        can_save_seo_pack_draft: canSaveDraft,
      },
      seo_pack_draft: seoPackDraft,
      ai_agent_input: aiAgentInput,
      guardrails: generationGuardrails(),
    }, { status: 423 });
  }

  return NextResponse.json({
    ok: false,
    status: 'generation_not_implemented_yet',
    blocked: true,
    route: '/api/admin/seo-engine/draft-generate',
    mode: 'preflight_passed_no_model_call',
    message: 'Preflight passed, but the OpenAI model call is intentionally not implemented in this step.',
    seo_pack_draft: seoPackDraft,
    ai_agent_input: aiAgentInput,
    guardrails: generationGuardrails(),
  }, { status: 501 });
}

async function loadSeoBriefData(productId: string) {
  const supabase = getSupabaseServiceClient() || getSupabaseReadClient();
  if (!supabase) return { product: null, decision: null, keywords: [], manualFocus: {}, error: getMissingSupabaseEnvMessage() };

  let decisionRows = [];
  if (getSupabaseServiceClient()) {
    let q = supabase.from(DECISIONS_TABLE).select('canonical_product_id,product_slug,matched_etsy_listing_id,auto_focus_json,manual_focus_json,selected_strategy,selected_keywords_json,decision_status,updated_at,created_at').limit(2000);
    if (productId) q = q.eq('canonical_product_id', productId);
    const result = await q;
    decisionRows = result.data || [];
  }

  decisionRows.sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
  const decision = decisionRows[0] || null;
  const effectiveProductId = productId || decision?.canonical_product_id || '';

  let product = null;
  if (effectiveProductId) {
    const productResult = await supabase.from(FOCUS_VIEW).select(PRODUCT_SELECT).eq('canonical_product_id', effectiveProductId).limit(1);
    product = (productResult.data || [])[0] || null;
  }

  const keywords = normalizeDecisionKeywords(decision?.selected_keywords_json || []);
  const manualFocus = decision?.manual_focus_json && typeof decision.manual_focus_json === 'object' ? decision.manual_focus_json : {};
  return { product, decision, keywords, manualFocus, error: null };
}

function attachProductIdentity(contract, data) {
  const canonicalProductId = data.product?.canonical_product_id || data.decision?.canonical_product_id || '';
  const matchedEtsyListingId = data.product?.matched_etsy_listing_id || data.decision?.matched_etsy_listing_id || null;
  return {
    ...contract,
    canonical_product_id: canonicalProductId,
    matched_etsy_listing_id: matchedEtsyListingId,
    product_truth: {
      ...contract.product_truth,
      canonical_product_id: canonicalProductId,
      matched_etsy_listing_id: matchedEtsyListingId,
      primary_image_url: data.product?.primary_image_url || contract.product_truth.primary_image_url || null,
      primary_image_alt: data.product?.primary_image_alt || contract.product_truth.primary_image_alt || null,
    },
  };
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

function normalizeDecisionKeywords(value) {
  const rows = Array.isArray(value) ? value : [];
  return rows.map((row) => ({
    ...row,
    keyword: row.keyword || row.keyword_norm,
    keyword_norm: row.keyword_norm || row.keyword,
    priority_tier: 'tier_1',
    validation_status: row.avg_monthly_searches && String(row.competition || '').toUpperCase() !== 'UNKNOWN' ? 'validated' : 'queued',
    cleanup_pipeline_status: 'from_listing_master_decision',
    should_validate_api: false,
    should_hold: false,
  }));
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
    'Product truth and QA gates must outrank keyword volume.',
  ];
}
