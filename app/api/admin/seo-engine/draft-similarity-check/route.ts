// @ts-nocheck
import { NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';
import {
  runSeoPortfolioOverlapCheck,
  SEO_PORTFOLIO_BLOCKER_THRESHOLD,
  SEO_PORTFOLIO_WARNING_THRESHOLD,
} from '@/lib/seoPortfolioOverlap';

export const dynamic = 'force-dynamic';

const STORAGE_TABLE = 'feya_commerce_seo_pack_drafts_v1';
const STORAGE_EVENTS_TABLE = 'feya_commerce_seo_pack_draft_events_v1';
const STORAGE_FLAG = 'FEYA_SEO_DRAFT_STORAGE_ENABLED';
const MAX_COMPARISON_DRAFTS = 200;

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/admin/seo-engine/draft-similarity-check',
    method: 'POST',
    mode: 'guarded_portfolio_overlap_preflight',
    feature_flag: STORAGE_FLAG,
    strategy_doc: 'docs/SEO_PORTFOLIO_OVERLAP_STRATEGY_V1.md',
    thresholds: {
      warning: SEO_PORTFOLIO_WARNING_THRESHOLD,
      blocker: SEO_PORTFOLIO_BLOCKER_THRESHOLD,
    },
    expected_body: {
      draft_id: 'seo draft uuid',
    },
    guardrails: guardrails(),
  });
}

export async function POST(request: Request) {
  const body = await safeJson(request);
  const draftId = String(body.draft_id || body.draftId || '').trim();
  const actor = String(body.actor || 'seo-approval-ui').trim();
  const storageEnabled = process.env[STORAGE_FLAG] === 'true';
  const serviceClient = getSupabaseServiceClient();

  if (!draftId) {
    return NextResponse.json({ ok: false, status: 'missing_draft_id', error: 'draft_id is required.', guardrails: guardrails() }, { status: 400 });
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
    .select('id,canonical_product_id,product_slug,status,review_status,seo_title,h1,meta_description,intro,bullet_highlights,faq,image_alt_candidates,internal_linking_hints,keyword_roles_snapshot,agent_output_snapshot,qa_self_report,similarity_check_snapshot,created_at,updated_at')
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

  const { data: candidateDrafts, error: candidatesError } = await serviceClient
    .from(STORAGE_TABLE)
    .select('id,canonical_product_id,product_slug,status,review_status,seo_title,h1,meta_description,intro,bullet_highlights,faq,image_alt_candidates,internal_linking_hints,keyword_roles_snapshot,agent_output_snapshot,created_at')
    .neq('id', draftId)
    .neq('canonical_product_id', currentDraft.canonical_product_id)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(MAX_COMPARISON_DRAFTS);

  if (candidatesError) {
    return NextResponse.json({
      ok: false,
      status: 'candidate_load_failed',
      error: candidatesError.message,
      guardrails: guardrails(),
    }, { status: 500 });
  }

  const similarity = runSeoPortfolioOverlapCheck(currentDraft, candidateDrafts || []);
  const nextStatus = similarity.status === 'pass' ? 'needs_image_alt_review' : 'needs_similarity_check';
  const nextQaReport = {
    ...(currentDraft.qa_self_report || {}),
    similarity_cannibalization: similarity.status,
    portfolio_overlap_status: similarity.status,
    similarity_checked_at: similarity.checked_at,
    similarity_max_pct: similarity.max_similarity_pct,
  };

  const { data: updatedDraft, error: updateError } = await serviceClient
    .from(STORAGE_TABLE)
    .update({
      status: nextStatus,
      similarity_check_snapshot: similarity,
      qa_self_report: nextQaReport,
    })
    .eq('id', draftId)
    .select('id,canonical_product_id,product_slug,status,review_status,similarity_check_snapshot,updated_at')
    .single();

  if (updateError || !updatedDraft?.id) {
    return NextResponse.json({
      ok: false,
      status: 'similarity_update_failed',
      error: updateError?.message || 'Portfolio overlap update failed.',
      similarity,
      guardrails: guardrails(),
    }, { status: 500 });
  }

  const eventPayload = {
    draft_id: updatedDraft.id,
    canonical_product_id: updatedDraft.canonical_product_id,
    event_type: 'similarity_checked',
    from_status: currentDraft.status,
    to_status: updatedDraft.status,
    actor,
    note: similarity.status === 'pass'
      ? 'Portfolio overlap preflight passed. Draft moved to image ALT review. Publish not performed.'
      : 'Portfolio overlap preflight found differentiation risk. Draft stays before publish readiness.',
    payload: {
      similarity_status: similarity.status,
      portfolio_overlap_status: similarity.status,
      max_similarity_pct: similarity.max_similarity_pct,
      comparison_count: similarity.comparison_count,
      top_matches: similarity.top_matches?.slice(0, 5) || [],
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
      status: 'similarity_event_failed',
      error: eventError?.message || 'Portfolio overlap event insert failed.',
      draft: updatedDraft,
      similarity,
      event: event || null,
      guardrails: guardrails(),
    }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status: similarity.status === 'pass' ? 'portfolio_overlap_passed' : 'portfolio_overlap_needs_review',
    message: similarity.status === 'pass'
      ? 'Портфельная проверка пересечения пройдена. Черновик переведён к проверке Image ALT. Публикация не выполнялась.'
      : 'Нужна дифференциация SEO-черновика внутри портфеля. Публикация не выполнялась.',
    draft: updatedDraft,
    event,
    similarity,
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
    'This route checks SEO portfolio overlap and differentiation risk for saved SEO drafts only.',
    'This route does not treat similarity as automatically bad.',
    'This route does not publish storefront pages.',
    'This route does not mark ready_for_publish.',
    'Passing this route only moves the draft to image ALT truth review.',
    'Final publish readiness still requires image ALT truth, structured data/sitemap readiness, and stronger sitewide/product/source overlap gates.',
  ];
}
