import type { SeoAgentOutputContract } from '@/lib/seoPackContract';
import type { SeoAgentPromptContract } from '@/lib/seoAgentDraftPrompt';

type OpenAiDraftResult = {
  ok: boolean;
  status: 'generated' | 'blocked' | 'openai_error' | 'parse_error';
  model: string;
  response_id?: string | null;
  output?: SeoAgentOutputContract | null;
  raw_text?: string | null;
  error?: string | null;
  vision_input?: {
    primary_image_sent: boolean;
    primary_image_url?: string | null;
  };
};

type GenerateSeoDraftOptions = {
  primaryImageUrl?: string | null;
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
  const model = process.env.FEYA_SEO_OPENAI_MODEL || 'gpt-5.4-mini';
  const primaryImageUrl = normalizeImageUrl(options.primaryImageUrl);
  const visionInput = {
    primary_image_sent: Boolean(primaryImageUrl),
    primary_image_url: primaryImageUrl,
  };

  if (!apiKey) {
    return {
      ok: false,
      status: 'blocked',
      model,
      output: null,
      error: 'OPENAI_API_KEY is missing on the server.',
      vision_input: visionInput,
    };
  }

  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'input_text',
      text: `${prompt.user_prompt}\n\nReturn exactly one JSON object that conforms to the seo_agent_output_v1 schema supplied in text.format. Do not omit required fields. Use null for unknown nullable text fields and empty arrays when a section has no safe content.`,
    },
  ];

  if (primaryImageUrl) {
    userContent.push({
      type: 'input_image',
      image_url: primaryImageUrl,
    });
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
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
      temperature: 0.2,
      store: false,
    }),
  });

  const payload = await response.json().catch(() => null);
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
  };
}

function seoAgentOutputSchema() {
  const qaStatus = { type: 'string', enum: ['pass', 'warning', 'blocker', 'not_checked'] };
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
      bullet_highlights: {
        type: 'array',
        items: { type: 'string' },
      },
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
          notes: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      generation_notes: {
        type: 'array',
        items: { type: 'string' },
      },
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
