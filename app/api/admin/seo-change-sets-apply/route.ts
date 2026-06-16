import { NextRequest, NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Input = {
  change_set_id?: string;
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage() }, { status: 503 });
  }

  let input: Input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const changeSetId = cleanText(input.change_set_id);
  if (!changeSetId) {
    return NextResponse.json({ ok: false, error: 'Missing change_set_id.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('feya_commerce_seo_change_sets')
    .update({ status: 'applied', applied_at: new Date().toISOString() })
    .eq('change_set_id', changeSetId)
    .eq('status', 'approved')
    .select('change_set_id,product_slug,target_field,status,applied_at')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, change_set: data });
}
