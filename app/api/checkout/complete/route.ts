import type {NextRequest} from 'next/server';
import {json, sameOrigin} from '@/lib/payments/access';
import {checkoutErrorMessage} from '@/lib/payments/checkoutRequest';
import {checkoutFailure, completeProviderOrder} from '@/lib/payments/checkoutService';
import {BodyError, readLimitedJson} from '@/lib/payments/http';

/** Buyer returned from PayPal: capture server-to-server and report the verified state. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ok: false, code: 'same_origin_required'}, 403);
  try {
    const body = await readLimitedJson(request, 2_000) as {provider_order_id?: unknown};
    const id = typeof body?.provider_order_id === 'string' ? body.provider_order_id : '';
    const result = await completeProviderOrder(id);
    if (result.kind === 'test') return json({ok: true, status: result.status, kind: 'test'});
    return json({ok: true, status: result.status, order_number: result.order_number,
      retry_url: 'retry_url' in result ? result.retry_url ?? null : null});
  } catch (error) {
    if (error instanceof BodyError) return json({ok: false, code: 'checkout_request_invalid'}, error.status);
    const failure = checkoutFailure(error);
    return json({ok: false, code: failure.code, message: checkoutErrorMessage(failure.code)}, failure.status);
  }
}
