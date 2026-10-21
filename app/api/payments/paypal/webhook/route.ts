import type {NextRequest} from 'next/server';
import {json} from '@/lib/payments/access';
import {BodyError, readLimitedText} from '@/lib/payments/http';
import {handlePayPalWebhook} from '@/lib/payments/providerEvents';

/** PayPal REST webhook. Signature is verified with PayPal before anything happens. */
export async function POST(request: NextRequest) {
  try {
    const raw = await readLimitedText(request, 200_000);
    const result = await handlePayPalWebhook(raw, request.headers);
    return json(result.body, result.status);
  } catch (error) {
    if (error instanceof BodyError) return json({ok: false, code: error.message}, error.status);
    return json({ok: false, code: 'unavailable'}, 503);
  }
}
