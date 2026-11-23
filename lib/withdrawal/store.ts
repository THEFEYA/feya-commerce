import 'server-only';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {sha256} from '../payments/runtime.ts';
import {withdrawalSellerRoute} from './config.ts';
import type {WithdrawalInput} from './contract.ts';
import type {DeliveryJob} from './transport.ts';

async function call<T>(name: string, params: Record<string, unknown>): Promise<T> {
  const service = getSupabaseServiceRoleClient();
  if (!service) throw new Error('withdrawal_storage_unavailable');
  const {data, error} = await service.rpc(name, params);
  if (error || data == null) throw new Error('withdrawal_storage_unavailable');
  return data as T;
}

export const withdrawalStore = {
  record: (input: WithdrawalInput, ip: string | null) =>
    call<{code?: string; reference?: string; submitted_at?: string}>('feya_withdrawal_record_v1', {
      p_key: input.idempotency_key, p_name: input.name, p_order_reference: input.order_number, p_email: input.email,
      p_language: input.language ?? 'en', p_seller_route: withdrawalSellerRoute(), p_access_sha: input.access_token ? sha256(input.access_token) : null, p_ip_sha: ip,
    }),
  take: (remaining: number) => call<DeliveryJob[]>('feya_withdrawal_take_v1', {p_remaining: remaining}),
  report: (job: string, attempt: string, outcome: 'submitted' | 'unknown') =>
    call<boolean>('feya_withdrawal_report_v1', {p_job: job, p_attempt: attempt, p_outcome: outcome}),
};
