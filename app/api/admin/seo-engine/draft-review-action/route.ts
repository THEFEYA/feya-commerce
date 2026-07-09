// @ts-nocheck
import { NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const STORAGE_TABLE = 'feya_commerce_seo_pack_drafts_v1';
const STORAGE_EVENTS_TABLE = 'feya_commerce_seo_pack_draft_events_v1';
const STORAGE_FLAG = 'FEYA_SEO_DRAFT_STORAGE_ENABLED';

const ACTIONS = {
  request_changes: {
    status: 'changes_requested',
    review_status: 'changes_requested',
    event_type: 'changes_requested',
    label: 'Запросить правки',
  },
  approve_draft: {
    status: 'approved_draft',
    review_status: 'approved',
    event_type: 'human_approved',
    label: 'Одобрить черновик',
  },
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/admin/seo-engine/draft-review-action',
    method: 'POST',
    mode: 'guarded_review_status_update',
    feature_flag: STORAGE_FLAG,
    allowed_actions: Object.keys(ACTIONS),
    expected_body: {
      draft_id: 'seo draft uuid',
      action: 'request_changes | approve_draft',
      note: 'optional human note',
    },
    guardrails: guardrails(),
  });
}

export async function POST(request: Request) {
  const body = await safeJson(request);
  const draftId = String(body.draft_id || body.draftId || '').trim();
  const action = String(body.action || '').trim();
  const note = String(body.note || '').trim();
  const actor = String(body.actor || 'seo-approval-ui').trim();
  const storageEnabled = process.env[STORAGE_FLAG] === 'true';
  const serviceClient = getSupabaseServiceClient();

  if (!draftId) {
    return NextResponse.json({ ok: false, status: 'missing_draft_id', error: 'draft_id is required.', guardrails: guardrails() }, { status: 400 });
  }

  if (!ACTIONS[action]) {
    return NextResponse.json({ ok: false, status: 'invalid_action', error: 'Allowed actions: request_changes, approve_draft.', guardrails: guardrails() }, { status: 400 });
  }

  if (!storageEnabled) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_feature_flag_disabled',
      blocked: true,
      error: `${STORAGE_FLAG} is not true.`,
      guardrails: guardrails(),
    }, { status: 423 });
  }

  if (!serviceClient) {
    return NextResponse.json({
      ok: false,
      status: 'blocked_missing_service_role_client',
      blocked: true,
      error: getMissingSupabaseServiceEnvMessage(),
      guardrails: guardrails(),
    }, { status: 503 });
  }

  const { data: currentDraft, error: readError } = await serviceClient
    .from(STORAGE_TABLE)
    .select('id,canonical_product_id,status,review_status,product_slug,seo_title,updated_at')
    .eq('id', draftId)
    .is('archived_at', null)
    .single();

  if (readError || !currentDraft?.id) {
    return NextResponse.json({
      ok: false,
      status: 'draft_not_found',
      error: readError?.message || 'Draft was not found or is archived.',
      guardrails: guardrails(),
    }, { status: 404 });
  }

  const next = ACTIONS[action];
  const updatePayload = {
    status: next.status,
    review_status: next.review_status,
    human_review_notes: note || null,
    reviewer: actor,
    reviewed_at: new Date().toISOString(),
  };

  const { data: updatedDraft, error: updateError } = await serviceClient
    .from(STORAGE_TABLE)
    .update(updatePayload)
    .eq('id', draftId)
    .select('id,canonical_product_id,product_slug,status,review_status,reviewed_at,updated_at')
    .single();

  if (updateError || !updatedDraft?.id) {
    return NextResponse.json({
      ok: false,
      status: 'review_update_failed',
      error: updateError?.message || 'Review update failed.',
      draft: currentDraft,
      guardrails: guardrails(),
    }, { status: 500 });
  }

  const eventPayload = {
    draft_id: updatedDraft.id,
    canonical_product_id: updatedDraft.canonical_product_id,
    event_type: next.event_type,
    from_status: currentDraft.status,
    to_status: updatedDraft.status,
    actor,
    note: note || `${next.label} через /admin/seo-approval. Publish не выполнялся.`,
    payload: {
      action,
      previous_review_status: currentDraft.review_status,
      next_review_status: updatedDraft.review_status,
      publish_performed: false,
      ready_for_publish_performed: false,
    },
  };

  const { data: event, error: eventError } = await serviceClient
    .from(STORAGE_EVENTS_TABLE)
    .insert(eventPayload)
    .select('id,draft_id,canonical_product_id,event_type,from_status,to_status,created_at')
    .single();

  if (eventError || !event?.id) {
    return NextResponse.json({
      ok: false,
      status: 'review_event_failed',
      error: eventError?.message || 'Review event insert failed.',
      draft: updatedDraft,
      event: event || null,
      guardrails: guardrails(),
    }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status: action === 'approve_draft' ? 'draft_approved' : 'changes_requested',
    message: action === 'approve_draft'
      ? 'SEO-черновик одобрен как draft. Публикация не выполнялась.'
      : 'По SEO-черновику запрошены правки. Публикация не выполнялась.',
    draft: updatedDraft,
    event,
    guardrails: guardrails(),
  });
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function guardrails() {
  return [
    'This route updates review status only.',
    'This route does not publish storefront pages.',
    'This route does not mark ready_for_publish.',
    'approve_draft means human approval of the saved draft, not final publish readiness.',
    'Final publish readiness still requires similarity/cannibalization and image ALT truth gates.',
  ];
}
