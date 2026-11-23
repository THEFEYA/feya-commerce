/** The completed, confirmed guest statement, independent of any refund decision. */
export const WITHDRAWAL_DECLARATION = 'I hereby withdraw from the contract identified below.';
export type WithdrawalReceipt = {reference: string; submitted_at: string};
export type WithdrawalInput = {
  name: string; order_number: string; email: string; idempotency_key: string; access_token?: string;
};
const controls = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
const uuid4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
function inputText(raw: unknown, max: number) {
  if (typeof raw !== 'string' || controls.test(raw)) return null;
  const text = raw.trim();
  return text && text.length <= max ? text : null;
}
export function validWithdrawalEmail(value: string) {
  return value.length <= 254 && /^[^\s@,;<>()[\]\\":]+@(?:[a-z0-9-]+\.)+[a-z0-9-]+$/iu.test(value)
    && !controls.test(value);
}
export function parseWithdrawal(raw: unknown, isAccessToken: (value: unknown) => boolean): WithdrawalInput | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const x = raw as Record<string, unknown>;
  const keys = ['name','order_number','email','confirm','idempotency_key','access_token'];
  if (Object.keys(x).some(k => !keys.includes(k)) || x.confirm !== true ||
    typeof x.idempotency_key !== 'string' || !uuid4.test(x.idempotency_key)) return null;
  const name = inputText(x.name,120), order = inputText(x.order_number,240), email = inputText(x.email,254);
  if (!name || !order || !email || !validWithdrawalEmail(email)) return null;
  if (x.access_token !== undefined && (typeof x.access_token !== 'string' || !isAccessToken(x.access_token))) return null;
  return {name, order_number:order, email, idempotency_key:x.idempotency_key.toLowerCase(),
    ...(typeof x.access_token === 'string' ? {access_token:x.access_token} : {})};
}
export function publicWithdrawalReceipt(value: unknown): WithdrawalReceipt | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.reference !== 'string' || !uuid4.test(row.reference) || typeof row.submitted_at !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(row.submitted_at)) return null;
  const instant = new Date(row.submitted_at);
  return Number.isFinite(instant.valueOf()) ? {reference:row.reference, submitted_at:instant.toISOString()} : null;
}
