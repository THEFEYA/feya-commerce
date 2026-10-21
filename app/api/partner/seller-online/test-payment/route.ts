import type {NextRequest} from 'next/server';
import {json, resolveInstaller, sameOrigin} from '@/lib/payments/access';
import {checkoutFailure, completeProviderOrder} from '@/lib/payments/checkoutService';
import {startTestPayment} from '@/lib/payments/installation';
import {BodyError, readLimitedJson} from '@/lib/payments/http';
import {checkoutOrigin} from '@/lib/payments/runtime';
import {PaymentsStoreError} from '@/lib/payments/store';

const MESSAGES: Record<string, string> = {
  pause_payments_before_test: 'Оплата сейчас включена для покупателей. Сначала приостановите её, затем проведите тест.',
  provider_not_configured: 'Сначала сохраните PayPal-аккаунт получателя и ключ магазина.',
  provider_configuration_changed: 'Настройки только что изменились. Обновите страницу.',
  payments_not_active: 'PayPal-подключение не настроено: нет действующих учётных данных для выбранной среды.',
  provider_rejected: 'PayPal отклонил создание тестового платежа. Запустите «Проверить подключение», чтобы увидеть причину.',
  provider_unavailable: 'PayPal не отвечает. Повторите через минуту.',
};

/** start: creates a real €1.00 test order and returns where to pay it.
 *  complete: captures it after PayPal returns the technician. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ok: false, code: 'same_origin_required'}, 403);
  const actor = await resolveInstaller(request);
  if (!actor) return json({ok: false, code: 'invitation_required'}, 401);
  let body: {action?: unknown; provider_order_id?: unknown};
  try { body = await readLimitedJson(request, 1_000) as typeof body; }
  catch (error) { return json({ok: false, code: 'invalid_request'}, error instanceof BodyError ? error.status : 400); }
  try {
    if (body?.action === 'complete') {
      const id = typeof body.provider_order_id === 'string' ? body.provider_order_id : '';
      const result = await completeProviderOrder(id);
      return json({ok: true, status: result.status, outcome: result.outcome ?? null});
    }
    const started = await startTestPayment(checkoutOrigin(request.nextUrl.origin));
    return json({ok: true, ...started});
  } catch (error) {
    const code = error instanceof PaymentsStoreError ? error.message : checkoutFailure(error).code;
    return json({ok: false, code, message: MESSAGES[code] || 'Не удалось выполнить тестовый платёж. Повторите попытку.'}, 422);
  }
}
