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

const ALLOWED_STATUSES = new Set(['pending', 'approved', 'rejected', 'applied', 'superseded']);
const REVIEW_STATUSES = new Set(['approved', 'rejected']);

type SeoChangeSetInput = {
  product_slug?: string;
  canonical_product_id?: string | null;
  source_event_id?: string | null;
  source_route?: string | null;
  target_field?: string;
  current_value?: string | null;
  proposed_value?: string | null;
  reason?: string | null;
  rule_pack_version?: string | null;
  template_pack_version?: string | null;
  status?: string | null;
};

type SeoChangeSetStatusInput = {
  change_set_id?: string;
  status?: string;
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePayload(input: SeoChangeSetInput) {
  const productSlug = cleanText(input.product_slug);
  const targetField = cleanText(input.target_field);
  const proposedValue = cleanText(input.proposed_value);
  const status = cleanText(input.status) || 'pending';

  if (!productSlug) return { error: 'Missing product_slug.' };
  if (!ALLOWED_TARGET_FIELDS.has(targetField)) return { error: `Unsupported target_field: ${targetField || 'empty'}` };
  if (!proposedValue) return { error: 'Missing proposed_value.' };
  if (!ALLOWED_STATUSES.has(status)) return { error: `Unsupported status: ${status}` };

  return {
    row: {
      product_slug: productSlug,
      canonical_product_id: cleanText(input.canonical_product_id) || null,
      source_event_id: cleanText(input.source_event_id) || null,
      source_route: cleanText(input.source_route) || '/admin/seo-apply',
      target_field: targetField,
      current_value: cleanText(input.current_value) || null,
      proposed_value: proposedValue,
      reason: cleanText(input.reason) || null,
      rule_pack_version: cleanText(input.rule_pack_version) || 'manual_v1',
      template_pack_version: cleanText(input.template_pack_version) || 'template_v1',
      status,
    },
  };
}

function normalizeStatusPayload(input: SeoChangeSetStatusInput) {
  const changeSetId = cleanText(input.change_set_id);
  const status = cleanText(input.status);

  if (!changeSetId) return { error: 'Missing change_set_id.' };
  if (!REVIEW_STATUSES.has(status)) return { error: `Unsupported review status: ${status || 'empty'}` };

  return {
    changeSetId,
    row: {
      status,
      reviewed_at: new Date().toISOString(),
    },
  };
}

export async function GET() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage(), change_sets: [] }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_admin_seo_change_sets_v1')
    .select('*')
    .limit(300);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, change_sets: [] }, { status: 500 });
  }

  const changeSets = (data || []).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return NextResponse.json({ ok: true, change_sets: changeSets });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage() }, { status: 503 });
  }

  let input: SeoChangeSetInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const normalized = normalizePayload(input);
  if ('error' in normalized) {
    return NextResponse.json({ ok: false, error: normalized.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('feya_commerce_seo_change_sets')
    .insert(normalized.row)
    .select('change_set_id,product_slug,target_field,status,created_at')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, change_set: data });
}

export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage() }, { status: 503 });
  }

  let input: SeoChangeSetStatusInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const normalized = normalizeStatusPayload(input);
  if ('error' in normalized) {
    return NextResponse.json({ ok: false, error: normalized.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('feya_commerce_seo_change_sets')
    .update(normalized.row)
    .eq('change_set_id', normalized.changeSetId)
    .eq('status', 'pending')
    .select('change_set_id,product_slug,target_field,status,reviewed_at')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, change_set: data });
}
