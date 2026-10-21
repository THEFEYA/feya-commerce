import 'server-only';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';

/**
 * Thin typed wrappers over the payments database functions
 * (supabase/migrations/20261021200000_payments_provider_checkout_v1.sql).
 * The server never touches the payments tables directly.
 */
export class PaymentsStoreError extends Error {
  constructor(code: string) { super(code); this.name = 'PaymentsStoreError'; }
}

type Json = Record<string, unknown>;

async function rpc<T = Json>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const client = getSupabaseServiceRoleClient();
  if (!client) throw new PaymentsStoreError('payments_storage_unavailable');
  const {data, error} = await client.rpc(name, args);
  if (error) {
    const message = String(error.message || '');
    // Business rule violations raised by the database are reported by code, never by SQL text.
    const code = /^feya_pay_[a-z_]+$/.test(message) ? message : 'payments_storage_unavailable';
    throw new PaymentsStoreError(code);
  }
  return data as T;
}

export type ProviderStatus = {
  ok: boolean;
  engine: 'paypal_checkout' | 'paypal_standard';
  environment: 'sandbox' | 'live';
  credential_source: 'none' | 'installer' | 'platform';
  client_id_hint: string | null;
  payee_email: string | null;
  store_key_set: boolean;
  store_key_hint: string | null;
  config_version: number;
  checks: {
    credentials: boolean; credentials_at: string | null;
    payee: boolean; payee_at: string | null; payee_merchant_id: string | null;
    webhook: boolean; webhook_at: string | null; webhook_last_event_at: string | null;
    test_payment: boolean; test_environment: 'sandbox' | 'live' | null; test_paid_at: string | null;
  };
  active: boolean;
  activated_at: string | null;
  activated_by: string | null;
  paused_at: string | null;
  last_error: string | null;
  updated_at: string | null;
  updated_by: string | null;
  paid_orders: number;
  pending_orders: number;
  code?: string;
  changed?: boolean;
};

export type ProviderRuntime = {
  engine: 'paypal_checkout' | 'paypal_standard';
  environment: 'sandbox' | 'live';
  credential_source: 'none' | 'installer' | 'platform';
  client_id: string | null;
  client_secret: string | null;
  payee_email: string | null;
  payee_merchant_id: string | null;
  store_key: string | null;
  webhook_id: string | null;
  config_version: number;
  active: boolean;
};

export type StoredOrder = {
  ok: true;
  order_id: string; order_number: string; kind: 'customer' | 'test'; status: string;
  engine: 'paypal_checkout' | 'paypal_standard'; environment: 'sandbox' | 'live'; config_version: number;
  currency: 'EUR'; total_minor: number; merchandise_minor: number; extras_minor: number;
  shipping_minor: number; remote_minor: number; handling_minor: number;
  snapshot: Json; expected_payee_email: string | null; expected_payee_merchant_id: string | null;
  custom_id: string; invoice_id: string; provider_order_id: string | null; capture_id: string | null;
  paid_at: string | null; created_at: string;
};

export type PaymentOutcome = {
  ok: boolean; code?: string; outcome?: string; reason?: string; order_number?: string; status?: string; kind?: 'customer' | 'test';
};

export const paymentsStore = {
  providerStatus: () => rpc<ProviderStatus>('feya_pay_provider_status_v1'),
  publicState: () => rpc<{ok: boolean; active: boolean; engine: string; environment: string; config_version: number}>('feya_pay_public_state_v1'),
  providerRuntime: () => rpc<ProviderRuntime>('feya_pay_provider_runtime_v1'),
  saveProvider: (payload: Json, actor: string, role: 'technician' | 'owner') =>
    rpc<ProviderStatus>('feya_pay_provider_save_v1', {p_payload: payload, p_actor: actor, p_actor_role: role}),
  recordCheck: (configVersion: number, check: 'credentials' | 'payee' | 'webhook' | 'webhook_event', ok: boolean, details: Json, actor: string, role: 'technician' | 'owner') =>
    rpc<Json>('feya_pay_provider_record_check_v1', {p_config_version: configVersion, p_check: check, p_ok: ok,
      p_details: details, p_actor: actor, p_actor_role: role}),
  setActive: (active: boolean, actor: string, role: 'technician' | 'owner') =>
    rpc<ProviderStatus>('feya_pay_provider_set_active_v1', {p_active: active, p_actor: actor, p_actor_role: role}),

  createOrder: (payload: Json) => rpc<{ok: boolean; code?: string; replayed?: boolean; order_id?: string; order_number?: string;
    status?: string; provider_order_id?: string | null; total_minor?: number; invoice_id?: string; custom_id?: string}>('feya_pay_order_create_v1', {p_payload: payload}),
  attachProviderOrder: (orderId: string, providerOrderId: string) =>
    rpc<{ok: boolean; code?: string}>('feya_pay_order_attach_provider_v1', {p_order_id: orderId, p_provider_order_id: providerOrderId}),
  getOrder: (lookup: {orderId?: string; providerOrderId?: string}) =>
    rpc<StoredOrder | {ok: false; code: string}>('feya_pay_order_get_v1', {p_order_id: lookup.orderId ?? null, p_provider_order_id: lookup.providerOrderId ?? null}),
  orderIdByInvoice: (invoice: string) => rpc<string | null>('feya_pay_order_id_by_invoice_v1', {p_invoice_id: invoice}),
  recordPayment: (payload: Json) => rpc<PaymentOutcome>('feya_pay_record_payment_v1', {p_payload: payload}),
  recordRefund: (payload: Json) => rpc<{ok: boolean; code?: string; order_number?: string}>('feya_pay_record_refund_v1', {p_payload: payload}),
  cancelOrder: (lookup: {orderId?: string; providerOrderId?: string}) =>
    rpc<{ok: boolean; code?: string; status?: string; order_number?: string; kind?: string}>('feya_pay_order_cancel_v1',
      {p_provider_order_id: lookup.providerOrderId ?? null, p_order_id: lookup.orderId ?? null}),
  orderForBuyer: (accessSha: string) => rpc<Json>('feya_pay_order_for_buyer_v1', {p_access_sha256: accessSha}),
  ordersForOwner: (limit: number, includeTests: boolean) => rpc<Json[]>('feya_pay_orders_for_owner_v1', {p_limit: limit, p_include_tests: includeTests}),
  auditRecent: (limit: number) => rpc<Json[]>('feya_pay_audit_recent_v1', {p_limit: limit}),

  claimEvent: (key: string, source: 'paypal_webhook' | 'paypal_ipn', type: string, verified: boolean) =>
    rpc<{ok: boolean; first: boolean; outcome?: string}>('feya_pay_event_claim_v1', {p_event_key: key, p_source: source, p_event_type: type, p_verified: verified}),
  finishEvent: (key: string, orderId: string | null, outcome: string) =>
    rpc<null>('feya_pay_event_finish_v1', {p_event_key: key, p_order_id: orderId, p_outcome: outcome}),

  mintGrant: (role: 'technician' | 'owner', label: string, ttlHours: number, createdBy: string) =>
    rpc<{ok: boolean; token: string; role: string; expires_at: string}>('feya_pay_grant_mint_v1',
      {p_role: role, p_label: label, p_ttl_hours: ttlHours, p_created_by: createdBy}),
  resolveGrant: (tokenSha: string) =>
    rpc<{ok: boolean; code?: string; grant_id?: string; role?: 'technician' | 'owner'; label?: string; expires_at?: string}>('feya_pay_grant_resolve_v1', {p_token_sha256: tokenSha}),
  listGrants: () => rpc<Json[]>('feya_pay_grants_list_v1'),
  revokeGrant: (grantId: string, actor: string) => rpc<{ok: boolean}>('feya_pay_grant_revoke_v1', {p_grant_id: grantId, p_actor: actor}),
};
