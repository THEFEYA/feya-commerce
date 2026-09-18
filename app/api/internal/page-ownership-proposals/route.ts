import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiAuthStatus } from '@/lib/internalAuth';
import { getMissingSupabaseServiceRoleEnvMessage, getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type UnknownRecord = Record<string, unknown>;

type OwnershipRecommendation = {
  query_cluster_id: string;
  recommendation: 'PROPOSE_PAGE' | 'NO_SUITABLE_PAGE' | 'HUMAN_REVIEW';
  seo_page_id: string | null;
  ownership_role: 'primary';
  rationale: string;
  issues: string[];
};

type OpenAiOwnershipResponse = {
  results?: OwnershipRecommendation[];
  warnings?: string[];
};

const PROMPT_VERSION = 'page_ownership_proposal_v1';
const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_LIMIT = 2;
const MAX_LIMIT = 5;
const SHORTLIST_LIMIT = 20;

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .map((item) => item.trim());
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clampLimit(value: unknown) {
  const numeric = asNumber(value);
  if (numeric == null) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(numeric)));
}

function getResponseText(payload: { output_text?: unknown; output?: unknown }) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  if (!Array.isArray(payload.output)) return '';

  return payload.output
    .flatMap((item) =>
      typeof item === 'object' && item && 'content' in item && Array.isArray(item.content)
        ? item.content
        : [],
    )
    .map((content) =>
      typeof content === 'object' && content && 'text' in content && typeof content.text === 'string'
        ? content.text
        : '',
    )
    .join('\n');
}

function extractJsonPayload(text: string): OpenAiOwnershipResponse {
  try {
    return JSON.parse(text) as OpenAiOwnershipResponse;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('OpenAI page ownership response did not contain JSON.');
    return JSON.parse(match[0]) as OpenAiOwnershipResponse;
  }
}

function normalizeRecommendation(
  value: unknown,
  fallbackClusterId: string,
): OwnershipRecommendation {
  const row = isRecord(value) ? value : {};
  const rawRecommendation = asString(row.recommendation)?.toUpperCase();

  const recommendation: OwnershipRecommendation['recommendation'] =
    rawRecommendation === 'PROPOSE_PAGE' ||
    rawRecommendation === 'NO_SUITABLE_PAGE' ||
    rawRecommendation === 'HUMAN_REVIEW'
      ? rawRecommendation
      : 'HUMAN_REVIEW';

  return {
    query_cluster_id: asString(row.query_cluster_id) || fallbackClusterId,
    recommendation,
    seo_page_id: asString(row.seo_page_id),
    ownership_role: 'primary',
    rationale: asString(row.rationale) || 'Ownership requires human review.',
    issues: asStringArray(row.issues),
  };
}

function compactCluster(row: UnknownRecord) {
  return {
    query_cluster_id: row.query_cluster_id,
    cluster_code: row.cluster_code,
    cluster_label: row.cluster_label,
    normalized_intent: row.normalized_intent,
    intent_type: row.intent_type,
    language_code: row.language_code,
    market_scope: row.market_scope,
    member_count: row.member_count,
  };
}

function compactPage(row: UnknownRecord) {
  return {
    seo_page_id: row.seo_page_id,
    page_type: row.page_type,
    url_path: row.url_path,
    lifecycle_state: row.lifecycle_state,
    indexation_intent: row.indexation_intent,
    protected_winner_flag: row.protected_winner_flag,
    card_title: row.card_title,
    h1: row.h1,
    product_type: row.product_type,
    material: row.material,
    color: row.color,
    lexical_overlap_score: row.lexical_overlap_score,
    shortlist_rank: row.shortlist_rank,
    shortlist_method: row.shortlist_method,
  };
}

async function runOpenAiOwnership(
  packets: Array<{ cluster: UnknownRecord; pages: UnknownRecord[] }>,
  model: string,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content:
            'You are the FEYA Organic Search Portfolio Manager proposing primary page ownership for already-approved semantic query clusters. Return JSON only. Use only the supplied page shortlist. Lexical overlap is retrieval evidence, not an ownership score. Recommend PROPOSE_PAGE only when one existing page clearly matches the full search intent better than alternatives. For broad collection/category/event/style intent, do not force a narrow product page; return NO_SUITABLE_PAGE when the current portfolio lacks the right page. HUMAN_REVIEW is appropriate when two or more pages are genuinely ambiguous. Do not create landing pages, change indexation, merge URLs, alter content, or infer demand/rankings. Protected winners should not be repurposed without explicit evidence.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt_version: PROMPT_VERSION,
            required_shape: {
              results: [
                {
                  query_cluster_id: 'uuid',
                  recommendation: 'PROPOSE_PAGE|NO_SUITABLE_PAGE|HUMAN_REVIEW',
                  seo_page_id: 'uuid|null',
                  ownership_role: 'primary',
                  rationale: 'brief string',
                  issues: ['string'],
                },
              ],
              warnings: ['string'],
            },
            rules: [
              'Choose only seo_page_id values from the supplied shortlist for that cluster.',
              'A product page must be product-intent specific; do not use it as a substitute for a missing collection page.',
              'Do not infer page quality from keyword repetition alone.',
              'Do not change indexation_intent. Ownership and indexability are separate decisions.',
              'Do not assign more than one primary page to the same cluster/market/locale.',
              'Prefer NO_SUITABLE_PAGE over a weak semantic match.',
              'Lexical overlap may help retrieve candidates but cannot prove search-intent ownership.',
            ],
            packets: packets.map((packet) => ({
              cluster: compactCluster(packet.cluster),
              page_shortlist: packet.pages.map(compactPage),
            })),
          }),
        },
      ],
      text: { format: { type: 'json_object' } },
      max_output_tokens: 5000,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`OpenAI ownership proposal request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { output_text?: unknown; output?: unknown };
  return extractJsonPayload(getResponseText(payload));
}

export async function POST(request: NextRequest) {
  const auth = getInternalApiAuthStatus(request);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { limit?: unknown; dryRun?: unknown };
  const limit = clampLimit(body.limit);
  const dryRun = body.dryRun !== false;
  const model = process.env.OPENAI_PAGE_OWNERSHIP_MODEL || DEFAULT_MODEL;
  const runId = randomUUID();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, dryRun, runId, error: getMissingSupabaseServiceRoleEnvMessage() },
      { status: 500 },
    );
  }

  const { data: clusters, error: clusterError } = await supabase
    .from('feya_commerce_v_page_query_ownership_candidate_clusters_v1')
    .select('*')
    .eq('ownership_candidate_status', 'READY_FOR_OWNERSHIP_PROPOSAL')
    .order('cluster_code', { ascending: true })
    .limit(limit);

  if (clusterError) {
    return NextResponse.json({ ok: false, dryRun, runId, error: clusterError.message }, { status: 500 });
  }

  const selectedClusters = (clusters || []) as UnknownRecord[];
  if (!selectedClusters.length) {
    return NextResponse.json({
      ok: true,
      dryRun,
      runId,
      selectedClusterCount: 0,
      recommendationCount: 0,
      recordedCount: 0,
      model,
      promptVersion: PROMPT_VERSION,
      results: [],
      warnings: ['No approved query clusters without primary ownership are ready for page-ownership proposals.'],
    });
  }

  const packets: Array<{ cluster: UnknownRecord; pages: UnknownRecord[] }> = [];

  for (const cluster of selectedClusters) {
    const clusterId = asString(cluster.query_cluster_id);
    if (!clusterId) continue;

    const { data: pages, error: pageError } = await supabase
      .from('feya_commerce_v_page_ownership_shortlist_v1')
      .select('*')
      .eq('query_cluster_id', clusterId)
      .order('shortlist_rank', { ascending: true })
      .limit(SHORTLIST_LIMIT);

    if (pageError) {
      return NextResponse.json({ ok: false, dryRun, runId, error: pageError.message }, { status: 500 });
    }

    packets.push({ cluster, pages: (pages || []) as UnknownRecord[] });
  }

  try {
    const parsed = await runOpenAiOwnership(packets, model);
    const rawResults = Array.isArray(parsed.results) ? parsed.results : [];
    const byCluster = new Map<string, unknown>();

    for (const result of rawResults) {
      const record = isRecord(result) ? result : null;
      const clusterId = record ? asString(record.query_cluster_id) : null;
      if (clusterId) byCluster.set(clusterId, result);
    }

    const results = packets.map((packet) => {
      const clusterId = asString(packet.cluster.query_cluster_id) || '';
      const recommendation = normalizeRecommendation(byCluster.get(clusterId), clusterId);
      const allowedPageIds = new Set(
        packet.pages
          .map((page) => asString(page.seo_page_id))
          .filter((value): value is string => Boolean(value)),
      );

      if (
        recommendation.recommendation === 'PROPOSE_PAGE' &&
        (!recommendation.seo_page_id || !allowedPageIds.has(recommendation.seo_page_id))
      ) {
        return {
          ...recommendation,
          recommendation: 'HUMAN_REVIEW' as const,
          seo_page_id: null,
          issues: [...recommendation.issues, 'Model selected a page outside the supplied shortlist.'],
        };
      }

      if (recommendation.recommendation !== 'PROPOSE_PAGE') {
        return { ...recommendation, seo_page_id: null };
      }

      return recommendation;
    });

    let recordedCount = 0;
    const writeWarnings: string[] = [];

    if (!dryRun) {
      for (const result of results) {
        if (result.recommendation !== 'PROPOSE_PAGE' || !result.seo_page_id) continue;

        const packet = packets.find(
          (item) => asString(item.cluster.query_cluster_id) === result.query_cluster_id,
        );
        const selectedPage = packet?.pages.find(
          (page) => asString(page.seo_page_id) === result.seo_page_id,
        );

        const { data: recorded, error: recordError } = await supabase.rpc(
          'feya_fn_record_page_ownership_proposal_v1',
          {
            p_query_cluster_id: result.query_cluster_id,
            p_seo_page_id: result.seo_page_id,
            p_ownership_role: 'primary',
            p_market_code: 'US',
            p_locale: 'en-US',
            p_rationale: result.rationale,
            p_evidence_json: {
              issues: result.issues,
              shortlist_method: 'lexical_candidate_retrieval_not_ownership',
              selected_page: selectedPage ? compactPage(selectedPage) : null,
            },
            p_model_name: model,
            p_prompt_version: PROMPT_VERSION,
            p_run_id: runId,
          },
        );

        if (recordError) {
          writeWarnings.push(`${result.query_cluster_id}: ${recordError.message}`);
          continue;
        }

        if (recorded?.[0]?.created_new) recordedCount += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      runId,
      selectedClusterCount: packets.length,
      recommendationCount: results.length,
      recordedCount,
      model,
      promptVersion: PROMPT_VERSION,
      results,
      warnings: [...(parsed.warnings || []), ...writeWarnings],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        dryRun,
        runId,
        selectedClusterCount: packets.length,
        recommendationCount: 0,
        recordedCount: 0,
        model,
        promptVersion: PROMPT_VERSION,
        results: [],
        error: error instanceof Error ? error.message : 'Page ownership proposal generation failed.',
      },
      { status: 500 },
    );
  }
}
