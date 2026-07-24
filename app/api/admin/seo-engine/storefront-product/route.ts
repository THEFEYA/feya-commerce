// @ts-nocheck
import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_PDP_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get('product_id')?.trim() || '';

  if (!productId) {
    return NextResponse.json({
      ok: false,
      status: 'missing_product_id',
      error: 'product_id is required.',
      read_only: true,
    }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      status: 'missing_supabase_service_env',
      error: 'Server-side Supabase access is unavailable.',
      read_only: true,
    }, { status: 503 });
  }

  const [{ data, error }, { data: truthRows, error: truthError }] = await Promise.all([
    supabase
      .from(STOREFRONT_VIEW_V4)
      .select(STOREFRONT_V4_PDP_SELECT)
      .eq('canonical_product_id', productId)
      .maybeSingle(),
    supabase
      .from('feya_commerce_v_seo_product_truth_v4')
      .select('included_components')
      .eq('canonical_product_id', productId)
      .limit(1),
  ]);

  if (error) {
    return NextResponse.json({
      ok: false,
      status: 'storefront_product_read_failed',
      error: error.message,
      product_id: productId,
      read_only: true,
    }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      ok: false,
      status: 'storefront_product_not_found',
      error: 'The selected product was not found in the storefront v4 view.',
      product_id: productId,
      read_only: true,
    }, { status: 404 });
  }

  if (truthError) {
    console.warn('[storefront-product] canonical_composition_unavailable', {
      productId,
      message: truthError.message,
    });
  }

  const canonicalIncludedComponents = Array.isArray(truthRows?.[0]?.included_components)
    ? truthRows[0].included_components
    : [];

  return NextResponse.json({
    ok: true,
    status: 'storefront_product_ready',
    read_only: true,
    product_id: productId,
    product: {
      ...data,
      canonical_included_components: canonicalIncludedComponents,
    },
    guardrails: [
      'No Supabase write.',
      'No product mutation.',
      'No draft save.',
      'No publish action.',
    ],
  });
}
