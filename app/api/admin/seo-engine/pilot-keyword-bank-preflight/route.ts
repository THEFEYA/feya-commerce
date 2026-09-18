// @ts-nocheck
import { NextResponse } from 'next/server';
import { buildPilotKeywordBankFallbackBundle } from '@/lib/seoPilotKeywordBankFallback';

export const dynamic = 'force-dynamic';

const PILOT_PRODUCT_ID = 'b6e0171f-4d42-4d71-88b1-ee0d4e0e109e';

export async function GET() {
  const bundle = await buildPilotKeywordBankFallbackBundle(PILOT_PRODUCT_ID);
  const diagnostics = bundle.keywordDiagnostics || null;
  const ready = Boolean(!bundle.error && bundle.seoPackDraft && bundle.aiAgentInput);

  return NextResponse.json({
    ok: true,
    status: ready ? 'pilot_keyword_bank_ready' : 'pilot_keyword_bank_not_ready',
    read_only: true,
    ready_for_openai_call: ready,
    error: bundle.error || null,
    brief_status: bundle.brief?.status || null,
    blocker_checks: bundle.brief?.blockerChecks || [],
    diagnostics,
    product: bundle.product ? {
      canonical_product_id: bundle.product.canonical_product_id || null,
      matched_etsy_listing_id: bundle.product.matched_etsy_listing_id || null,
      product_slug: bundle.product.product_slug || null,
      product_title: bundle.product.card_title || bundle.product.h1 || null,
      primary_image_url: bundle.product.primary_image_url || null,
    } : null,
    generation_contract: bundle.seoPackDraft ? {
      status: bundle.seoPackDraft.status || null,
      validated_metric_count: bundle.seoPackDraft.metrics_status?.validated_count || 0,
      primary_keywords: (bundle.seoPackDraft.keyword_roles?.primary || []).map((row) => row.keyword || row.keyword_norm),
      secondary_keywords: (bundle.seoPackDraft.keyword_roles?.secondary || []).map((row) => row.keyword || row.keyword_norm),
      composition_mode: 'unresolved_section_suppressed',
    } : null,
    guardrails: [
      'No OpenAI call.',
      'No Supabase write.',
      'No decision save.',
      'No draft save.',
      'No publish action.',
    ],
  }, { status: ready ? 200 : 423 });
}
