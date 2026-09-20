// @ts-nocheck
import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_PDP_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';

export const dynamic = 'force-dynamic';

const PILOT_PRODUCT_ID = 'b6e0171f-4d42-4d71-88b1-ee0d4e0e109e';

export async function GET() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({
      ok: false,
      status: 'missing_supabase_service_env',
      error: 'Server-side Supabase access is unavailable.',
    }, { status: 503 });
  }

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_PDP_SELECT)
    .eq('canonical_product_id', PILOT_PRODUCT_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({
      ok: false,
      status: 'storefront_product_read_failed',
      error: error.message,
      read_only: true,
    }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      ok: false,
      status: 'storefront_product_not_found',
      error: 'Pilot product was not found in the storefront v4 view.',
      read_only: true,
    }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    status: 'storefront_product_ready',
    read_only: true,
    product: data,
    guardrails: [
      'No Supabase write.',
      'No product mutation.',
      'No draft save.',
      'No publish action.',
    ],
  });
}
