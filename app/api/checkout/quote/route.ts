import type {NextRequest} from 'next/server';
import {json, sameOrigin} from '@/lib/payments/access';
import {checkoutErrorMessage} from '@/lib/payments/checkoutRequest';
import {checkoutFailure, quoteCheckout} from '@/lib/payments/checkoutService';
import {BodyError, readLimitedJson} from '@/lib/payments/http';

/** Server-confirmed bag total (no personal data). */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ok: false, code: 'same_origin_required'}, 403);
  try {
    const body = await readLimitedJson(request, 32_000);
    return json({ok: true, ...(await quoteCheckout(body))});
  } catch (error) {
    if (error instanceof BodyError) return json({ok: false, code: 'checkout_request_invalid', message: checkoutErrorMessage('checkout_request_invalid')}, error.status);
    const failure = checkoutFailure(error);
    return json({ok: false, code: failure.code, field: failure.field ?? null, message: checkoutErrorMessage(failure.code)}, failure.status);
  }
}
