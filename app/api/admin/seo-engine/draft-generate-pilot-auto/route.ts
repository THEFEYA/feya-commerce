import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REPLACEMENT_ROUTE = '/api/admin/seo-engine/catalog-draft-generate';

export async function GET() {
  return NextResponse.json({
    ok: false,
    status: 'deprecated_multi_pass_route_disabled',
    blocked: true,
    generation_passes: 0,
    automatic_editorial_rewrite_passes: 0,
    replacement_route: REPLACEMENT_ROUTE,
    message: 'This legacy two-pass pilot route is disabled. Use the one-call catalog draft route.',
  }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({
    ok: false,
    status: 'deprecated_multi_pass_route_disabled',
    blocked: true,
    openai_calls: 0,
    replacement_route: REPLACEMENT_ROUTE,
    message: 'No OpenAI request was made. Use the one-call catalog draft route.',
  }, { status: 410 });
}
