import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type OpenAiHealthStatus = 'ready' | 'missing_key' | 'blocked_client_leak_risk';

export async function GET() {
  const hasServerKey = Boolean(process.env.OPENAI_API_KEY);
  const hasClientExposedKey = Boolean(process.env.NEXT_PUBLIC_OPENAI_API_KEY);
  const configuredModel = process.env.FEYA_SEO_OPENAI_MODEL
    || process.env.OPENAI_SEO_MODEL
    || process.env.OPENAI_MODEL
    || 'gpt-5.4-mini';
  const generationEnabled = process.env.FEYA_SEO_AI_GENERATION_ENABLED === 'true';
  const draftStorageEnabled = process.env.FEYA_SEO_DRAFT_STORAGE_ENABLED === 'true';
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
      generation_feature_flag_enabled: generationEnabled,
      draft_storage_feature_flag_enabled: draftStorageEnabled,
    },
    guardrails: [
      'This route does not call OpenAI.',
      'This route never returns the API key.',
      'Generation runs server-side only.',
      'Browser code must never receive OPENAI_API_KEY.',
      'Generation consumes SeoAgentInputContract, not raw product data.',
      'Generation and draft storage use separate feature flags.',
    ],
    next_step: status === 'ready'
      ? generationEnabled
        ? 'OpenAI server environment and generation flag are present. Run the protected draft-generation preflight for one product.'
        : 'OpenAI server key is present. Enable FEYA_SEO_AI_GENERATION_ENABLED only for the intended environment before a controlled draft test.'
      : status === 'blocked_client_leak_risk'
        ? 'Remove NEXT_PUBLIC_OPENAI_API_KEY before generation work. API keys must not be exposed to browser bundles.'
        : 'Add OPENAI_API_KEY to the Vercel server environment before enabling generation.',
  });
}
