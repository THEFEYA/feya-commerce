import {publicWithdrawalReceipt, validWithdrawalEmail} from './contract.ts';

export type DeliveryJob = {
  job_id: string;
  attempt_id: string;
  kind: 'customer' | 'studio';
  to: string;
  reference: string;
  submitted_at: string;
  statement: {name: string; contract: string; email: string; declaration: string} | null;
};
type WorkerCommand = {action: 'take'; remaining: number}
  | {action: 'report'; job_id: string; attempt_id: string; outcome: 'submitted' | 'unknown'};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const studioMailbox = 'manager.feya@gmail.com';

export function parseWorkerCommand(raw: unknown): WorkerCommand | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (value.action === 'take' && Object.keys(value).length === 2 && typeof value.remaining === 'number'
      && Number.isInteger(value.remaining) && value.remaining >= 0 && value.remaining <= 1_000_000) {
    return {action: 'take', remaining: value.remaining};
  }
  if (value.action === 'report' && Object.keys(value).length === 4
      && typeof value.job_id === 'string' && uuid.test(value.job_id)
      && typeof value.attempt_id === 'string' && uuid.test(value.attempt_id)
      && (value.outcome === 'submitted' || value.outcome === 'unknown')) {
    return {action: 'report', job_id: value.job_id, attempt_id: value.attempt_id, outcome: value.outcome};
  }
  return null;
}

/** Plain text only and a server-selected destination. The worker cannot set any email fields. */
export function renderAcknowledgement(job: DeliveryJob) {
  const receipt = publicWithdrawalReceipt(job);
  if (!receipt || !validWithdrawalEmail(job.to)) throw new Error('invalid_queued_notice');
  const ref = 'Reference: ' + receipt.reference;
  const time = 'Time submitted (UTC): ' + receipt.submitted_at;
  if (job.kind === 'studio' && job.statement === null && job.to === studioMailbox) {
    return {to: job.to, subject: 'TheFEYA · New withdrawal statement · ' + receipt.reference,
      body: ['A customer has filed a withdrawal statement. Open the private withdrawal queue.', ref, time].join('\n')};
  }
  const statement = job.statement;
  if (job.kind !== 'customer' || !statement || job.to.toLowerCase() !== statement.email.toLowerCase()) {
    throw new Error('invalid_queued_notice');
  }
  return {to: job.to, subject: 'TheFEYA · Withdrawal acknowledgement · ' + receipt.reference,
    body: ['TheFEYA has received your withdrawal statement.', ref, time, '', 'Your statement:',
      statement.declaration, 'Name: ' + statement.name, 'Contract identified by: ' + statement.contract,
      'Confirmation email: ' + statement.email].join('\n')};
}
