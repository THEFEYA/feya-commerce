import type {NextRequest} from 'next/server';
import {json} from '@/lib/payments/access';
import {BodyError, readLimitedJson} from '@/lib/payments/http';
import {withdrawalWorkerAudience} from '@/lib/withdrawal/config';
import {withdrawalStore} from '@/lib/withdrawal/store';
import {authorizedWithdrawalWorker} from '@/lib/withdrawal/googleWorkerIdentity';
import {parseWorkerCommand, renderAcknowledgement} from '@/lib/withdrawal/transport';

/** The private Gmail worker may only take a queued message or report its own attempt. */
export async function POST(request: NextRequest) {
  const audience = withdrawalWorkerAudience();
  if (!audience) return json({ok: false}, 503);
  if (request.nextUrl.search) return json({ok: false}, 401);
  try {
    if (!await authorizedWithdrawalWorker(request.headers.get('authorization'), audience)) return json({ok: false}, 401);
    const command = parseWorkerCommand(await readLimitedJson(request, 1024));
    if (!command) return json({ok: false}, 400);
    if (command.action === 'report') {
      const accepted = await withdrawalStore.report(command.job_id, command.attempt_id, command.outcome);
      return json({ok: true, accepted});
    }
    // Drain previously filed statements even if new public intake has been paused.
    const [job] = await withdrawalStore.take(command.remaining);
    if (!job) return json({ok: true, job: null});
    return json({ok: true, job: {job_id: job.job_id, attempt_id: job.attempt_id, ...renderAcknowledgement(job)}});
  } catch (error) {
    return json({ok: false}, error instanceof BodyError ? error.status : 503);
  }
}
