// @ts-nocheck
import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { buildSavedDraftPreviewResult } from '@/lib/seoSavedDraftPreview';

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
  const productId = new URL(request.url).searchParams.get('product_id')?.trim() || '';
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

  return NextResponse.json(buildSavedDraftPreviewResult(data), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
