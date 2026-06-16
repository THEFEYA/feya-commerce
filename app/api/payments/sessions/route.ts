import { NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

type PaymentSessionRequest = {
  order_draft_id?: string;
};

function getProvider() {
  return (process.env.PAYMENT_PROVIDER || '').trim().toLowerCase();
}

export async function POST(request: Request) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage() }, { status: 503 });
  }

  let payload: PaymentSessionRequest;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const orderDraftId = typeof payload.order_draft_id === 'string' ? payload.order_draft_id.trim() : '';
  if (!orderDraftId) {
    return NextResponse.json({ ok: false, error: 'order_draft_id is required.' }, { status: 400 });
  }

  const { data: draft, error: draftError } = await supabase
    .from('feya_commerce_order_drafts')
    .select('order_draft_id,draft_number,total_amount,currency,payment_status,order_status,has_price_review_warning,has_label_review_warning')
    .eq('order_draft_id', orderDraftId)
    .single();

  if (draftError || !draft) {
    return NextResponse.json({ ok: false, error: draftError?.message || 'Checkout draft not found.' }, { status: 404 });
  }

  if (draft.payment_status !== 'not_started' || draft.order_status !== 'draft_only') {
    return NextResponse.json({ ok: false, error: 'Checkout draft is not eligible for payment session creation.' }, { status: 409 });
  }

  if (draft.has_price_review_warning || draft.has_label_review_warning) {
    return NextResponse.json({ ok: false, error: 'Payment is blocked until price and label review warnings are resolved.' }, { status: 409 });
  }

  const provider = getProvider();
  if (!provider) {
    return NextResponse.json({
      ok: false,
      error: 'Payment provider is not configured yet. Set PAYMENT_PROVIDER after v4 prices and provider decision are ready.',
      draft_number: draft.draft_number,
    }, { status: 501 });
  }

  if (!['stripe', 'paypal'].includes(provider)) {
    return NextResponse.json({ ok: false, error: `Unsupported payment provider: ${provider}` }, { status: 501 });
  }

  return NextResponse.json({
    ok: false,
    error: `${provider} payment session creation is intentionally not activated yet. Implement provider-specific checkout only after webhook verification is ready.`,
    draft_number: draft.draft_number,
  }, { status: 501 });
}
