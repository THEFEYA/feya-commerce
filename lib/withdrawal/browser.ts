import {withdrawalCopy, type WithdrawalLanguage} from './language.ts';
import {publicWithdrawalReceipt, type WithdrawalInput, type WithdrawalReceipt} from './contract.ts';

/** Only a fingerprint and a random request ID are kept in this tab across reloads. */
export type WithdrawalFields = Pick<WithdrawalInput, 'name' | 'order_number' | 'email'>;
export type WithdrawalAttempt = {fingerprint: string; key: string};
export type GuestWithdrawalReceipt = WithdrawalReceipt & {acknowledgement: 'pending' | 'sent'};

const sessionKey = 'thefeya-withdrawal-attempt-v1';
const uuid = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

export async function withdrawalAttempt(fields: WithdrawalFields, current: WithdrawalAttempt | null, language: WithdrawalLanguage = 'en') {
  const statement = JSON.stringify([fields.name, fields.order_number, fields.email, language]);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(statement));
  const fingerprint = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  if (current?.fingerprint === fingerprint) return current;
  const storageKey = sessionKey + ':' + fingerprint;
  try {
    const key = window.sessionStorage.getItem(storageKey);
    if (key && uuid.test(key)) return {fingerprint, key};
  } catch {
    // In private browsing the in-memory request ID still covers retries on this page.
  }
  const attempt = {fingerprint, key: crypto.randomUUID()};
  try { window.sessionStorage.setItem(storageKey, attempt.key); } catch { /* Storage is optional. */ }
  return attempt;
}

export function readWithdrawalReceipt(value: unknown): GuestWithdrawalReceipt | null {
  if (typeof value !== 'object' || value === null || !('ok' in value) || value.ok !== true
    || !('acknowledgement' in value) || (value.acknowledgement !== 'pending' && value.acknowledgement !== 'sent')
    || !('receipt' in value)) return null;
  const receipt = publicWithdrawalReceipt(value.receipt);
  return receipt ? {...receipt, acknowledgement: value.acknowledgement} : null;
}

export function withdrawalReceiptText(fields: WithdrawalFields, receipt: GuestWithdrawalReceipt, seller: string, language: WithdrawalLanguage = 'en') {
  const words = withdrawalCopy[language];
  return [
    'TheFEYA · ' + words.receipt, '', words.received, words.seller + ': ' + seller,
    words.declaration, '', words.name + ': ' + fields.name, words.order + ': ' + fields.order_number,
    words.email + ': ' + fields.email, words.reference + ': ' + receipt.reference,
    words.time + ': ' + receipt.submitted_at,
  ].join('\n');
}
