import { NextResponse } from 'next/server';

export async function POST() {
  // Payment webhook processing is intentionally disabled until a provider is chosen
  // and server-side signature verification is implemented.
  // Do not create paid orders from frontend callbacks.
  return NextResponse.json({
    ok: false,
    error: 'Payment webhook processing is not active yet. Verified provider signature handling must be implemented before paid orders can be created.',
  }, { status: 501 });
}
