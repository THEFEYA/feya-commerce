// @ts-nocheck
import { NextResponse } from 'next/server';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { buildSeoPilotBrief } from '@/lib/seoPilotDraft';
import { buildSeoAgentInputFromDraft, buildSeoPackDraftContractFromBrief } from '@/lib/seoPackContractBuilder';

const FOCUS_VIEW = 'feya_commerce_v_listing_master_product_focus_v1';
const DECISIONS_TABLE = 'feya_commerce_listing_master_decisions_v1';
const PRODUCT_SELECT = 'canonical_product_id,matched_etsy_listing_id,product_slug,card_title,h1,seo_title,meta_description,product_type,material,color,canonical_color_label,category_label,source_category_label,operator_section_label,world_label,primary_image_url,primary_image_alt,parent_components_json,child_components_json,component_groups_json,needs_component_review_count,has_component_review_risk,focus_text';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = String(url.searchParams.get('product_id') || '').trim();
  const data = await loadSeoBriefData(productId);

  if (data.error) {
    return NextResponse.json({
      ok: false,
      status: 'blocked',
      error: data.error,
      guardrails: readOnlyGuardrails(),
    }, { status: 503 });
  }

  if (!data.product) {
    return NextResponse.json({
      ok: false,
      status: 'not_found',
      error: 'Product not found in Product Focus view.',
      product_id: productId || null,
      guardrails: readOnlyGuardrails(),
    }, { status: 404 });
  }

  const brief = buildSeoPilotBrief(data.product, data.keywords, data.manualFocus);
  const seoPackDraft = attachProductIdentity(buildSeoPackDraftContractFromBrief(brief), data);
  const agentInput = buildSeoAgentInputFromDraft(seoPackDraft);

  return NextResponse.json({
    ok: true,
    route: '/api/admin/seo-engine/brief-contract',
    mode: 'read_only_dry_run',
    guardrails: readOnlyGuardrails(),
    source: {
      product_id: data.product?.canonical_product_id || productId || null,
      matched_etsy_listing_id: data.product?.matched_etsy_listing_id || data.decision?.matched_etsy_listing_id || null,
      has_decision: Boolean(data.decision),
      selected_keyword_count: data.keywords.length,
      manual_focus_keys: Object.keys(data.manualFocus || {}),
    },
    brief_status: brief.status,
    metrics_status: brief.metricsStatus,
    seo_pack_draft: seoPackDraft,
    ai_agent_input: agentInput,
  });
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

function readOnlyGuardrails() {
  return [
    'No OpenAI call in this route.',
    'No Supabase write in this route.',
    'No product mutation in this route.',
    'No publish action in this route.',
    'This endpoint only exposes the normalized contract for review and future protected generation.',
  ];
}
