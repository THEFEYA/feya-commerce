// @ts-nocheck
import { NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const STORAGE_TABLE = 'feya_commerce_seo_pack_drafts_v1';
const STORAGE_EVENTS_TABLE = 'feya_commerce_seo_pack_draft_events_v1';
const STORAGE_FLAG = 'FEYA_SEO_DRAFT_STORAGE_ENABLED';
const MAX_COMPARISON_DRAFTS = 200;
const WARNING_THRESHOLD = 0.55;
const BLOCKER_THRESHOLD = 0.72;

const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','by','can','for','from','in','into','is','it','of','on','or','the','this','to','with','your',
  'outfit','costume','fashion','wear','clothes','clothing','handmade','festival','rave','man','mens','men','women','womens','woman',
  'for','ready','review','draft','seo','pack','product','check','checked','thefeya'
]);

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/admin/seo-engine/draft-similarity-check',
    method: 'POST',
    mode: 'guarded_portfolio_overlap_preflight',
    feature_flag: STORAGE_FLAG,
    strategy_doc: 'docs/SEO_PORTFOLIO_OVERLAP_STRATEGY_V1.md',
    thresholds: {
      warning: WARNING_THRESHOLD,
      blocker: BLOCKER_THRESHOLD,
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
    .select('id,canonical_product_id,product_slug,status,review_status,seo_title,h1,meta_description,intro,bullet_highlights,faq,image_alt_candidates,internal_linking_hints,keyword_roles_snapshot,qa_self_report,similarity_check_snapshot,created_at,updated_at')
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
    .select('id,canonical_product_id,product_slug,status,review_status,seo_title,h1,meta_description,intro,bullet_highlights,faq,internal_linking_hints,keyword_roles_snapshot,created_at')
    .neq('id', draftId)
    .is('archived_at', null)
    .limit(MAX_COMPARISON_DRAFTS);

  if (candidatesError) {
    return NextResponse.json({
      ok: false,
      status: 'candidate_load_failed',
      error: candidatesError.message,
      guardrails: guardrails(),
    }, { status: 500 });
  }

  const similarity = runPortfolioOverlapCheck(currentDraft, candidateDrafts || []);
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

function runPortfolioOverlapCheck(currentDraft, candidateDrafts) {
  const currentTokens = tokenizeDraft(currentDraft);
  const matches = candidateDrafts.map((candidate) => {
    const candidateTokens = tokenizeDraft(candidate);
    const shared = [...currentTokens].filter((token) => candidateTokens.has(token));
    const unionSize = new Set([...currentTokens, ...candidateTokens]).size || 1;
    const jaccard = shared.length / unionSize;
    const targetCoverage = currentTokens.size ? shared.length / currentTokens.size : 0;
    const score = Math.max(jaccard, targetCoverage * 0.82);
    return {
      draft_id: candidate.id,
      canonical_product_id: candidate.canonical_product_id,
      product_slug: candidate.product_slug,
      status: candidate.status,
      review_status: candidate.review_status,
      similarity_pct: roundPct(score),
      jaccard_pct: roundPct(jaccard),
      target_coverage_pct: roundPct(targetCoverage),
      shared_tokens: shared.slice(0, 30),
    };
  }).sort((a, b) => b.similarity_pct - a.similarity_pct);

  const max = matches[0]?.similarity_pct || 0;
  const status = max >= BLOCKER_THRESHOLD * 100
    ? 'blocker'
    : max >= WARNING_THRESHOLD * 100
      ? 'warning'
      : 'pass';

  return {
    contract_version: 'seo_portfolio_overlap_check_v1',
    method: 'token_overlap_storage_drafts_v1',
    status,
    checked_at: new Date().toISOString(),
    thresholds: {
      warning_pct: roundPct(WARNING_THRESHOLD),
      blocker_pct: roundPct(BLOCKER_THRESHOLD),
    },
    target: {
      draft_id: currentDraft.id,
      canonical_product_id: currentDraft.canonical_product_id,
      product_slug: currentDraft.product_slug,
      token_count: currentTokens.size,
    },
    comparison_count: candidateDrafts.length,
    max_similarity_pct: max,
    top_matches: matches.slice(0, 10),
    decision: status === 'pass'
      ? 'No saved SEO draft crossed the warning threshold. This is not a ban on strategic similarity; continue to image ALT truth review.'
      : 'Review overlap before publish readiness. Decide whether this is strategic cluster expansion or duplicate/conflict risk.',
    interpretation: [
      'Similarity is not automatically bad for Google SEO.',
      'A product cluster can be expanded when pages have distinct product truth, images, intent, and internal linking.',
      'The risk is exact duplication, unclear keyword ownership, and repeated AI-style copy across URLs.',
    ],
    limitations: [
      'This is a storage-draft preflight, not a full sitewide canonical similarity index yet.',
      'It compares saved SEO drafts only. Current imported Etsy/source titles, descriptions, tags, product catalog text, and storefront similarity should be added as the next stronger layer.',
      'It does not use Google Search Console or GA4 performance feedback yet.',
      'It does not call OpenAI.',
    ],
  };
}

function tokenizeDraft(draft) {
  const raw = [
    draft.seo_title,
    draft.h1,
    draft.meta_description,
    draft.intro,
    JSON.stringify(draft.bullet_highlights || []),
    JSON.stringify(draft.faq || []),
    JSON.stringify(draft.internal_linking_hints || []),
    JSON.stringify(draft.keyword_roles_snapshot || {}),
  ].filter(Boolean).join(' ');

  return new Set(raw
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim().replace(/^-+|-+$/g, ''))
    .filter((token) => token.length >= 4)
    .filter((token) => !STOPWORDS.has(token))
    .slice(0, 220));
}

function roundPct(value) {
  return Math.round(value * 1000) / 10;
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
