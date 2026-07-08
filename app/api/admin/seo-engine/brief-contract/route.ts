// @ts-nocheck
import { NextResponse } from 'next/server';
import { buildSeoBriefContractBundle, buildSeoBriefSourceSummary, readOnlyContractGuardrails } from '@/lib/seoBriefContractServer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = String(url.searchParams.get('product_id') || '').trim();
  const bundle = await buildSeoBriefContractBundle(productId);

  if (bundle.error) {
    return NextResponse.json({
      ok: false,
      status: 'blocked',
      error: bundle.error,
      guardrails: readOnlyContractGuardrails(),
    }, { status: 503 });
  }

  if (!bundle.product) {
    return NextResponse.json({
      ok: false,
      status: 'not_found',
      error: 'Product not found in Product Focus view.',
      product_id: productId || null,
      guardrails: readOnlyContractGuardrails(),
    }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    route: '/api/admin/seo-engine/brief-contract',
    mode: 'read_only_dry_run',
    guardrails: readOnlyContractGuardrails(),
    source: buildSeoBriefSourceSummary(bundle, productId),
    brief_status: bundle.brief.status,
    metrics_status: bundle.brief.metricsStatus,
    seo_pack_draft: bundle.seoPackDraft,
    ai_agent_input: bundle.aiAgentInput,
  });
}
