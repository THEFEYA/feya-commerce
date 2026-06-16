// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, productSlug } from '@/lib/storefront';
import { buildKeywordCandidateInsertRows } from '@/lib/seo-keyword-candidates';
import type { StorefrontProduct } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type GenerateInput = {
  product_slug?: string;
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage() }, { status: 503 });
  }

  let input: GenerateInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const requestedSlug = cleanText(input.product_slug);
  if (!requestedSlug) {
    return NextResponse.json({ ok: false, error: 'Missing product_slug.' }, { status: 400 });
  }

  const productResult = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .eq('product_slug', requestedSlug)
    .maybeSingle();

  if (productResult.error) {
    return NextResponse.json({ ok: false, error: productResult.error.message }, { status: 500 });
  }

  if (!productResult.data) {
    return NextResponse.json({ ok: false, error: `Product not found for slug: ${requestedSlug}` }, { status: 404 });
  }

  const product = productResult.data as StorefrontProduct;
  const slug = productSlug(product) || requestedSlug;
  const rows = buildKeywordCandidateInsertRows(product);

  if (!rows.length) {
    return NextResponse.json({ ok: false, error: 'No keyword candidates generated.' }, { status: 422 });
  }

  const deleteResult = await supabase
    .from('feya_keyword_candidates_v1')
    .delete()
    .eq('product_slug', slug)
    .eq('page_type', 'product')
    .eq('source_code', 'product_dna')
    .eq('country_code', 'US')
    .eq('language_code', 'en');

  if (deleteResult.error) {
    return NextResponse.json({ ok: false, error: deleteResult.error.message }, { status: 500 });
  }

  const insertResult = await supabase
    .from('feya_keyword_candidates_v1')
    .insert(rows)
    .select('keyword_candidate_id,keyword,bucket,final_score,placement')
    .order('final_score', { ascending: false });

  if (insertResult.error) {
    return NextResponse.json({ ok: false, error: insertResult.error.message }, { status: 500 });
  }

  await supabase.from('feya_seo_generation_runs_v1').insert({
    canonical_product_id: product.canonical_product_id || null,
    product_slug: slug,
    page_type: 'product',
    run_type: 'keyword_candidate_generation',
    run_status: 'completed',
    source_data_snapshot_json: {
      product_slug: slug,
      source_view: STOREFRONT_VIEW_V4,
      generator: 'rule_based_product_dna_v1',
    },
    input_brief_json: {
      source_code: 'product_dna',
      generated_count: rows.length,
    },
    rules_version: 'keyword_candidates_rule_based_v1',
    model_name: 'rule_based',
    finished_at: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    product_slug: slug,
    generated_count: rows.length,
    candidates: insertResult.data || [],
  });
}
