import type {NextRequest} from 'next/server';
import {json, sameOrigin} from '@/lib/payments/access';
import {checkoutErrorMessage} from '@/lib/payments/checkoutRequest';
import {checkoutFailure, startCheckout} from '@/lib/payments/checkoutService';
import {BodyError, readLimitedJson} from '@/lib/payments/http';

/** Buyer places the order: server re-prices the bag, stores the order, opens PayPal. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ok: false, code: 'same_origin_required'}, 403);
  try {
    const body = await readLimitedJson(request, 64_000);
    const result = await startCheckout(body, {headers: request.headers, origin: request.nextUrl.origin});
    return json({ok: true, ...result}, result.replayed ? 200 : 201);
  } catch (error) {
    if (error instanceof BodyError) return json({ok: false, code: 'checkout_request_invalid', message: checkoutErrorMessage('checkout_request_invalid')}, error.status);
    const failure = checkoutFailure(error);
    return json({ok: false, code: failure.code, field: failure.field ?? null, message: checkoutErrorMessage(failure.code)}, failure.status);
  }
}
