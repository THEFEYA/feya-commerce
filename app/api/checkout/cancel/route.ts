import type {NextRequest} from 'next/server';
import {json, sameOrigin} from '@/lib/payments/access';
import {cancelProviderOrder, checkoutFailure} from '@/lib/payments/checkoutService';
import {BodyError, readLimitedJson} from '@/lib/payments/http';

/** Buyer cancelled on PayPal. A paid order is never cancelled by this call. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ok: false, code: 'same_origin_required'}, 403);
  try {
    const body = await readLimitedJson(request, 2_000) as {provider_order_id?: unknown};
    const id = typeof body?.provider_order_id === 'string' ? body.provider_order_id : '';
    const result = await cancelProviderOrder(id);
    return json({ok: true, status: result.status});
  } catch (error) {
    if (error instanceof BodyError) return json({ok: false, code: 'checkout_request_invalid'}, error.status);
    const failure = checkoutFailure(error);
    return json({ok: false, code: failure.code}, failure.status);
  }
}
