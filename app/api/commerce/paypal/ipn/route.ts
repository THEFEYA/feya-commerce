import type {NextRequest} from 'next/server';
import {json} from '@/lib/payments/access';
import {BodyError, readLimitedText} from '@/lib/payments/http';
import {handlePayPalIpn} from '@/lib/payments/providerEvents';

/**
 * PayPal Payments Standard IPN (legacy fallback engine). Every message is echoed back
 * to PayPal (cmd=_notify-validate) and processed only when PayPal answers VERIFIED.
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/x-www-form-urlencoded'))
    return json({ok: false, code: 'unsupported_content_type'}, 415);
  try {
    const raw = await readLimitedText(request, 16_000);
    const result = await handlePayPalIpn(raw);
    return json(result.body, result.status);
  } catch (error) {
    if (error instanceof BodyError) return json({ok: false, code: error.message}, error.status);
    return json({ok: false, code: 'unavailable'}, 503);
  }
}
