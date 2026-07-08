import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type OpenAiHealthStatus = 'ready' | 'missing_key' | 'blocked_client_leak_risk';

export async function GET() {
  const hasServerKey = Boolean(process.env.OPENAI_API_KEY);
  const hasClientExposedKey = Boolean(process.env.NEXT_PUBLIC_OPENAI_API_KEY);
  const configuredModel = process.env.OPENAI_SEO_MODEL || process.env.OPENAI_MODEL || null;
  const status: OpenAiHealthStatus = hasClientExposedKey
    ? 'blocked_client_leak_risk'
    : hasServerKey
      ? 'ready'
      : 'missing_key';

  return NextResponse.json({
    ok: status === 'ready',
    status,
    route: '/api/admin/seo-engine/openai-health',
    mode: 'readiness_check_only',
    checks: {
      has_server_openai_key: hasServerKey,
      has_client_exposed_openai_key: hasClientExposedKey,
      configured_model: configuredModel,
    },
    guardrails: [
      'This route does not call OpenAI.',
      'This route never returns the API key.',
      'Future generation must run server-side only.',
      'Browser code must never receive OPENAI_API_KEY.',
      'Generation must consume SeoAgentInputContract, not raw product data.',
    ],
    next_step: status === 'ready'
      ? 'OpenAI server env is present. Next safe step is a protected draft-generation route with dry-run/QA gates.'
      : status === 'blocked_client_leak_risk'
        ? 'Remove NEXT_PUBLIC_OPENAI_API_KEY before generation work. API keys must not be exposed to browser bundles.'
        : 'Add OPENAI_API_KEY to Vercel server environment before enabling generation.',
  });
}
