import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiAuthStatus } from '@/lib/internalAuth';

export const dynamic = 'force-dynamic';

async function runTinyOpenAiCheck() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { attempted: false, ok: false, error: 'OPENAI_API_KEY is not configured.' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-nano',
        input: 'Return ok.',
        max_output_tokens: 8,
      }),
      cache: 'no-store',
    });

    return {
      attempted: true,
      ok: response.ok,
      status: response.status,
    };
  } catch {
    return { attempted: true, ok: false, error: 'OpenAI health request failed.' };
  }
}

export async function GET(request: NextRequest) {
  const auth = getInternalApiAuthStatus(request);
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY);

  return NextResponse.json({
    routeOk: true,
    openAiApiKeyConfigured: openAiConfigured,
    feyaInternalApiTokenConfigured: auth.configured,
    authorizedForTestCall: auth.authorized,
    openAiTest: auth.authorized
      ? await runTinyOpenAiCheck()
      : {
          attempted: false,
          ok: null,
          reason: auth.configured
            ? 'Provide a valid internal token to run the safe OpenAI test call.'
            : 'FEYA_INTERNAL_API_TOKEN is not configured, so no test call was attempted.',
        },
  });
}
