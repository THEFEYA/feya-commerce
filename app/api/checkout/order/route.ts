import type {NextRequest} from 'next/server';
import {json, sameOrigin} from '@/lib/payments/access';
import {buyerReceipt} from '@/lib/payments/checkoutService';
import {BodyError, readLimitedJson} from '@/lib/payments/http';

/** Buyer receipt by the opaque token issued at checkout. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ok: false, code: 'same_origin_required'}, 403);
  try {
    const body = await readLimitedJson(request, 1_000) as {access_token?: unknown};
    const token = typeof body?.access_token === 'string' ? body.access_token : '';
    const receipt = await buyerReceipt(token);
    return receipt ? json({ok: true, order: receipt}) : json({ok: false, code: 'not_found'}, 404);
  } catch (error) {
    if (error instanceof BodyError) return json({ok: false, code: 'invalid_request'}, error.status);
    return json({ok: false, code: 'unavailable'}, 503);
  }
}
