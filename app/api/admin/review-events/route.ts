import { NextRequest, NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_EVENT_TYPES = new Set([
  'label_review_approved',
  'price_review_approved',
  'component_mapping_checked',
  'media_checked',
  'seo_ready_checked',
  'needs_fix',
  'internal_note_added',
  'order_draft_reviewed',
]);

const ALLOWED_SUBJECT_TYPES = new Set([
  'product',
  'configuration',
  'label',
  'price',
  'component',
  'media',
  'seo',
  'order_draft',
]);

const ALLOWED_STATUSES = new Set(['recorded', 'needs_fix', 'approved', 'resolved', 'archived']);

type ReviewEventInput = {
  event_type?: string;
  event_status?: string;
  subject_type?: string;
  canonical_product_id?: string | null;
  product_slug?: string | null;
  configuration_id?: string | null;
  order_draft_id?: string | null;
  admin_note?: string | null;
  source_route?: string | null;
  payload_json?: Record<string, unknown> | null;
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePayload(input: ReviewEventInput) {
  const eventType = cleanText(input.event_type);
  const subjectType = cleanText(input.subject_type) || 'product';
  const eventStatus = cleanText(input.event_status) || (eventType === 'needs_fix' ? 'needs_fix' : 'recorded');

  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    return { error: `Unsupported review event type: ${eventType || 'empty'}` };
  }

  if (!ALLOWED_SUBJECT_TYPES.has(subjectType)) {
    return { error: `Unsupported review subject type: ${subjectType}` };
  }

  if (!ALLOWED_STATUSES.has(eventStatus)) {
    return { error: `Unsupported review event status: ${eventStatus}` };
  }

  return {
    row: {
      event_type: eventType,
      event_status: eventStatus,
      subject_type: subjectType,
      canonical_product_id: cleanText(input.canonical_product_id) || null,
      product_slug: cleanText(input.product_slug) || null,
      configuration_id: cleanText(input.configuration_id) || null,
      order_draft_id: cleanText(input.order_draft_id) || null,
      admin_note: cleanText(input.admin_note) || null,
      source_route: cleanText(input.source_route) || null,
      payload_json: input.payload_json && typeof input.payload_json === 'object' ? input.payload_json : {},
      created_by: 'admin',
    },
  };
}

export async function GET() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage(), events: [] }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_admin_review_events_v1')
    .select('*')
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, events: [] }, { status: 500 });
  }

  const events = (data || []).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return NextResponse.json({ ok: true, events });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage() }, { status: 503 });
  }

  let input: ReviewEventInput;
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
    .from('feya_commerce_admin_review_events')
    .insert(normalized.row)
    .select('review_event_id,event_type,event_status,subject_type,created_at')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event: data });
}
