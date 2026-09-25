import 'server-only';
import { getSupabaseServiceClient } from '@/lib/supabase';

export function isCommerceQuoteEnabled() {
  return process.env.FEYA_COMMERCE_QUOTE_ENABLED === 'true';
}

export function getCommerceQuoteServerClient() {
  if (!isCommerceQuoteEnabled()) return { ok: false as const, status: 423, code: 'commerce_quote_disabled' };
  const client = getSupabaseServiceClient();
  if (!client) return { ok: false as const, status: 503, code: 'quote_storage_unavailable' };
  return { ok: true as const, client };
}
