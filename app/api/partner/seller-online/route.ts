import type {NextRequest} from 'next/server';
import {revalidateTag} from 'next/cache';
import {json, resolveInstaller, sameOrigin} from '@/lib/payments/access';
import {BodyError, readLimitedJson} from '@/lib/payments/http';
import {installErrorMessage, providerStatusForPanel, saveProviderSettings} from '@/lib/payments/installation';
import {PAYMENTS_STATE_TAG} from '@/lib/payments/publicState';
import {PaymentsStoreError} from '@/lib/payments/store';

/** Installation panel state (never contains secrets). */
export async function GET(request: NextRequest) {
  const actor = await resolveInstaller(request);
  if (!actor) return json({ok: false, code: 'invitation_required'}, 401);
  try {
    return json({ok: true, actor: {role: actor.role}, status: await providerStatusForPanel()});
  } catch {
    return json({ok: false, code: 'storage_unavailable'}, 503);
  }
}

/** Save PayPal account / Seller Online store settings. Secrets are write-only. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ok: false, code: 'same_origin_required'}, 403);
  const actor = await resolveInstaller(request);
  if (!actor) return json({ok: false, code: 'invitation_required'}, 401);
  try {
    const body = await readLimitedJson(request, 8_000);
    const saved = await saveProviderSettings(body, actor);
    // A configuration change pauses live payments: refresh public pages at once.
    if (saved.changed) revalidateTag(PAYMENTS_STATE_TAG, 'max');
    return json({ok: true, status: await providerStatusForPanel()});
  } catch (error) {
    if (error instanceof BodyError) return json({ok: false, code: 'invalid_request', message: installErrorMessage('feya_pay_payload_invalid')}, error.status);
    if (error instanceof PaymentsStoreError && error.message.startsWith('feya_pay_'))
      return json({ok: false, code: error.message, message: installErrorMessage(error.message)}, 422);
    return json({ok: false, code: 'storage_unavailable', message: 'Хранилище недоступно. Повторите через минуту.'}, 503);
  }
}
