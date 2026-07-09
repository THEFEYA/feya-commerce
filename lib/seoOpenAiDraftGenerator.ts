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
};

type ResponseContentPart = {
  text?: unknown;
  content?: unknown;
};

type ResponseOutputItem = {
  content?: unknown;
};

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

export async function generateSeoDraftWithOpenAi(prompt: SeoAgentPromptContract): Promise<OpenAiDraftResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.FEYA_SEO_OPENAI_MODEL || 'gpt-5.4-mini';

  if (!apiKey) {
    return {
      ok: false,
      status: 'blocked',
      model,
      output: null,
      error: 'OPENAI_API_KEY is missing on the server.',
    };
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
          content: [
            {
              type: 'input_text',
              text: prompt.user_prompt,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_object',
        },
      },
      temperature: 0.4,
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
      return { ok: false, error: 'OpenAI output JSON is not an object.' };
    }
    return { ok: true, value: parsed };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to parse OpenAI JSON output.',
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
