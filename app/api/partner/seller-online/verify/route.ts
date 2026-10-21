import type {NextRequest} from 'next/server';
import {json, resolveInstaller, sameOrigin} from '@/lib/payments/access';
import {runInstallationChecks} from '@/lib/payments/installation';

/** Runs the automatic installation: credentials → payee → webhook registration. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ok: false, code: 'same_origin_required'}, 403);
  const actor = await resolveInstaller(request);
  if (!actor) return json({ok: false, code: 'invitation_required'}, 401);
  try {
    const {results, status} = await runInstallationChecks(actor);
    return json({ok: true, results, status});
  } catch {
    return json({ok: false, code: 'verification_unavailable', message: 'Проверка временно недоступна. Повторите через минуту.'}, 503);
  }
}
