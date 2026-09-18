import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiAuthStatus } from '@/lib/internalAuth';
import { getMissingSupabaseServiceRoleEnvMessage, getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type UnknownRecord = Record<string, unknown>;

type CqaIssue = {
  issue_code: string | null;
  severity: 'BLOCKER' | 'MAJOR' | 'MINOR';
  field: string | null;
  evidence: string | null;
  required_correction: string | null;
  domain_owner: string | null;
};

type CqaResult = {
  draft_id: string;
  cqa_status: 'pass' | 'pass_with_warnings' | 'revision_required' | 'domain_review_required' | 'reject';
  summary: string | null;
  issues: CqaIssue[];
  warnings: string[];
  interpretation_limits: string[];
};

type OpenAiCqaResponse = {
  results?: CqaResult[];
  warnings?: string[];
};

const PROMPT_VERSION = 'content_cqa_v1';
const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 5;

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .map((item) => item.trim());
}

function clampLimit(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(numeric)));
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function compactArray(value: unknown, limit = 12) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

function pickObject(source: unknown, keys: string[]) {
  if (!isRecord(source)) return {};
  const result: UnknownRecord = {};
  for (const key of keys) {
    if (key in source) result[key] = source[key];
  }
  return result;
}

function compactProductTruth(value: unknown) {
  if (!isRecord(value)) return {};
  return {
    canonical_product_id: value.canonical_product_id,
    title: value.title,
    slug: value.slug,
    category: value.category,
    world: value.world,
    material: value.material,
    color: value.color,
    known_components: compactArray(value.known_components, 20),
    included_components: compactArray(value.included_components, 20),
    known_non_components: compactArray(value.known_non_components, 20),
    optional_configurations: compactArray(value.optional_configurations, 20),
    available_variants: compactArray(value.available_variants, 20),
    sellable_offer_components: compactArray(value.sellable_offer_components, 20),
    unresolved_component_facts: compactArray(value.unresolved_component_facts, 20),
    component_review_blockers: compactArray(value.component_review_blockers, 20),
    primary_image_alt: value.primary_image_alt,
  };
}

function compactKeywordRoleItem(value: unknown) {
  return pickObject(value, [
    'role',
    'keyword',
    'keyword_norm',
    'placement',
    'usage_constraint',
    'role_reason',
    'metric_source',
    'avg_monthly_searches',
    'competition',
    'competition_index',
    'region',
    'language',
  ]);
}

function compactKeywordRoles(value: unknown) {
  if (!isRecord(value)) return {};
  const result: UnknownRecord = {};
  for (const role of ['primary', 'secondary', 'support', 'collection', 'faq_commercial', 'image_alt', 'hold', 'reject']) {
    const items = compactArray(value[role], 12).map(compactKeywordRoleItem);
    if (items.length) result[role] = items;
  }
  return result;
}

function compactValidation(value: unknown) {
  if (!isRecord(value)) return {};
  return {
    status: value.status,
    issues: compactArray(value.issues, 20).map((issue) =>
      pickObject(issue, ['code', 'severity', 'message', 'field', 'keyword']),
    ),
    approval_blockers: compactArray(value.approval_blockers, 20),
    product_truth_blockers: compactArray(value.product_truth_blockers, 20),
  };
}

function compactSimilarity(value: unknown) {
  if (!isRecord(value)) return {};
  return {
    status: value.status,
    risk_reason: value.risk_reason,
    primary_keyword: value.primary_keyword,
    shared_tokens: compactArray(value.shared_tokens, 20),
    competing_products: compactArray(value.competing_products, 12),
    suggested_resolution: value.suggested_resolution,
  };
}

function compactQaSelfReport(value: unknown) {
  return pickObject(value, [
    'similarity_cannibalization',
    'image_alt_truth',
    'keyword_stuffing',
    'forbidden_mismatch',
    'product_specificity',
    'commercial_placement',
    'cliche_phrase',
    'long_dash',
    'validated_metrics',
  ]);
}

function compactProposal(row: UnknownRecord) {
  const agentOutput = isRecord(row.agent_output_snapshot) ? row.agent_output_snapshot : {};
  return {
    seo_title: row.seo_title,
    h1: row.h1,
    meta_description: row.meta_description,
    intro: row.intro,
    bullet_highlights: compactArray(row.bullet_highlights, 12),
    faq: compactArray(row.faq, 12),
    image_alt_candidates: compactArray(row.image_alt_candidates, 20),
    internal_linking_hints: compactArray(row.internal_linking_hints, 20),
    pdp_blocks: compactArray(agentOutput.pdp_blocks, 20),
    visual_truth: agentOutput.visual_truth,
    suppressed_sections: compactArray(agentOutput.suppressed_sections, 20),
  };
}

function buildCqaContext(row: UnknownRecord) {
  return {
    draft_id: row.id,
    canonical_product_id: row.canonical_product_id,
    proposal: compactProposal(row),
    product_truth: compactProductTruth(row.product_truth_snapshot),
    manual_focus: pickObject(row.manual_focus_snapshot, [
      'page_goal',
      'primary_axis',
      'secondary_axes',
      'persona',
      'event',
      'style',
      'material',
      'color',
    ]),
    keyword_roles: compactKeywordRoles(row.keyword_roles_snapshot),
    metrics_status: pickObject(row.metrics_status_snapshot, [
      'status',
      'validated_count',
      'missing_metric_count',
      'unknown_competition_count',
      'note',
    ]),
    deterministic_validation: compactValidation(row.validation_result_snapshot),
    similarity: compactSimilarity(row.similarity_check_snapshot),
    deterministic_qa_flags: compactQaSelfReport(row.qa_self_report),
    human_review_status: row.review_status,
  };
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

function extractJsonPayload(text: string): OpenAiCqaResponse {
  try {
    return JSON.parse(text) as OpenAiCqaResponse;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('OpenAI CQA response did not contain JSON.');
    return JSON.parse(match[0]) as OpenAiCqaResponse;
  }
}

function normalizeIssue(value: unknown): CqaIssue {
  const issue = isRecord(value) ? value : {};
  const rawSeverity = asString(issue.severity)?.toUpperCase();
  const severity: CqaIssue['severity'] =
    rawSeverity === 'BLOCKER' || rawSeverity === 'MAJOR' || rawSeverity === 'MINOR'
      ? rawSeverity
      : 'MAJOR';

  return {
    issue_code: asString(issue.issue_code),
    severity,
    field: asString(issue.field),
    evidence: asString(issue.evidence),
    required_correction: asString(issue.required_correction),
    domain_owner: asString(issue.domain_owner),
  };
}

function normalizeStatus(value: unknown): CqaResult['cqa_status'] {
  const status = asString(value)?.toLowerCase();
  if (
    status === 'pass' ||
    status === 'pass_with_warnings' ||
    status === 'revision_required' ||
    status === 'domain_review_required' ||
    status === 'reject'
  ) {
    return status;
  }
  return 'domain_review_required';
}

function normalizeResult(value: unknown, fallbackDraftId: string): CqaResult {
  const row = isRecord(value) ? value : {};
  return {
    draft_id: asString(row.draft_id) || fallbackDraftId,
    cqa_status: normalizeStatus(row.cqa_status),
    summary: asString(row.summary),
    issues: compactArray(row.issues, 30).map(normalizeIssue),
    warnings: asStringArray(row.warnings),
    interpretation_limits: asStringArray(row.interpretation_limits),
  };
}

async function runIndependentCqa(rows: UnknownRecord[], model: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const contexts = rows.map(buildCqaContext);

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
            'You are the independent FEYA Content Quality Auditor. Review the supplied proposal against Product Truth, approved keyword roles, deterministic validation, similarity and image-alt evidence. Return JSON only. Do not rewrite the content. Do not invent facts, metrics, components, colors, materials, events, policies or search strategy. Human approval is context, not proof of quality. Do not create or change page intent. Do not claim cannibalization beyond supplied evidence. Use BLOCKER only for production-stopping factual/scope/validation problems, MAJOR for required revision/domain review, and MINOR for non-blocking quality warnings. Prefer PASS or PASS_WITH_WARNINGS when the proposal is grounded and useful; do not reject for stylistic preference alone.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt_version: PROMPT_VERSION,
            required_shape: {
              results: [
                {
                  draft_id: 'uuid',
                  cqa_status:
                    'pass|pass_with_warnings|revision_required|domain_review_required|reject',
                  summary: 'brief string|null',
                  issues: [
                    {
                      issue_code: 'string|null',
                      severity: 'BLOCKER|MAJOR|MINOR',
                      field: 'string|null',
                      evidence: 'brief source-supported explanation|null',
                      required_correction: 'specific correction|null',
                      domain_owner: 'SCO|OSPM|TSEO|PRODUCT_TRUTH|HUMAN_OWNER|null',
                    },
                  ],
                  warnings: ['string'],
                  interpretation_limits: ['string'],
                },
              ],
              warnings: ['string'],
            },
            mandatory_rules: [
              'A factual claim unsupported by Product Truth is a blocker or domain review issue.',
              'Configuration is not the same as component.',
              'Styled imagery does not prove an item is included in the purchase.',
              'Do not turn advertising competition into organic SEO difficulty.',
              'Do not fail text for missing exact-match repetitions when semantic coverage is natural.',
              'If deterministic approval_blockers or product_truth_blockers are non-empty, do not return pass.',
              'If similarity status or image_alt_truth is not pass, do not return pass; request the appropriate precheck/domain review.',
              'Do not infer a new page/query ownership decision. Route intent/portfolio conflicts to OSPM.',
              'Do not approve misleading guarantees, unsupported materials/colors/components, or policy promises.',
              'Independent CQA evaluates the proposal; it does not replace SCO by rewriting it.',
            ],
            reviews: contexts,
          }),
        },
      ],
      text: { format: { type: 'json_object' } },
      max_output_tokens: 7000,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`OpenAI CQA request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { output_text?: unknown; output?: unknown };
  return extractJsonPayload(getResponseText(payload));
}

function summarizeStatuses(results: CqaResult[]) {
  return results.reduce<Record<string, number>>((acc, result) => {
    acc[result.cqa_status] = (acc[result.cqa_status] || 0) + 1;
    return acc;
  }, {});
}

export async function POST(request: NextRequest) {
  const auth = getInternalApiAuthStatus(request);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    limit?: unknown;
    dryRun?: unknown;
  };

  const limit = clampLimit(body.limit);
  const dryRun = body.dryRun !== false;
  const model = process.env.OPENAI_CQA_MODEL || DEFAULT_MODEL;
  const runId = randomUUID();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, dryRun, runId, error: getMissingSupabaseServiceRoleEnvMessage() },
      { status: 500 },
    );
  }

  const { data: queueRows, error: queueError } = await supabase
    .from('feya_commerce_v_content_qa_shadow_status_safe_v1')
    .select('draft_id,cqa_shadow_state,cqa_status')
    .eq('cqa_status', 'not_run')
    .eq('cqa_shadow_state', 'READY_FOR_INDEPENDENT_CQA')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (queueError) {
    return NextResponse.json({ ok: false, dryRun, runId, error: queueError.message }, { status: 500 });
  }

  const draftIds = (queueRows || [])
    .map((row) => asString((row as UnknownRecord).draft_id))
    .filter((value): value is string => Boolean(value));

  if (!draftIds.length) {
    return NextResponse.json({
      ok: true,
      dryRun,
      runId,
      selectedCount: 0,
      processedCount: 0,
      recordedCount: 0,
      model,
      promptVersion: PROMPT_VERSION,
      statusCounts: {},
      results: [],
      warnings: ['No READY_FOR_INDEPENDENT_CQA drafts with cqa_status=not_run.'],
    });
  }

  const { data: draftRows, error: draftError } = await supabase
    .from('feya_commerce_seo_pack_drafts_v1')
    .select(
      'id,canonical_product_id,product_slug,status,review_status,source_mode,seo_title,h1,meta_description,intro,bullet_highlights,faq,image_alt_candidates,internal_linking_hints,product_truth_snapshot,manual_focus_snapshot,keyword_roles_snapshot,metrics_status_snapshot,qa_self_report,similarity_check_snapshot,validation_result_snapshot,agent_output_snapshot',
    )
    .in('id', draftIds);

  if (draftError) {
    return NextResponse.json({ ok: false, dryRun, runId, error: draftError.message }, { status: 500 });
  }

  const rowsById = new Map(
    ((draftRows || []) as UnknownRecord[])
      .map((row) => [asString(row.id), row] as const)
      .filter((entry): entry is [string, UnknownRecord] => Boolean(entry[0])),
  );
  const orderedRows = draftIds.map((id) => rowsById.get(id)).filter((row): row is UnknownRecord => Boolean(row));

  try {
    const parsed = await runIndependentCqa(orderedRows, model);
    const rawResults = Array.isArray(parsed.results) ? parsed.results : [];
    const resultById = new Map(
      rawResults
        .map((result) => [asString((result as unknown as UnknownRecord).draft_id), result] as const)
        .filter((entry): entry is [string, CqaResult] => Boolean(entry[0])),
    );

    const results = draftIds.map((draftId) =>
      normalizeResult(resultById.get(draftId), draftId),
    );

    let recordedCount = 0;
    const recordWarnings: string[] = [];

    if (!dryRun) {
      for (const result of results) {
        const { data: recorded, error: recordError } = await supabase.rpc(
          'feya_fn_record_content_cqa_result_v1',
          {
            p_draft_id: result.draft_id,
            p_expected_cqa_status: 'not_run',
            p_cqa_status: result.cqa_status,
            p_result: {
              run_id: runId,
              model,
              prompt_version: PROMPT_VERSION,
              summary: result.summary,
              issues: result.issues,
              warnings: result.warnings,
              interpretation_limits: result.interpretation_limits,
            },
            p_reviewer: `openai:${model}`,
            p_policy_version: PROMPT_VERSION,
          },
        );

        if (recordError) {
          recordWarnings.push(`${result.draft_id}: ${recordError.message}`);
          continue;
        }

        if (recorded?.length) recordedCount += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      runId,
      selectedCount: draftIds.length,
      processedCount: results.length,
      recordedCount,
      model,
      promptVersion: PROMPT_VERSION,
      statusCounts: summarizeStatuses(results),
      results,
      warnings: [...(parsed.warnings || []), ...recordWarnings],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        dryRun,
        runId,
        selectedCount: draftIds.length,
        processedCount: 0,
        recordedCount: 0,
        model,
        promptVersion: PROMPT_VERSION,
        statusCounts: {},
        results: [],
        error: error instanceof Error ? error.message : 'Independent CQA failed.',
      },
      { status: 500 },
    );
  }
}
