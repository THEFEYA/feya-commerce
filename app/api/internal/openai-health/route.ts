import { NextResponse } from 'next/server';
import { withInternalApi } from '@/lib/internalAuth';

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

async function handleGet() {
  return NextResponse.json({
    routeOk: true,
    openAiApiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
    feyaInternalApiTokenConfigured: true,
    authorizedForTestCall: true,
    openAiTest: await runTinyOpenAiCheck(),
  });
}

export const GET = withInternalApi(handleGet);
