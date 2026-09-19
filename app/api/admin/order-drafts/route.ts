import { NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage(), drafts: [] }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_admin_order_drafts_v1')
    .select('*')
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, drafts: [] }, { status: 500 });
  }

  const drafts = (data || []).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  return NextResponse.json({ ok: true, drafts });
}
