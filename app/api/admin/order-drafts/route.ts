import { NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

export async function GET() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage(), drafts: [], itemsByDraft: {} }, { status: 503 });
  }

  const { data: draftData, error: draftError } = await supabase
    .from('feya_commerce_order_drafts')
    .select('order_draft_id,draft_number,email,full_name,total_amount,currency,payment_status,order_status,production_status,shipping_status,created_at,has_price_review_warning,has_label_review_warning')
    .limit(25);

  if (draftError) {
    return NextResponse.json({ ok: false, error: draftError.message, drafts: [], itemsByDraft: {} }, { status: 500 });
  }

  const drafts = (draftData || []).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const ids = drafts.map((draft) => draft.order_draft_id).filter(Boolean);
  if (!ids.length) return NextResponse.json({ ok: true, drafts, itemsByDraft: {} });

  const { data: itemData, error: itemError } = await supabase
    .from('feya_commerce_order_draft_items')
    .select('order_draft_id,product_title,image_url,configuration_label,component_code,component_family,is_full_set,color,size,quantity,unit_price_amount,line_total_amount,currency,price_confidence_status,label_confidence_status')
    .in('order_draft_id', ids);

  if (itemError) {
    return NextResponse.json({ ok: false, error: itemError.message, drafts, itemsByDraft: {} }, { status: 500 });
  }

  const itemsByDraft = (itemData || []).reduce((acc, item) => {
    acc[item.order_draft_id] = acc[item.order_draft_id] || [];
    acc[item.order_draft_id].push(item);
    return acc;
  }, {} as Record<string, unknown[]>);

  return NextResponse.json({ ok: true, drafts, itemsByDraft });
}
