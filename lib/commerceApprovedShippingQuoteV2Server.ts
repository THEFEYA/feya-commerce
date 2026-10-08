import 'server-only';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { issueApprovedShippingQuoteV2 } from '@/lib/commerceApprovedShippingQuoteV2';

export const isApprovedShippingQuoteV2Enabled = () =>
  process.env.FEYA_COMMERCE_APPROVED_SHIPPING_QUOTE_V2_ENABLED === 'true';

/** No API route, storefront consumer, payment provider, or public endpoint.
 * Default OFF until exact-head native CI, production migration and approved
 * owner EUR delivery workspace are verified separately. */
export async function issueApprovedShippingQuoteV2Server(request: unknown) {
  if (!isApprovedShippingQuoteV2Enabled()) {
    return { ok: false as const, status: 423, code: 'approved_shipping_quote_v2_disabled' };
  }
  const client = getSupabaseServiceClient();
  if (!client) return { ok: false as const, status: 503, code: 'approved_shipping_quote_storage_unavailable' };
  return { ok: true as const, receipt: await issueApprovedShippingQuoteV2(client, request) };
}
