import { createHash, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiAuthStatus } from '@/lib/internalAuth';
import { getMissingSupabaseServiceRoleEnvMessage, getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type UnknownRecord = Record<string, unknown>;

type ScoProposal = {
  canonical_product_id: string;
  seo_title: string | null;
  h1: string | null;
  meta_description: string | null;
  intro: string | null;
  bullet_highlights: unknown[];
  faq: unknown[];
  image_alt_candidates: unknown[];
  internal_linking_hints: unknown[];
  pdp_blocks: unknown[];
  visual_truth: UnknownRecord;
  suppressed_sections: unknown[];
};

type OpenAiScoResponse = {
  results?: ScoProposal[];
  warnings?: string[];
};

const PROMPT_VERSION = 'sco_shadow_v1';
const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_LIMIT = 2;
const MAX_LIMIT = 3;
const CANDIDATE_SCAN_LIMIT = 30;

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : false;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function clampLimit(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_LIMIT;
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

function extractJsonPayload(text: string): OpenAiScoResponse {
  try {
    return JSON.parse(text) as OpenAiScoResponse;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('OpenAI SCO response did not contain JSON.');
    return JSON.parse(match[0]) as OpenAiScoResponse;
  }
}

function normalizeProposal(value: unknown, productId: string): ScoProposal {
  const row = isRecord(value) ? value : {};

  return {
    canonical_product_id: asString(row.canonical_product_id) || productId,
    seo_title: asString(row.seo_title),
    h1: asString(row.h1),
    meta_description: asString(row.meta_description),
    intro: asString(row.intro),
    bullet_highlights: asArray(row.bullet_highlights).slice(0, 12),
    faq: asArray(row.faq).slice(0, 10),
    image_alt_candidates: asArray(row.image_alt_candidates).slice(0, 20),
    internal_linking_hints: asArray(row.internal_linking_hints).slice(0, 12),
    pdp_blocks: asArray(row.pdp_blocks).slice(0, 16),
    visual_truth: isRecord(row.visual_truth) ? row.visual_truth : {},
    suppressed_sections: asArray(row.suppressed_sections).slice(0, 12),
  };
}

function proposalHash(proposal: ScoProposal) {
  return createHash('sha256').update(JSON.stringify(proposal)).digest('hex');
}

function compactProductTruth(value: unknown) {
  if (!isRecord(value)) return {};

  return {
    canonical_product_id: value.canonical_product_id,
    matched_etsy_listing_id: value.matched_etsy_listing_id,
    product_slug: value.product_slug,
    card_title: value.card_title,
    h1: value.h1,
    product_type: value.product_type,
    material: value.material,
    color: value.color,
    canonical_color_label: value.canonical_color_label,
    category_label: value.category_label,
    world_label: value.world_label,
    primary_image_url: value.primary_image_url,
    primary_image_alt: value.primary_image_alt,
    included_components: asArray(value.included_components).slice(0, 20),
    optional_configurations: asArray(value.optional_configurations).slice(0, 20),
    available_variants: asArray(value.available_variants).slice(0, 20),
    known_non_components: asArray(value.known_non_components).slice(0, 20),
    unresolved_component_facts: asArray(value.unresolved_component_facts).slice(0, 20),
    component_review_blockers_json: asArray(value.component_review_blockers_json).slice(0, 20),
  };
}

function normalizeRoleItems(value: unknown, role: string) {
  return asArray(value).slice(0, 15).map((item) => {
    if (typeof item === 'string') return { role, keyword: item };
    if (!isRecord(item)) return { role };
    return {
      ...item,
      role,
    };
  });
}

function buildKeywordRoles(compiledBrief: UnknownRecord) {
  const plan = isRecord(compiledBrief.keyword_plan_shadow) ? compiledBrief.keyword_plan_shadow : {};
  const primaryKeyword = asString(plan.primary_keyword);

  return {
    primary: primaryKeyword
      ? [
          {
            role: 'primary',
            keyword: primaryKeyword,
            placement: 'product',
            source: 'content_brief_compiler_shadow',
            canonical_ownership: false,
          },
        ]
      : [],
    secondary: normalizeRoleItems(plan.secondary_keywords, 'secondary'),
    support: normalizeRoleItems(plan.supporting_terms, 'support'),
    image_alt: normalizeRoleItems(plan.image_alt_terms, 'image_alt'),
    collection: [],
    faq_commercial: [],
    hold: [],
    reject: normalizeRoleItems(plan.blocked_terms, 'reject'),
  };
}

function buildMetricsSnapshot(row: UnknownRecord, compiledBrief: UnknownRecord) {
  const plan = isRecord(compiledBrief.keyword_plan_shadow) ? compiledBrief.keyword_plan_shadow : {};

  return {
    status:
      asString(row.compiler_status) === 'SHADOW_READY_WAITING_METRICS'
        ? 'shadow_waiting_metrics'
        : 'shadow_compiler',
    canonical_metrics_ready: false,
    plan_status: asString(row.plan_status),
    primary_keyword: asString(row.primary_keyword),
    evidence: isRecord(plan.evidence) ? plan.evidence : {},
    note:
      'Growth OS SCO shadow generation may use current semantic keyword guidance, but unresolved metrics/query ownership remain non-canonical.',
  };
}

function validateProposal(proposal: ScoProposal, compiledBrief: UnknownRecord) {
  const issues: UnknownRecord[] = [];
  const approvalBlockers: UnknownRecord[] = [];

  for (const [field, value] of [
    ['seo_title', proposal.seo_title],
    ['h1', proposal.h1],
    ['meta_description', proposal.meta_description],
    ['intro', proposal.intro],
  ] as const) {
    if (!value) {
      approvalBlockers.push({
        code: `MISSING_${field.toUpperCase()}`,
        severity: 'BLOCKER',
        field,
        message: `${field} is required for an SCO shadow proposal.`,
      });
    }
  }

  if (proposal.seo_title && proposal.seo_title.length > 70) {
    issues.push({ code: 'SEO_TITLE_TOO_LONG', severity: 'WARNING', field: 'seo_title' });
  }
  if (proposal.h1 && proposal.h1.length > 90) {
    issues.push({ code: 'H1_TOO_LONG', severity: 'WARNING', field: 'h1' });
  }
  if (proposal.meta_description && proposal.meta_description.length > 170) {
    issues.push({ code: 'META_DESCRIPTION_TOO_LONG', severity: 'WARNING', field: 'meta_description' });
  }
  if (proposal.meta_description && proposal.meta_description.length < 90) {
    issues.push({ code: 'META_DESCRIPTION_THIN', severity: 'WARNING', field: 'meta_description' });
  }

  const legacyContract = isRecord(compiledBrief.legacy_generator_contract)
    ? compiledBrief.legacy_generator_contract
    : {};
  const blockedClaims = asArray(legacyContract.blocked_claims)
    .map(asString)
    .filter((value): value is string => Boolean(value));

  const visibleText = [
    proposal.seo_title,
    proposal.h1,
    proposal.meta_description,
    proposal.intro,
    ...proposal.bullet_highlights.map((value) => (typeof value === 'string' ? value : JSON.stringify(value))),
    ...proposal.pdp_blocks.map((value) => (typeof value === 'string' ? value : JSON.stringify(value))),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const claim of blockedClaims) {
    if (visibleText.includes(claim.toLowerCase())) {
      approvalBlockers.push({
        code: 'BLOCKED_LEGACY_CLAIM',
        severity: 'BLOCKER',
        field: 'content',
        message: `Blocked claim detected: ${claim}`,
      });
    }
  }

  const status = approvalBlockers.length ? 'warning' : issues.length ? 'warning' : 'valid';

  return {
    ok: approvalBlockers.length === 0,
    status,
    issues,
    approval_blockers: approvalBlockers,
    product_truth_blockers: [],
    shadow_validation: true,
    compiler_status: compiledBrief.compiler_status,
  };
}

async function runSco(rows: Array<{ productId: string; brief: UnknownRecord; truth: UnknownRecord }>, model: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const reviews = rows.map(({ productId, brief, truth }) => ({
    canonical_product_id: productId,
    compiler_status: brief.compiler_status,
    can_produce_canonical_brief: asBoolean(brief.can_produce_canonical_brief),
    brief: brief.compiled_brief_json,
    product_truth: compactProductTruth(truth),
  }));

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
            'You are the FEYA SEO Content Optimizer in SHADOW mode. Return JSON only. Write useful, natural customer-facing English copy strictly from supplied Product Truth, active Business Truth and Content Policy. The supplied strategy and keyword plan are shadow guidance, not canonical query ownership. Do not change page intent, invent product facts, material, color, included components, fit, comfort, durability, adjustability, policies, delivery guarantees or event affiliations. Do not force exact keywords or keyword density. Configuration is not the same as component. Styled imagery does not prove an item is included. If a requested content block cannot be grounded, omit it or add it to suppressed_sections. Do not publish, approve, or claim CQA pass.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt_version: PROMPT_VERSION,
            required_shape: {
              results: [
                {
                  canonical_product_id: 'uuid',
                  seo_title: 'string',
                  h1: 'string',
                  meta_description: 'string',
                  intro: 'string',
                  bullet_highlights: ['string'],
                  faq: [{ question: 'string', answer: 'string' }],
                  image_alt_candidates: [
                    {
                      image_role: 'primary|secondary',
                      alt_text: 'string',
                      truth_basis: 'product_truth|visible_image_fact',
                    },
                  ],
                  internal_linking_hints: [
                    {
                      target_role: 'related_product|future_collection|editorial',
                      anchor_hint: 'string',
                      note: 'string',
                    },
                  ],
                  pdp_blocks: [
                    {
                      block_key: 'string',
                      heading: 'string',
                      body: 'string',
                      source_basis: 'product_fact|business_truth|brand_policy',
                      needs_human_review: 'boolean',
                    },
                  ],
                  visual_truth: {
                    observed_product_facts: ['string'],
                    uncertain_or_missing_facts: ['string'],
                    forbidden_visual_claims: ['string'],
                  },
                  suppressed_sections: ['string'],
                },
              ],
              warnings: ['string'],
            },
            rules: [
              'Use active Business Truth exactly as factual policy context; do not infer REVIEW_REQUIRED policy.',
              'If production day type is unspecified, say 3–5 days without calling them business days.',
              'Do not state returns policy unless it is supplied as ACTIVE Business Truth.',
              'Do not promise guaranteed delivery dates.',
              'Do not treat advertising competition as SEO difficulty.',
              'Do not invent internal links or destination URLs. Return role/anchor hints only.',
              'ALT text must only use supplied image/product truth. If insufficient, omit ALT candidate.',
              'Do not describe accessories or styled items as included unless Product Truth confirms them.',
              'The proposal is a draft that still requires human review, similarity checks, image-alt verification and independent CQA.',
            ],
            briefs: reviews,
          }),
        },
      ],
      text: { format: { type: 'json_object' } },
      max_output_tokens: 9000,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`OpenAI SCO request failed with status ${response.status}.`);
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
  const model = process.env.OPENAI_SCO_MODEL || DEFAULT_MODEL;
  const runId = randomUUID();

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, dryRun, runId, error: getMissingSupabaseServiceRoleEnvMessage() },
      { status: 500 },
    );
  }

  const { data: compilerRows, error: compilerError } = await supabase
    .from('feya_commerce_v_content_brief_compiler_v1')
    .select(
      'brief_queue_id,canonical_product_id,compiler_version,compiler_status,can_generate_shadow,can_produce_canonical_brief,plan_status,primary_keyword,compiled_brief_json',
    )
    .eq('can_generate_shadow', true)
    .order('brief_queue_id', { ascending: true })
    .limit(CANDIDATE_SCAN_LIMIT);

  if (compilerError) {
    return NextResponse.json({ ok: false, dryRun, runId, error: compilerError.message }, { status: 500 });
  }

  const candidates = (compilerRows || []) as UnknownRecord[];
  const productIds = candidates
    .map((row) => asString(row.canonical_product_id))
    .filter((value): value is string => Boolean(value));

  if (!productIds.length) {
    return NextResponse.json({
      ok: true,
      dryRun,
      runId,
      selectedCount: 0,
      processedCount: 0,
      recordedCount: 0,
      model,
      promptVersion: PROMPT_VERSION,
      results: [],
      warnings: ['No shadow-generation candidates are available.'],
    });
  }

  const [{ data: activeDrafts, error: activeError }, { data: truths, error: truthError }] =
    await Promise.all([
      supabase
        .from('feya_commerce_seo_pack_drafts_v1')
        .select('canonical_product_id')
        .in('canonical_product_id', productIds)
        .is('archived_at', null),
      supabase
        .from('feya_commerce_v_seo_product_truth_v4')
        .select('*')
        .in('canonical_product_id', productIds),
    ]);

  if (activeError) {
    return NextResponse.json({ ok: false, dryRun, runId, error: activeError.message }, { status: 500 });
  }
  if (truthError) {
    return NextResponse.json({ ok: false, dryRun, runId, error: truthError.message }, { status: 500 });
  }

  const activeProductIds = new Set(
    ((activeDrafts || []) as UnknownRecord[])
      .map((row) => asString(row.canonical_product_id))
      .filter((value): value is string => Boolean(value)),
  );
  const truthByProduct = new Map(
    ((truths || []) as UnknownRecord[])
      .map((row) => [asString(row.canonical_product_id), row] as const)
      .filter((entry): entry is [string, UnknownRecord] => Boolean(entry[0])),
  );

  const selected = candidates
    .map((row) => {
      const productId = asString(row.canonical_product_id);
      if (!productId || activeProductIds.has(productId)) return null;
      const truth = truthByProduct.get(productId);
      const compiledBrief = isRecord(row.compiled_brief_json) ? row.compiled_brief_json : null;
      if (!truth || !compiledBrief) return null;
      return { productId, brief: { ...row, compiled_brief_json: compiledBrief }, truth };
    })
    .filter(
      (
        row,
      ): row is { productId: string; brief: UnknownRecord; truth: UnknownRecord } => Boolean(row),
    )
    .slice(0, limit);

  if (!selected.length) {
    return NextResponse.json({
      ok: true,
      dryRun,
      runId,
      selectedCount: 0,
      processedCount: 0,
      recordedCount: 0,
      model,
      promptVersion: PROMPT_VERSION,
      results: [],
      warnings: ['Scanned shadow-ready compiler rows already have active drafts or lack Product Truth.'],
    });
  }

  try {
    const parsed = await runSco(selected, model);
    const rawResults = Array.isArray(parsed.results) ? parsed.results : [];
    const resultByProduct = new Map(
      rawResults
        .map((result) => {
          const record = isRecord(result) ? result : {};
          return [asString(record.canonical_product_id), result] as const;
        })
        .filter((entry): entry is [string, ScoProposal] => Boolean(entry[0])),
    );

    const results = selected.map(({ productId, brief, truth }) => {
      const proposal = normalizeProposal(resultByProduct.get(productId), productId);
      const compiledBrief = brief.compiled_brief_json as UnknownRecord;
      const validation = validateProposal(proposal, {
        ...compiledBrief,
        compiler_status: brief.compiler_status,
      });

      return {
        productId,
        briefQueueId: asString(brief.brief_queue_id),
        compilerVersion: asString(brief.compiler_version) || 'content_brief_compiler_v1',
        compilerStatus: asString(brief.compiler_status),
        truth,
        compiledBrief,
        proposal,
        validation,
        proposalHash: proposalHash(proposal),
      };
    });

    let recordedCount = 0;
    const writeWarnings: string[] = [];

    if (!dryRun) {
      for (const item of results) {
        if (!item.validation.ok || !item.briefQueueId) {
          writeWarnings.push(
            `${item.productId}: not recorded because deterministic shadow validation has blockers.`,
          );
          continue;
        }

        const strategyShadow = isRecord(item.compiledBrief.strategy_shadow)
          ? item.compiledBrief.strategy_shadow
          : {};
        const keywordRoles = buildKeywordRoles(item.compiledBrief);
        const metricsSnapshot = buildMetricsSnapshot(
          { compiler_status: item.compilerStatus },
          item.compiledBrief,
        );

        const { data: recorded, error: recordError } = await supabase.rpc(
          'feya_fn_create_sco_shadow_draft_v1',
          {
            p_canonical_product_id: item.productId,
            p_brief_queue_id: item.briefQueueId,
            p_generation_run_id: runId,
            p_proposal_hash: item.proposalHash,
            p_generation_model: model,
            p_compiler_version: item.compilerVersion,
            p_product_truth_snapshot: item.truth,
            p_manual_focus_snapshot: strategyShadow,
            p_keyword_roles_snapshot: keywordRoles,
            p_metrics_status_snapshot: metricsSnapshot,
            p_agent_input_snapshot: item.compiledBrief,
            p_agent_output_snapshot: item.proposal,
            p_validation_result_snapshot: item.validation,
          },
        );

        if (recordError) {
          writeWarnings.push(`${item.productId}: ${recordError.message}`);
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
      processedCount: results.length,
      recordedCount,
      model,
      promptVersion: PROMPT_VERSION,
      results: results.map((item) => ({
        canonical_product_id: item.productId,
        compiler_status: item.compilerStatus,
        proposal_hash: item.proposalHash,
        validation: item.validation,
        proposal: item.proposal,
      })),
      warnings: [...(parsed.warnings || []), ...writeWarnings],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        dryRun,
        runId,
        selectedCount: selected.length,
        processedCount: 0,
        recordedCount: 0,
        model,
        promptVersion: PROMPT_VERSION,
        results: [],
        error: error instanceof Error ? error.message : 'SCO shadow generation failed.',
      },
      { status: 500 },
    );
  }
}
