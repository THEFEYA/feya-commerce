import type {NextRequest} from 'next/server';
import {revalidateTag} from 'next/cache';
import {json, resolveInstaller, sameOrigin} from '@/lib/payments/access';
import {BodyError, readLimitedJson} from '@/lib/payments/http';
import {providerStatusForPanel} from '@/lib/payments/installation';
import {PAYMENTS_STATE_TAG} from '@/lib/payments/publicState';
import {paymentsStore} from '@/lib/payments/store';

const MESSAGES: Record<string, string> = {
  live_environment_required: 'Для покупателей можно включить только среду Live (рабочий PayPal).',
  live_test_payment_required: 'Сначала проведите успешный тестовый платёж в Live для текущих настроек.',
  verification_incomplete: 'Не все проверки пройдены для текущих настроек. Запустите проверку подключения.',
};

/** Switch buyer payments on/off. The database refuses activation without a verified live test. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ok: false, code: 'same_origin_required'}, 403);
  const actor = await resolveInstaller(request);
  if (!actor) return json({ok: false, code: 'invitation_required'}, 401);
  try {
    const body = await readLimitedJson(request, 200) as {active?: unknown};
    if (typeof body?.active !== 'boolean') return json({ok: false, code: 'invalid_request'}, 400);
    const result = await paymentsStore.setActive(body.active, actor.name, actor.role);
    revalidateTag(PAYMENTS_STATE_TAG, 'max');
    if (result.code) return json({ok: false, code: result.code, message: MESSAGES[result.code] || 'Не удалось изменить статус.', status: await providerStatusForPanel()}, 409);
    return json({ok: true, status: await providerStatusForPanel()});
  } catch (error) {
    if (error instanceof BodyError) return json({ok: false, code: 'invalid_request'}, error.status);
    return json({ok: false, code: 'storage_unavailable'}, 503);
  }
}
