// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CreateBriefInput = {
  product_slug?: string;
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function pickFirst(candidates: any[], bucket: string) {
  return candidates.find((item) => item.bucket === bucket && !item.is_excluded)?.keyword || '';
}

function pickMany(candidates: any[], bucket: string, limit: number, excludeKeyword = '') {
  return candidates
    .filter((item) => item.bucket === bucket && !item.is_excluded && item.keyword !== excludeKeyword)
    .slice(0, limit)
    .map((item) => item.keyword);
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage() }, { status: 503 });
  }

  let input: CreateBriefInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const productSlug = cleanText(input.product_slug);
  if (!productSlug) {
    return NextResponse.json({ ok: false, error: 'Missing product_slug.' }, { status: 400 });
  }

  const { data: candidates, error: candidatesError } = await supabase
    .from('feya_keyword_candidates_v1')
    .select('keyword_candidate_id,canonical_product_id,product_slug,keyword,bucket,placement,final_score,is_excluded,exclusion_reason,source_code,country_code,language_code')
    .eq('product_slug', productSlug)
    .eq('page_type', 'product')
    .eq('source_status', 'active')
    .order('final_score', { ascending: false });

  if (candidatesError) {
    return NextResponse.json({ ok: false, error: candidatesError.message }, { status: 500 });
  }

  const activeCandidates = (candidates || []).filter((item) => !item.is_excluded);
  if (!activeCandidates.length) {
    return NextResponse.json({ ok: false, error: 'Сначала сохрани ключевые фразы для этого товара.' }, { status: 422 });
  }

  const primaryKeyword = pickFirst(activeCandidates, 'primary_product_keyword') || activeCandidates[0]?.keyword;
  const secondaryKeywords = [
    ...pickMany(activeCandidates, 'secondary_product_keywords', 5, primaryKeyword),
    ...pickMany(activeCandidates, 'material_keywords', 2, primaryKeyword),
    ...pickMany(activeCandidates, 'context_event_keywords', 2, primaryKeyword),
    ...pickMany(activeCandidates, 'persona_style_keywords', 2, primaryKeyword),
  ].filter(Boolean).slice(0, 8);
  const longTailKeywords = pickMany(activeCandidates, 'long_tail_buyer_keywords', 5, primaryKeyword);
  const imageKeywords = pickMany(activeCandidates, 'image_seo_keywords', 6, primaryKeyword);
  const excludedKeywords = (candidates || []).filter((item) => item.is_excluded).map((item) => ({ keyword: item.keyword, reason: item.exclusion_reason }));

  const canonicalProductId = activeCandidates[0]?.canonical_product_id || null;

  const { data: brief, error: insertError } = await supabase
    .from('feya_seo_briefs_v1')
    .insert({
      canonical_product_id: canonicalProductId,
      product_slug: productSlug,
      page_type: 'product',
      page_angle: 'English SEO product page draft for TheFEYA storefront. Admin interface and QA are Russian; final SEO content remains English.',
      primary_keyword: primaryKeyword,
      secondary_keywords_json: secondaryKeywords,
      long_tail_keywords_json: longTailKeywords,
      image_keywords_json: imageKeywords,
      excluded_keywords_json: excludedKeywords,
      target_country_codes_json: ['US', 'GB', 'CA', 'AU'],
      target_language_code: 'en',
      target_customer: 'performers, festival customers, stylists, drag artists and stagewear buyers looking for statement handmade looks',
      brief_status: 'draft',
      strategy_notes: 'Created from saved rule-based Product DNA keyword candidates. External keyword metrics are not connected yet.',
      source_snapshot_json: {
        source_code: 'product_dna',
        candidate_count: activeCandidates.length,
        generator: 'seo_brief_from_keyword_candidates_v1',
      },
    })
    .select('seo_brief_id,product_slug,primary_keyword,brief_status')
    .single();

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  await supabase.from('feya_seo_generation_runs_v1').insert({
    canonical_product_id: canonicalProductId,
    product_slug: productSlug,
    page_type: 'product',
    run_type: 'seo_brief_generation',
    run_status: 'completed',
    source_data_snapshot_json: {
      product_slug: productSlug,
      source_table: 'feya_keyword_candidates_v1',
      candidate_count: activeCandidates.length,
    },
    input_brief_json: {
      primary_keyword: primaryKeyword,
      secondary_keywords: secondaryKeywords,
      long_tail_keywords: longTailKeywords,
      image_keywords: imageKeywords,
    },
    output_asset_id: null,
    rules_version: 'seo_brief_from_keyword_candidates_v1',
    model_name: 'rule_based',
    finished_at: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    brief,
    primary_keyword: primaryKeyword,
    secondary_count: secondaryKeywords.length,
    long_tail_count: longTailKeywords.length,
    image_keyword_count: imageKeywords.length,
  });
}
