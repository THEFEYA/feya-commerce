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
  writer_output_block_keys: string[] | null;
  writer_output_block_count: number | null;
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

const WRITER_PDP_BLOCK_SLOTS = [
  'about_this_piece',
  'why_youll_love_it',
  'ideal_for',
  'main_description',
] as const;

const CODE_OWNED_PDP_BLOCKS = [
  {
    block_key: 'about_this_piece',
    placement: 'left_description',
    heading: 'About this piece',
    source_basis: 'product_fact',
  },
  {
    block_key: 'why_youll_love_it',
    placement: 'left_description',
    heading: 'Why you’ll love it',
    source_basis: 'product_fact',
  },
  {
    block_key: 'ideal_for',
    placement: 'left_description',
    heading: 'Ideal for',
    source_basis: 'product_fact',
  },
  {
    block_key: 'main_description',
    placement: 'left_description',
    heading: 'Designed for self-expression',
    source_basis: 'brand_policy',
  },
] as const;

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
  const userInstruction = `${prompt.user_prompt}\n\nReturn exactly one JSON object that conforms to the seo_agent_writer_output_v3 wire schema supplied in text.format. Fill all four required named pdp_blocks text slots. Do not omit required fields. Use null for unknown nullable text fields and empty arrays when a section has no safe content. visual_truth.open_style_suggestions must be [].`;
  const promptHash = createHash('sha256')
    .update(prompt.contract_version)
    .update('\0')
    .update(prompt.system_prompt)
    .update('\0')
    .update(userInstruction)
    .digest('hex');
  const startedAt = Date.now();
  const telemetry = (
    httpStatus: number | null,
    usage: unknown = null,
    writerOutput: unknown = undefined,
  ): OpenAiDraftTelemetry => {
    const blockKeys = inspectWriterPdpBlockKeys(writerOutput);
    return {
      contract_version: prompt.contract_version,
      prompt_hash: promptHash,
      system_prompt_chars: prompt.system_prompt.length,
      user_prompt_chars: userInstruction.length,
      timeout_ms: timeoutMs,
      max_output_tokens: maxOutputTokens,
      duration_ms: Date.now() - startedAt,
      http_status: httpStatus,
      usage: normalizeUsage(usage),
      writer_output_block_keys: blockKeys,
      writer_output_block_count: blockKeys?.length ?? null,
    };
  };

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
            name: 'seo_agent_writer_output_v3',
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

  const normalized = normalizeWriterOutput(parsed.value);
  if (!normalized.ok) {
    return {
      ok: false,
      status: 'parse_error',
      model,
      response_id: payload?.id || null,
      output: null,
      raw_text: rawText,
      error: normalized.error,
      vision_input: visionInput,
      telemetry: telemetry(response.status, payload?.usage, parsed.value),
    };
  }

  return {
    ok: true,
    status: 'generated',
    model,
    response_id: payload?.id || null,
    output: normalized.value,
    raw_text: rawText,
    error: null,
    vision_input: visionInput,
    telemetry: telemetry(response.status, payload?.usage, parsed.value),
  };
}

function seoAgentOutputSchema() {
  const qaStatus = { type: 'string', enum: ['pass', 'warning', 'blocker', 'not_checked'] };
  const stringArray = { type: 'array', items: { type: 'string' } };
  const emptyStringArray = { type: 'array', items: { type: 'string' }, maxItems: 0 };
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
          open_style_suggestions: emptyStringArray,
          uncertain_or_missing_facts: stringArray,
          forbidden_visual_claims: stringArray,
        },
      },
      pdp_blocks: {
        type: 'object',
        additionalProperties: false,
        required: [...WRITER_PDP_BLOCK_SLOTS],
        properties: {
          about_this_piece: { type: 'string' },
          why_youll_love_it: { type: 'string' },
          ideal_for: { type: 'string' },
          main_description: { type: 'string' },
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

function normalizeWriterOutput(value: unknown): {
  ok: true;
  value: SeoAgentOutputContract;
} | {
  ok: false;
  error: string;
} {
  if (!isRecord(value)) {
    return { ok: false, error: 'Writer output is not a JSON object.' };
  }

  const slots = value.pdp_blocks;
  if (!isRecord(slots)) {
    return {
      ok: false,
      error: 'Writer pdp_blocks must use the required named-slot object contract.',
    };
  }

  const suppliedKeys = Object.keys(slots);
  const missingKeys = WRITER_PDP_BLOCK_SLOTS.filter((key) => !suppliedKeys.includes(key));
  const unexpectedKeys = suppliedKeys.filter((key) => !WRITER_PDP_BLOCK_SLOTS.includes(
    key as typeof WRITER_PDP_BLOCK_SLOTS[number],
  ));
  if (missingKeys.length || unexpectedKeys.length) {
    return {
      ok: false,
      error: [
        missingKeys.length ? `missing PDP slots: ${missingKeys.join(', ')}` : '',
        unexpectedKeys.length ? `unexpected PDP slots: ${unexpectedKeys.join(', ')}` : '',
      ].filter(Boolean).join('; '),
    };
  }

  const nonTextKeys = WRITER_PDP_BLOCK_SLOTS.filter((key) => typeof slots[key] !== 'string');
  if (nonTextKeys.length) {
    return {
      ok: false,
      error: `Writer PDP slots must be strings: ${nonTextKeys.join(', ')}.`,
    };
  }

  return {
    ok: true,
    value: {
      ...value,
      pdp_blocks: CODE_OWNED_PDP_BLOCKS.map((block) => ({
        ...block,
        body: slots[block.block_key] as string,
        // Every generated pack remains a review draft at the workflow level;
        // this flag is reserved for a fact-specific uncertainty in one block.
        needs_human_review: false,
      })),
    } as SeoAgentOutputContract,
  };
}

function inspectWriterPdpBlockKeys(value: unknown): string[] | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.pdp_blocks)) return Object.keys(value.pdp_blocks);
  if (Array.isArray(value.pdp_blocks)) {
    return value.pdp_blocks
      .filter(isRecord)
      .map((block) => String(block.block_key || '').trim())
      .filter(Boolean);
  }
  return null;
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
