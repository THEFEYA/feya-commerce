import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiAuthStatus } from '@/lib/internalAuth';
import { recordOpenAiInvocation } from '@/lib/openAiUsage';
import { getMissingSupabaseServiceRoleEnvMessage, getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type UnknownRecord = Record<string, unknown>;

type ClusterMember = {
  cleanup_id: number;
  keyword_norm: string;
  member_role: 'seed' | 'member';
};

type ClusterProposal = {
  cluster_label: string;
  normalized_intent: string;
  intent_type: string | null;
  members: ClusterMember[];
  rationale: string | null;
};

type OpenAiClusterResponse = {
  proposals?: ClusterProposal[];
  warnings?: string[];
};

const PROMPT_VERSION = 'query_cluster_proposal_v1';
const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 20;

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
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

function extractJsonPayload(text: string): OpenAiClusterResponse {
  try {
    return JSON.parse(text) as OpenAiClusterResponse;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('OpenAI query cluster response did not contain JSON.');
    return JSON.parse(match[0]) as OpenAiClusterResponse;
  }
}

function normalizeMember(value: unknown): ClusterMember | null {
  if (!isRecord(value)) return null;

  const cleanupId = asNumber(value.cleanup_id);
  const keywordNorm = asString(value.keyword_norm);
  const rawRole = asString(value.member_role)?.toLowerCase();
  const memberRole: ClusterMember['member_role'] = rawRole === 'seed' ? 'seed' : 'member';

  if (cleanupId == null || !keywordNorm) return null;

  return {
    cleanup_id: Math.trunc(cleanupId),
    keyword_norm: keywordNorm.toLowerCase().replace(/\s+/g, ' ').trim(),
    member_role: memberRole,
  };
}

function normalizeProposal(value: unknown): ClusterProposal | null {
  if (!isRecord(value)) return null;

  const clusterLabel = asString(value.cluster_label);
  const normalizedIntent = asString(value.normalized_intent);
  if (!clusterLabel || !normalizedIntent) return null;

  const members = asArray(value.members)
    .map(normalizeMember)
    .filter((member): member is ClusterMember => Boolean(member));

  if (!members.length) return null;

  if (members.filter((member) => member.member_role === 'seed').length !== 1) {
    return null;
  }

  return {
    cluster_label: clusterLabel,
    normalized_intent: normalizedIntent.toLowerCase().replace(/\s+/g, ' ').trim(),
    intent_type: asString(value.intent_type),
    members,
    rationale: asString(value.rationale),
  };
}

function compactCandidate(row: UnknownRecord) {
  return {
    cleanup_id: row.cleanup_id,
    keyword_norm: row.keyword_norm,
    approved_keyword: row.approved_keyword,
    keyword_axis: row.keyword_axis,
    keyword_pattern: row.keyword_pattern,
    suggested_page_level: row.suggested_page_level,
    ai_intent: row.ai_intent,
    avg_monthly_searches: row.avg_monthly_searches,
    metric_freshness_status: row.metric_freshness_status,
  };
}

async function runOpenAiClusterProposal(rows: UnknownRecord[], model: string, runId: string, dryRun: boolean) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const startedAt = Date.now();
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: 'system',
          content:
            'You are the FEYA Organic Search Portfolio Manager proposing semantic query clusters. Return JSON only. Use only the supplied human-approved keyword candidates. A query cluster groups near-equivalent search intents, close variants or strongly substitutable phrases — not merely words sharing the same axis, style, event or product family. Single-member clusters are allowed when no true synonym/near-equivalent exists. Do not create landing pages, page ownership, keyword metrics or SEO difficulty. Do not infer demand, trends, rankings or commercial performance. Do not include any keyword that is not in the supplied candidate list.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt_version: PROMPT_VERSION,
            required_shape: {
              proposals: [
                {
                  cluster_label: 'string',
                  normalized_intent: 'string',
                  intent_type: 'transactional|commercial|informational|navigational|image_alt|unclear|null',
                  members: [
                    {
                      cleanup_id: 'integer',
                      keyword_norm: 'exact supplied keyword_norm',
                      member_role: 'seed|member',
                    },
                  ],
                  rationale: 'brief semantic rationale',
                },
              ],
              warnings: ['string'],
            },
            rules: [
              'Exactly one seed per proposal.',
              'Do not group different products merely because they share Burning Man, rave, cyberpunk, material, color, persona or style.',
              'Do not group corset with top, bracelet with choker, skirt with harness, etc. unless the phrases are genuine close search substitutes.',
              'Prefer a single-member proposal over an over-broad semantic cluster.',
              'Axis/pattern are evidence hints, not cluster IDs.',
              'Google Ads competition is advertising competition, not SEO difficulty.',
              'Metrics may be stale or absent; clustering must remain semantic.',
              'A proposal is not canonical until human review and apply.',
            ],
            candidates: rows.map(compactCandidate),
          }),
        },
      ],
      text: { format: { type: 'json_object' } },
      max_output_tokens: 6000,
    }),
    cache: 'no-store',
  });

  const latencyMs = Date.now() - startedAt;

  if (!response.ok) {
    await recordOpenAiInvocation({
      actionCode: 'RUN_QUERY_CLUSTER_PROPOSALS',
      domainOwner: 'OSPM',
      sourceEndpoint: '/api/internal/query-cluster-proposals',
      runId,
      dryRun,
      itemCount: rows.length,
      modelRequested: model,
      promptVersion: PROMPT_VERSION,
      httpStatus: response.status,
      latencyMs,
      invocationStatus: 'HTTP_ERROR',
    });
    throw new Error(`OpenAI query cluster proposal request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { output_text?: unknown; output?: unknown };
  await recordOpenAiInvocation({
    actionCode: 'RUN_QUERY_CLUSTER_PROPOSALS',
    domainOwner: 'OSPM',
    sourceEndpoint: '/api/internal/query-cluster-proposals',
    runId,
    dryRun,
    itemCount: rows.length,
    modelRequested: model,
    promptVersion: PROMPT_VERSION,
    httpStatus: response.status,
    latencyMs,
    payload,
  });
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
  const model = process.env.OPENAI_QUERY_CLUSTER_MODEL || DEFAULT_MODEL;
  const runId = randomUUID();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, dryRun, runId, error: getMissingSupabaseServiceRoleEnvMessage() },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_query_cluster_proposal_queue_safe_v1')
    .select('*')
    .order('approved_at', { ascending: true })
    .order('cleanup_id', { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, dryRun, runId, error: error.message }, { status: 500 });
  }

  const selected = (data || []) as UnknownRecord[];
  if (!selected.length) {
    return NextResponse.json({
      ok: true,
      dryRun,
      runId,
      selectedCount: 0,
      proposalCount: 0,
      recordedCount: 0,
      model,
      promptVersion: PROMPT_VERSION,
      proposals: [],
      warnings: ['No human-approved unclustered keywords are ready for query cluster proposals.'],
    });
  }

  const selectedByKeyword = new Map(
    selected
      .map((row) => {
        const keywordNorm = asString(row.keyword_norm);
        return keywordNorm ? [keywordNorm, row] as const : null;
      })
      .filter((entry): entry is readonly [string, UnknownRecord] => Boolean(entry)),
  );

  try {
    const parsed = await runOpenAiClusterProposal(selected, model, runId, dryRun);
    const rawProposals = Array.isArray(parsed.proposals) ? parsed.proposals : [];
    const proposals = rawProposals
      .map(normalizeProposal)
      .filter((proposal): proposal is ClusterProposal => Boolean(proposal))
      .filter((proposal) =>
        proposal.members.every((member) => selectedByKeyword.has(member.keyword_norm)),
      );

    let recordedCount = 0;
    const recordWarnings: string[] = [];

    if (!dryRun) {
      for (const proposal of proposals) {
        const sourceSnapshot = {
          selected_candidates: proposal.members.map((member) => {
            const row = selectedByKeyword.get(member.keyword_norm);
            return row ? compactCandidate(row) : { keyword_norm: member.keyword_norm };
          }),
          semantic_guard:
            'Proposal only. Human review/apply required before canonical query cluster creation.',
        };

        const { data: recorded, error: recordError } = await supabase.rpc(
          'feya_fn_record_query_cluster_proposal_v1',
          {
            p_cluster_label: proposal.cluster_label,
            p_normalized_intent: proposal.normalized_intent,
            p_intent_type: proposal.intent_type,
            p_language_code: 'en',
            p_market_scope: 'GLOBAL',
            p_members_json: proposal.members,
            p_rationale: proposal.rationale,
            p_model_name: model,
            p_prompt_version: PROMPT_VERSION,
            p_run_id: runId,
            p_source_snapshot_json: sourceSnapshot,
          },
        );

        if (recordError) {
          recordWarnings.push(`${proposal.cluster_label}: ${recordError.message}`);
          continue;
        }

        if (recorded?.[0]?.created_new) recordedCount += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      runId,
      selectedCount: selected.length,
      proposalCount: proposals.length,
      recordedCount,
      model,
      promptVersion: PROMPT_VERSION,
      proposals,
      warnings: [...(parsed.warnings || []), ...recordWarnings],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        dryRun,
        runId,
        selectedCount: selected.length,
        proposalCount: 0,
        recordedCount: 0,
        model,
        promptVersion: PROMPT_VERSION,
        proposals: [],
        error: error instanceof Error ? error.message : 'Query cluster proposal generation failed.',
      },
      { status: 500 },
    );
  }
}
