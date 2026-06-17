import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getInternalApiAuthStatus } from '@/lib/internalAuth';
import { getMissingSupabaseServiceRoleEnvMessage, getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';
import type { SeoKeywordCleanupReportRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

type CleanupResult = {
  keyword_id: string | null;
  keyword_norm: string | null;
  original_keyword: string | null;
  cleaned_keyword: string | null;
  suggested_keyword: string | null;
  keyword_axis: string | null;
  keyword_pattern: string | null;
  suggested_page_level: string | null;
  ai_intent: string | null;
  ai_rewrite_status: string | null;
  should_validate_api: boolean;
  should_use_for_product: boolean;
  should_use_for_collection: boolean;
  should_use_for_image_alt: boolean;
  should_hold: boolean;
  warning_flags: string[];
  ai_reason: string | null;
};

type OpenAiCleanupResponse = {
  results?: CleanupResult[];
  warnings?: string[];
};

const PROMPT_VERSION = 'seo_keyword_cleanup_v1';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;
const DEFAULT_MODEL = 'gpt-4.1-nano';

function clampLimit(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(value)));
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : false;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim());
}

function normalizeResult(value: Partial<CleanupResult>, fallback: SeoKeywordCleanupReportRow): CleanupResult {
  return {
    keyword_id: asString(value.keyword_id) || asString(fallback.keyword_id) || asString(fallback.id),
    keyword_norm: asString(value.keyword_norm) || asString(fallback.keyword_norm),
    original_keyword: asString(value.original_keyword) || asString(fallback.keyword),
    cleaned_keyword: asString(value.cleaned_keyword),
    suggested_keyword: asString(value.suggested_keyword),
    keyword_axis: asString(value.keyword_axis) || asString(fallback.queue_keyword_axis),
    keyword_pattern: asString(value.keyword_pattern) || asString(fallback.queue_keyword_pattern),
    suggested_page_level: asString(value.suggested_page_level) || asString(fallback.queue_suggested_page_level),
    ai_intent: asString(value.ai_intent),
    ai_rewrite_status: asString(value.ai_rewrite_status),
    should_validate_api: asBoolean(value.should_validate_api),
    should_use_for_product: asBoolean(value.should_use_for_product),
    should_use_for_collection: asBoolean(value.should_use_for_collection),
    should_use_for_image_alt: asBoolean(value.should_use_for_image_alt),
    should_hold: asBoolean(value.should_hold),
    warning_flags: asStringArray(value.warning_flags),
    ai_reason: asString(value.ai_reason),
  };
}

function extractJsonPayload(text: string): OpenAiCleanupResponse {
  try {
    return JSON.parse(text) as OpenAiCleanupResponse;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('OpenAI response did not contain JSON.');
    return JSON.parse(match[0]) as OpenAiCleanupResponse;
  }
}

function getResponseText(payload: { output_text?: unknown; output?: unknown }) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  if (!Array.isArray(payload.output)) return '';

  return payload.output
    .flatMap((item) => (typeof item === 'object' && item && 'content' in item && Array.isArray(item.content) ? item.content : []))
    .map((content) => (typeof content === 'object' && content && 'text' in content && typeof content.text === 'string' ? content.text : ''))
    .join('\n');
}

async function runOpenAiCleanup(rows: SeoKeywordCleanupReportRow[], model: string) {
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
            'You clean FEYA ecommerce SEO keyword candidates. Return only valid JSON. Do not invent or estimate search volume, competition, CTR, bids, trends, seasonality, ranking positions, or any metrics. Do not score keywords. Do not generate product descriptions or landing pages.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt_version: PROMPT_VERSION,
            required_shape: {
              results: [
                {
                  keyword_id: 'string|null',
                  keyword_norm: 'string|null',
                  original_keyword: 'string|null',
                  cleaned_keyword: 'string|null',
                  suggested_keyword: 'string|null',
                  keyword_axis: 'string|null',
                  keyword_pattern: 'string|null',
                  suggested_page_level: 'product|collection|image_alt|hold|null',
                  ai_intent: 'transactional|commercial|informational|navigational|image_alt|unclear|null',
                  ai_rewrite_status: 'cleaned|unchanged|hold|needs_human_review',
                  should_validate_api: 'boolean',
                  should_use_for_product: 'boolean',
                  should_use_for_collection: 'boolean',
                  should_use_for_image_alt: 'boolean',
                  should_hold: 'boolean',
                  warning_flags: ['string'],
                  ai_reason: 'brief string|null',
                },
              ],
              warnings: ['string'],
            },
            rules: [
              'Festival outfit, rave outfit, and Burning Man outfit are collection-level, not product primary.',
              'Metallic Shoulders should become metallic shoulder armor or metallic shoulder pieces.',
              'gold Skirt should become gold festival skirt or gold performance skirt only if supported by source context.',
              'vegan leather Skirt should become vegan leather skirt.',
              'Awkward or risky terms like metallic panties should usually be hold/review/image_alt/experimental, not primary SEO.',
              'Image alt terms must describe visible product facts and must not be spam.',
            ],
            rows,
          }),
        },
      ],
      text: { format: { type: 'json_object' } },
      max_output_tokens: 6000,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`OpenAI cleanup request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { output_text?: unknown; output?: unknown };
  const responseText = getResponseText(payload);
  const parsed = extractJsonPayload(responseText);
  return { parsed, raw: parsed };
}

function getStatusCounts(results: CleanupResult[]) {
  return results.reduce<Record<string, number>>((counts, result) => {
    const status = result.ai_rewrite_status || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

export async function POST(request: NextRequest) {
  const auth = getInternalApiAuthStatus(request);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { limit?: unknown; dryRun?: unknown };
  const limit = clampLimit(body.limit);
  const dryRun = body.dryRun !== false;
  const model = process.env.OPENAI_SEO_CLEANUP_MODEL || DEFAULT_MODEL;
  const runId = randomUUID();
  const warnings: string[] = [];

  const supabase = getSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, dryRun, runId, error: getMissingSupabaseServiceRoleEnvMessage() }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_seo_keyword_ai_cleanup_report_v1')
    .select('*')
    .eq('cleanup_pipeline_status', 'needs_ai_cleanup')
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, dryRun, runId, error: error.message }, { status: 500 });
  }

  const rows = (data || []) as SeoKeywordCleanupReportRow[];
  if (!rows.length) {
    return NextResponse.json({ ok: true, dryRun, runId, selectedCount: 0, processedCount: 0, insertedCount: 0, model, promptVersion: PROMPT_VERSION, statusCounts: {}, sampleResults: [], warnings });
  }

  try {
    const { parsed, raw } = await runOpenAiCleanup(rows, model);
    const results = (parsed.results || []).map((result, index) => normalizeResult(result, rows[index] || {}));

    let insertedCount = 0;
    if (!dryRun && results.length) {
      const insertRows = results.map((result, index) => ({
        ...result,
        run_id: runId,
        model_name: model,
        prompt_version: PROMPT_VERSION,
        source_queue_snapshot: rows[index] || null,
        raw_ai_response_json: raw,
        review_status: 'pending',
      }));
      const { error: insertError, count } = await supabase
        .from('feya_commerce_seo_keyword_ai_cleanup_v1')
        .insert(insertRows, { count: 'exact' });

      if (insertError) {
        return NextResponse.json({ ok: false, dryRun, runId, selectedCount: rows.length, processedCount: results.length, insertedCount: 0, model, promptVersion: PROMPT_VERSION, statusCounts: getStatusCounts(results), sampleResults: results.slice(0, 10), warnings, error: insertError.message }, { status: 500 });
      }
      insertedCount = count || results.length;
    }

    return NextResponse.json({ ok: true, dryRun, runId, selectedCount: rows.length, processedCount: results.length, insertedCount, model, promptVersion: PROMPT_VERSION, statusCounts: getStatusCounts(results), sampleResults: results.slice(0, 10), warnings: [...warnings, ...(parsed.warnings || [])] });
  } catch (error) {
    return NextResponse.json({ ok: false, dryRun, runId, selectedCount: rows.length, processedCount: 0, insertedCount: 0, model, promptVersion: PROMPT_VERSION, statusCounts: {}, sampleResults: [], warnings, error: error instanceof Error ? error.message : 'Keyword cleanup failed.' }, { status: 500 });
  }
}
