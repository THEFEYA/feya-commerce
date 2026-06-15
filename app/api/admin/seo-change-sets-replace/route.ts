import { NextRequest, NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_TARGET_FIELDS = new Set([
  'seo_title',
  'meta_description',
  'h1',
  'primary_image_alt',
  'collection_hint',
  'description_outline',
]);

type FieldInput = {
  field?: string;
  currentValue?: string | null;
  proposedValue?: string | null;
};

type ReplaceInput = {
  product_slug?: string;
  source_route?: string | null;
  fields?: FieldInput[];
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePayload(input: ReplaceInput) {
  const productSlug = cleanText(input.product_slug);
  if (!productSlug) return { error: 'Не передан slug товара.' };

  const fields = Array.isArray(input.fields)
    ? input.fields
      .map((field) => ({
        target_field: cleanText(field.field),
        current_value: cleanText(field.currentValue) || null,
        proposed_value: cleanText(field.proposedValue),
      }))
      .filter((field) => field.target_field && field.proposed_value)
    : [];

  if (!fields.length) return { error: 'Нет изменённых полей для создания черновиков.' };

  const unsupported = fields.find((field) => !ALLOWED_TARGET_FIELDS.has(field.target_field));
  if (unsupported) return { error: `Неподдерживаемое поле: ${unsupported.target_field}` };

  return {
    productSlug,
    sourceRoute: cleanText(input.source_route) || '/admin/seo-apply',
    fields,
  };
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage() }, { status: 503 });
  }

  let input: ReplaceInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Некорректный JSON.' }, { status: 400 });
  }

  const normalized = normalizePayload(input);
  if ('error' in normalized) {
    return NextResponse.json({ ok: false, error: normalized.error }, { status: 400 });
  }

  const targetFields = normalized.fields.map((field) => field.target_field);

  const { error: rejectError, count: replacedCount } = await supabase
    .from('feya_commerce_seo_change_sets')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() }, { count: 'exact' })
    .eq('product_slug', normalized.productSlug)
    .eq('status', 'pending')
    .in('target_field', targetFields);

  if (rejectError) {
    return NextResponse.json({ ok: false, error: rejectError.message }, { status: 500 });
  }

  const rows = normalized.fields.map((field) => ({
    product_slug: normalized.productSlug,
    source_route: normalized.sourceRoute,
    target_field: field.target_field,
    current_value: field.current_value,
    proposed_value: field.proposed_value,
    reason: 'Created from SEO Apply Preview',
    rule_pack_version: 'manual_v1',
    template_pack_version: 'template_v1',
    status: 'pending',
  }));

  const { data, error: insertError } = await supabase
    .from('feya_commerce_seo_change_sets')
    .insert(rows)
    .select('change_set_id,product_slug,target_field,status,created_at');

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, replaced: replacedCount || 0, created: data?.length || 0 });
}
