import { createHash } from 'node:crypto';
import type { SeoAgentOutputContract } from './seoPackContract.ts';
import type { SeoAgentPromptContract } from './seoAgentDraftPrompt.ts';

export type OpenAiTokenUsage = {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  cached_input_tokens: number | null;
  reasoning_tokens: number | null;
};

export type OpenAiDraftTelemetry = {
  contract_version: string;
  prompt_hash: string;
  system_prompt_chars: number;
  user_prompt_chars: number;
  timeout_ms: number;
  max_output_tokens: number;
  duration_ms: number;
  http_status: number | null;
  usage: OpenAiTokenUsage | null;
};

export type OpenAiDraftResult = {
  ok: boolean;
  status: 'generated' | 'blocked' | 'openai_error' | 'parse_error' | 'upstream_timeout';
  model: string;
  response_id?: string | null;
  output?: SeoAgentOutputContract | null;
  raw_text?: string | null;
  error?: string | null;
  vision_input?: {
    primary_image_sent: boolean;
    primary_image_url?: string | null;
  };
  telemetry: OpenAiDraftTelemetry;
};

export type GenerateSeoDraftOptions = {
  primaryImageUrl?: string | null;
  model?: string | null;
  reasoningEffort?: 'low' | 'medium' | 'high' | null;
  timeoutMs?: number | null;
  maxOutputTokens?: number | null;
  fetchImpl?: typeof fetch;
};

type ResponseContentPart = {
  text?: unknown;
  content?: unknown;
};

type ResponseOutputItem = {
  content?: unknown;
};

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

export async function generateSeoDraftWithOpenAi(prompt: SeoAgentPromptContract, options: GenerateSeoDraftOptions = {}): Promise<OpenAiDraftResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = String(options.model || '').trim()
    || process.env.FEYA_SEO_OPENAI_MODEL
    || 'gpt-5.4-mini';
  const primaryImageUrl = normalizeImageUrl(options.primaryImageUrl);
  const visionInput = {
    primary_image_sent: Boolean(primaryImageUrl),
    primary_image_url: primaryImageUrl,
  };
  const timeoutMs = positiveInteger(
    options.timeoutMs,
    positiveInteger(process.env.FEYA_SEO_OPENAI_TIMEOUT_MS, 120_000),
  );
  const maxOutputTokens = positiveInteger(
    options.maxOutputTokens,
    positiveInteger(process.env.FEYA_SEO_OPENAI_MAX_OUTPUT_TOKENS, 2_500),
  );
  const userInstruction = `${prompt.user_prompt}\n\nReturn exactly one JSON object that conforms to the seo_agent_output_v1 schema supplied in text.format. Do not omit required fields. Use null for unknown nullable text fields and empty arrays when a section has no safe content.`;
  const promptHash = createHash('sha256')
    .update(prompt.contract_version)
    .update('\0')
    .update(prompt.system_prompt)
    .update('\0')
    .update(userInstruction)
    .digest('hex');
  const startedAt = Date.now();
  const telemetry = (httpStatus: number | null, usage: unknown = null): OpenAiDraftTelemetry => ({
    contract_version: prompt.contract_version,
    prompt_hash: promptHash,
    system_prompt_chars: prompt.system_prompt.length,
    user_prompt_chars: userInstruction.length,
    timeout_ms: timeoutMs,
    max_output_tokens: maxOutputTokens,
    duration_ms: Date.now() - startedAt,
    http_status: httpStatus,
    usage: normalizeUsage(usage),
  });

  if (!apiKey) {
    return {
      ok: false,
      status: 'blocked',
      model,
      output: null,
      error: 'OPENAI_API_KEY is missing on the server.',
      vision_input: visionInput,
      telemetry: telemetry(null),
    };
  }

  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'input_text',
      text: userInstruction,
    },
  ];

  if (primaryImageUrl) {
    userContent.push({
      type: 'input_image',
      image_url: primaryImageUrl,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response | null = null;
  let payload: any = null;
  try {
    response = await (options.fetchImpl || fetch)(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        ...(options.reasoningEffort
          ? { reasoning: { effort: options.reasoningEffort } }
          : {}),
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: prompt.system_prompt,
              },
            ],
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'seo_agent_output_v1',
            strict: true,
            schema: seoAgentOutputSchema(),
          },
        },
        max_output_tokens: maxOutputTokens,
        ...(options.reasoningEffort ? {} : { temperature: 0.2 }),
        store: false,
      }),
    });
    try {
      payload = await response.json();
    } catch (err) {
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) throw err;
      payload = null;
    }
  } catch (err) {
    const timedOut = controller.signal.aborted || (err instanceof Error && err.name === 'AbortError');
    return {
      ok: false,
      status: timedOut ? 'upstream_timeout' : 'openai_error',
      model,
      response_id: null,
      output: null,
      raw_text: null,
      error: timedOut
        ? `OpenAI writer exceeded the ${timeoutMs}ms upstream timeout. No automatic retry was attempted.`
        : err instanceof Error ? err.message : String(err),
      vision_input: visionInput,
      telemetry: telemetry(response?.status || null),
    };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    return {
      ok: false,
      status: 'openai_error',
      model,
      response_id: payload?.id || null,
      output: null,
      raw_text: null,
      error: payload?.error?.message || `OpenAI request failed with HTTP ${response.status}.`,
      vision_input: visionInput,
      telemetry: telemetry(response.status, payload?.usage),
    };
  }

  const rawText = extractOutputText(payload);
  if (!rawText) {
    return {
      ok: false,
      status: 'parse_error',
      model,
      response_id: payload?.id || null,
      output: null,
      raw_text: null,
      error: 'OpenAI response did not contain output text.',
      vision_input: visionInput,
      telemetry: telemetry(response.status, payload?.usage),
    };
  }

  const parsed = parseJsonObject(rawText);
  if (!parsed.ok) {
    return {
      ok: false,
      status: 'parse_error',
      model,
      response_id: payload?.id || null,
      output: null,
      raw_text: rawText,
      error: parsed.error,
      vision_input: visionInput,
      telemetry: telemetry(response.status, payload?.usage),
    };
  }

  return {
    ok: true,
    status: 'generated',
    model,
    response_id: payload?.id || null,
    output: parsed.value as SeoAgentOutputContract,
    raw_text: rawText,
    error: null,
    vision_input: visionInput,
    telemetry: telemetry(response.status, payload?.usage),
  };
}

function seoAgentOutputSchema() {
  const qaStatus = { type: 'string', enum: ['pass', 'warning', 'blocker', 'not_checked'] };
  const stringArray = { type: 'array', items: { type: 'string' } };
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'contract_version',
      'status',
      'seo_title',
      'h1',
      'meta_description',
      'intro',
      'bullet_highlights',
      'faq',
      'image_alt_candidates',
      'internal_linking_hints',
      'visual_truth',
      'pdp_blocks',
      'qa_self_report',
      'generation_notes',
    ],
    properties: {
      contract_version: { type: 'string', enum: ['seo_agent_output_v1'] },
      status: { type: 'string', enum: ['draft', 'needs_review', 'blocked'] },
      seo_title: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      h1: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      meta_description: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      intro: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      bullet_highlights: stringArray,
      faq: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'answer', 'intent'],
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
            intent: { type: 'string', enum: ['commercial', 'fit', 'shipping', 'materials', 'styling', 'care', 'other'] },
          },
        },
      },
      image_alt_candidates: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['image_role', 'alt_text', 'truth_basis'],
          properties: {
            image_role: { type: 'string', enum: ['primary', 'detail', 'lifestyle', 'unknown'] },
            alt_text: { type: 'string' },
            truth_basis: { type: 'string', enum: ['visible_product_fact', 'needs_image_review'] },
          },
        },
      },
      internal_linking_hints: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['anchor', 'target_type', 'reason'],
          properties: {
            anchor: { type: 'string' },
            target_type: { type: 'string', enum: ['collection', 'related_product', 'guide'] },
            reason: { type: 'string' },
          },
        },
      },
      visual_truth: {
        type: 'object',
        additionalProperties: false,
        required: ['observed_product_facts', 'dna_matches', 'open_style_suggestions', 'uncertain_or_missing_facts', 'forbidden_visual_claims'],
        properties: {
          observed_product_facts: stringArray,
          dna_matches: stringArray,
          open_style_suggestions: stringArray,
          uncertain_or_missing_facts: stringArray,
          forbidden_visual_claims: stringArray,
        },
      },
      pdp_blocks: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['block_key', 'placement', 'heading', 'body', 'source_basis', 'needs_human_review'],
          properties: {
            block_key: {
              type: 'string',
              enum: [
                'about_this_piece',
                'main_description',
                'why_youll_love_it',
                'ideal_for',
                'whats_included',
                'material',
                'image_truth_note',
                'related_collections',
              ],
            },
            placement: { type: 'string', enum: ['left_description', 'review_only'] },
            heading: { type: 'string' },
            body: { type: 'string' },
            source_basis: { type: 'string', enum: ['product_fact', 'brand_policy', 'visual_truth', 'needs_human_review'] },
            needs_human_review: { type: 'boolean' },
          },
        },
      },
      qa_self_report: {
        type: 'object',
        additionalProperties: false,
        required: [
          'cliche_phrase',
          'long_dash',
          'keyword_stuffing',
          'product_specificity',
          'forbidden_mismatch',
          'similarity_cannibalization',
          'image_alt_truth',
          'commercial_placement',
          'validated_metrics',
          'notes',
        ],
        properties: {
          cliche_phrase: qaStatus,
          long_dash: qaStatus,
          keyword_stuffing: qaStatus,
          product_specificity: qaStatus,
          forbidden_mismatch: qaStatus,
          similarity_cannibalization: qaStatus,
          image_alt_truth: qaStatus,
          commercial_placement: qaStatus,
          validated_metrics: qaStatus,
          notes: stringArray,
        },
      },
      generation_notes: stringArray,
    },
  };
}

function extractOutputText(payload: unknown): string | null {
  if (isRecord(payload) && typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = isRecord(payload) && Array.isArray(payload.output) ? payload.output as ResponseOutputItem[] : [];
  const chunks: string[] = [];
  output.forEach((item: ResponseOutputItem) => {
    const content = Array.isArray(item?.content) ? item.content as ResponseContentPart[] : [];
    content.forEach((part: ResponseContentPart) => {
      if (typeof part?.text === 'string') chunks.push(part.text);
      if (typeof part?.content === 'string') chunks.push(part.content);
    });
  });

  const joined = chunks.join('\n').trim();
  return joined || null;
}

function parseJsonObject(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Parsed output is not a JSON object.' };
    }
    return { ok: true, value: parsed };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function normalizeImageUrl(value?: string | null) {
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalizeUsage(value: unknown): OpenAiTokenUsage | null {
  if (!isRecord(value)) return null;
  const inputDetails = isRecord(value.input_tokens_details) ? value.input_tokens_details : {};
  const outputDetails = isRecord(value.output_tokens_details) ? value.output_tokens_details : {};
  return {
    input_tokens: nullableNumber(value.input_tokens),
    output_tokens: nullableNumber(value.output_tokens),
    total_tokens: nullableNumber(value.total_tokens),
    cached_input_tokens: nullableNumber(inputDetails.cached_tokens),
    reasoning_tokens: nullableNumber(outputDetails.reasoning_tokens),
  };
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
