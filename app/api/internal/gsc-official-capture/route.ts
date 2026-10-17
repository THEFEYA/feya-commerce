import { type NextRequest, NextResponse } from 'next/server';
import { withInternalApi } from '@/lib/internalAuth';
import { captureOfficialGscOnce } from '@/lib/gscOfficialCaptureServer';

/** Internal-token-only one-shot capture, disabled by default, no schedules or paid AI. */
async function handlePost(_request: NextRequest) {
  const result = await captureOfficialGscOnce();
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
export const POST = withInternalApi(handlePost);
