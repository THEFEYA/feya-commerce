// @ts-nocheck
import { NextResponse } from 'next/server';
import { resolveStorefrontSellableOffer } from '@/lib/storefrontSellableOffer';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const STOREFRONT_PRODUCT_EXACT_RPC = 'feya_commerce_get_step7_storefront_products_api_v6';
const PRODUCT_TRUTH_EXACT_RPC = 'feya_commerce_get_seo_product_truth_v4';

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
    supabase.rpc(STOREFRONT_PRODUCT_EXACT_RPC, {
      p_canonical_product_id: productId,
    })
      .maybeSingle(),
    supabase.rpc(PRODUCT_TRUTH_EXACT_RPC, {
      p_canonical_product_id: productId,
    }),
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
  const canonicalSourceVariations = Array.isArray(truthRows?.[0]?.source_variations_json)
    ? truthRows[0].source_variations_json
    : [];
  const canonicalOptionPriceRows = Array.isArray(truthRows?.[0]?.option_price_rows_json)
    ? truthRows[0].option_price_rows_json
    : [];
  const sellableOffer = resolveStorefrontSellableOffer(data);

  return NextResponse.json({
    ok: true,
    status: sellableOffer.status === 'ready'
      ? 'storefront_product_ready'
      : 'storefront_product_hold',
    read_only: true,
    product_id: productId,
    product: {
      ...data,
      sellable_offer: sellableOffer,
      sellable_offer_components: sellableOffer.status === 'ready'
        ? sellableOffer.component_labels
        : [],
      sellable_offer_signature: sellableOffer.signature,
      canonical_included_components: canonicalIncludedComponents,
      canonical_source_variations: canonicalSourceVariations,
      canonical_option_price_rows: canonicalOptionPriceRows,
    },
    guardrails: [
      'No Supabase write.',
      'No product mutation.',
      'No draft save.',
      'No publish action.',
    ],
  });
}
