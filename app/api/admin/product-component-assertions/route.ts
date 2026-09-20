import { NextRequest, NextResponse } from 'next/server';
import { CANONICAL_PRODUCT_TRUTH_VIEW } from '@/lib/adminComponentTruth';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AssertionInput = {
  action?: 'approve' | 'revoke';
  canonical_product_id?: string;
  component_family_id?: string;
  source_route?: string;
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: getMissingSupabaseServiceEnvMessage() },
      { status: 503 },
    );
  }

  let input: AssertionInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Некорректный JSON-запрос.' }, { status: 400 });
  }

  const action = cleanText(input.action);
  const canonicalProductId = cleanText(input.canonical_product_id);
  const componentFamilyId = cleanText(input.component_family_id);
  const sourceRoute = cleanText(input.source_route) || '/admin/review/components';

  if (!['approve', 'revoke'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'Неподдерживаемое действие.' }, { status: 400 });
  }
  if (!UUID_PATTERN.test(canonicalProductId) || !UUID_PATTERN.test(componentFamilyId)) {
    return NextResponse.json(
      { ok: false, error: 'Нужны корректные canonical_product_id и component_family_id.' },
      { status: 400 },
    );
  }

  const [{ data: product, error: productError }, { data: family, error: familyError }] = await Promise.all([
    supabase
      .from(CANONICAL_PRODUCT_TRUTH_VIEW)
      .select('canonical_product_id,matched_etsy_listing_id,product_slug,card_title,primary_image_url')
      .eq('canonical_product_id', canonicalProductId)
      .maybeSingle(),
    supabase
      .from('feya_commerce_component_families')
      .select('component_family_id,canonical_name,normalized_name,active_flag')
      .eq('component_family_id', componentFamilyId)
      .eq('active_flag', true)
      .maybeSingle(),
  ]);

  if (productError || familyError) {
    return NextResponse.json(
      {
        ok: false,
        error: productError?.message || familyError?.message || 'Не удалось проверить Product Truth.',
      },
      { status: 503 },
    );
  }
  if (!product || !family) {
    return NextResponse.json(
      { ok: false, error: 'Товар или активное семейство компонента не найдено.' },
      { status: 404 },
    );
  }

  const reviewedAt = new Date().toISOString();
  if (action === 'revoke') {
    const { data, error } = await supabase
      .from('feya_commerce_product_component_assertions_v1')
      .update({
        review_status: 'rejected',
        active_flag: false,
        reviewed_at: reviewedAt,
        reviewed_by: 'admin',
        review_note: 'Revoked in canonical component review.',
        updated_at: reviewedAt,
      })
      .eq('canonical_product_id', canonicalProductId)
      .eq('component_family_id', componentFamilyId)
      .eq('presence_scope', 'fixed_base')
      .select('product_component_assertion_id,canonical_product_id,component_family_id,review_status')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Подтверждение компонента не найдено.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, assertion: data });
  }

  const evidenceJson = {
    evidence_contract: 'manual_fixed_base_v1',
    reviewer_action: 'confirmed_always_included',
    source_route: sourceRoute,
    reviewed_product: {
      canonical_product_id: product.canonical_product_id,
      matched_etsy_listing_id: product.matched_etsy_listing_id,
      product_slug: product.product_slug,
      card_title: product.card_title,
      primary_image_url: product.primary_image_url,
    },
    confirmed_component: {
      component_family_id: family.component_family_id,
      canonical_name: family.canonical_name,
      normalized_name: family.normalized_name,
    },
  };

  const { data, error } = await supabase
    .from('feya_commerce_product_component_assertions_v1')
    .upsert({
      canonical_product_id: canonicalProductId,
      component_family_id: componentFamilyId,
      presence_scope: 'fixed_base',
      evidence_source: 'manual_admin_review',
      evidence_json: evidenceJson,
      review_status: 'approved',
      reviewed_at: reviewedAt,
      reviewed_by: 'admin',
      review_note: 'Confirmed as an always-included component in canonical Product Truth.',
      active_flag: true,
      updated_at: reviewedAt,
    }, {
      onConflict: 'canonical_product_id,component_family_id,presence_scope',
    })
    .select('product_component_assertion_id,canonical_product_id,component_family_id,review_status')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, assertion: data });
}
