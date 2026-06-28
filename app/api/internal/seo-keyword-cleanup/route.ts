import { NextRequest, NextResponse } from 'next/server';
import { getInternalApiAuthStatus } from '@/lib/internalAuth';

export const dynamic = 'force-dynamic';

const ROUTE_STATUS = 'disabled_pending_metric_validation_workflow';
const NEXT_SAFE_STEP = 'Define the SEO metric-validation and human-review workflow before enabling AI cleanup writes.';

function disabledResponse() {
  return NextResponse.json(
    {
      ok: false,
      routeStatus: ROUTE_STATUS,
      error: 'Legacy SEO keyword cleanup route is intentionally disabled.',
      reason:
        'The confirmed Supabase queue is needs_human_review + validation_status=queued. The previous cleanup route targeted needs_ai_cleanup and must not be used as a production SEO process.',
      safeRules: [
        'No OpenAI keyword cleanup call is executed from this route.',
        'No Supabase insert is executed from this route.',
        'OpenAI must not invent search volume, competition, CTR, bids, trend, or seasonality metrics.',
        'Metric validation must use a real source or an explicitly marked manual/import source.',
      ],
      nextSafeStep: NEXT_SAFE_STEP,
    },
    { status: 409 },
  );
}

export async function GET() {
  return disabledResponse();
}

export async function POST(request: NextRequest) {
  const auth = getInternalApiAuthStatus(request);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  return disabledResponse();
}
