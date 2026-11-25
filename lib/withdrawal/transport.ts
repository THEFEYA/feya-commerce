import {SELLER_ONLINE_PROVIDER} from '../sellerOnlineProvider.ts';
import {isWithdrawalLanguage, withdrawalCopy, type WithdrawalLanguage} from './language.ts';
import {publicWithdrawalReceipt, validWithdrawalEmail} from './contract.ts';

export type DeliveryJob = {
  job_id: string;
  attempt_id: string;
  kind: 'customer' | 'studio' | 'seller';
  to: string;
  reference: string;
  submitted_at: string;
  statement: {name: string; contract: string; email: string; declaration: string; language?: WithdrawalLanguage} | null;
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
  const sellerDelivery = job.kind === 'seller' && job.to === SELLER_ONLINE_PROVIDER.usOfficeEmail;
  const customerDelivery = job.kind === 'customer' && job.to.toLowerCase() === statement?.email.toLowerCase();
  if (!statement || (!sellerDelivery && !customerDelivery)) {
    throw new Error('invalid_queued_notice');
  }
  const language = statement.language ?? 'en';
  if (!isWithdrawalLanguage(language) || statement.declaration !== withdrawalCopy[language].declaration) {
    throw new Error('invalid_queued_notice');
  }
  const words = withdrawalCopy[language];
  if (sellerDelivery) {
    return {to: job.to, subject: 'TheFEYA · Consumer withdrawal for ' + SELLER_ONLINE_PROVIDER.legalName + ' · ' + receipt.reference,
      body: ['To ' + SELLER_ONLINE_PROVIDER.legalName, ref, time, '', statement.declaration, 'Name: ' + statement.name,
        'Order or purchase: ' + statement.contract, 'Contact chosen by the consumer: ' + statement.email].join('\n')};
  }
  return {to: job.to, subject: 'TheFEYA · ' + words.receipt + ' · ' + receipt.reference,
    body: [words.received, words.reference + ': ' + receipt.reference, words.time + ': ' + receipt.submitted_at, '',
      statement.declaration, words.name + ': ' + statement.name, words.order + ': ' + statement.contract,
      words.email + ': ' + statement.email].join('\n')};
}
