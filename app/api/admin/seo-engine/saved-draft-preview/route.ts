// @ts-nocheck
import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { buildSavedDraftPreviewResult } from '@/lib/seoSavedDraftPreview';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import { normalizeReviewDraftForSeoPack } from '@/lib/seoReviewDraftNormalization';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import { validateSeoCommercialCopy } from '@/lib/seoCommercialCopyValidator';
import { validateSeoKeywordPlacement } from '@/lib/seoKeywordPlacementValidator';
import { getSeoPackApprovalBlockers } from '@/lib/seoPackContract';
import { assembleSeoProductPack } from '@/lib/seoFullPackAssembler';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LATEST_DRAFT_VIEW = 'feya_commerce_v_seo_pack_drafts_latest_v1';
const SELECT = [
  'id',
  'canonical_product_id',
  'matched_etsy_listing_id',
  'product_slug',
  'status',
  'review_status',
  'source_mode',
  'agent_output_snapshot',
  'validation_result_snapshot',
  'created_at',
  'updated_at',
].join(',');

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const productId = searchParams.get('product_id')?.trim() || '';
  const renormalize = searchParams.get('renormalize') === '1';
  if (!productId) {
    return NextResponse.json({
      ok: false,
      status: 'missing_product_id',
      error: 'product_id is required.',
    }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      status: 'missing_supabase_service_client',
      error: 'Server-only Supabase client is unavailable.',
    }, { status: 503 });
  }

  const { data, error } = await supabase
    .from(LATEST_DRAFT_VIEW)
    .select(SELECT)
    .eq('canonical_product_id', productId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({
      ok: false,
      status: 'saved_draft_read_failed',
      error: error.message,
    }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      ok: false,
      status: 'saved_draft_not_found',
      error: 'No saved review draft was found for this product.',
      product_id: productId,
    }, { status: 404 });
  }

  if (!renormalize) {
    return NextResponse.json(buildSavedDraftPreviewResult(data), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const bundle = await buildSeoBriefContractBundle(productId);
  if (bundle.error) {
    return NextResponse.json({
      ok: false,
      status: 'saved_draft_renormalization_unavailable',
      error: bundle.error,
    }, { status: 503 });
  }
  if (!bundle.seoPackDraft) {
    return NextResponse.json({
      ok: false,
      status: 'saved_draft_renormalization_missing_brief',
      error: 'The current SEO brief is unavailable for this saved draft.',
    }, { status: 404 });
  }

  const output = normalizeReviewDraftForSeoPack(data.agent_output_snapshot || {}, bundle.seoPackDraft);
  const structuralValidation = validateSeoAgentOutput(output);
  const commercialValidation = validateSeoCommercialCopy(output, {
    product_truth: bundle.seoPackDraft.product_truth,
    manual_focus: bundle.seoPackDraft.manual_focus,
    keyword_roles: bundle.seoPackDraft.keyword_roles,
  });
  const keywordPlacementValidation = validateSeoKeywordPlacement(output, bundle.seoPackDraft);
  const approvalBlockers = getSeoPackApprovalBlockers(bundle.seoPackDraft);
  const assembledSeoPack = assembleSeoProductPack({
    draft: bundle.seoPackDraft,
    output,
    structuralValidation,
    commercialValidation,
    keywordPlacementValidation,
    productTruthBlockers: approvalBlockers,
  });
  const result = buildSavedDraftPreviewResult({
    ...data,
    agent_output_snapshot: output,
    validation_result_snapshot: {
      ...(data.validation_result_snapshot || {}),
      structural_validation: structuralValidation,
      commercial_validation: commercialValidation,
      keyword_placement_validation: keywordPlacementValidation,
      approval_blockers: approvalBlockers,
      product_truth_blockers: approvalBlockers,
      assembled_seo_pack: assembledSeoPack,
    },
  });

  return NextResponse.json({
    ...result,
    renormalized_for_resave: true,
    message: 'Latest saved review draft renormalized with the current zero-token pipeline. OpenAI was not called.',
    guardrails: [
      ...result.guardrails,
      'The current deterministic editorial normalizers and validators were reapplied for explicit resave preview.',
    ],
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
