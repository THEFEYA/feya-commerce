import { NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

type IncomingItem = {
  id?: string;
  slug?: string;
  title?: string;
  image?: string;
  config?: string;
  size?: string;
  color?: string;
  qty?: number;
  price?: number;
  currency?: string;
  price_contract_version?: string | null;
  price_confidence_status?: string | null;
  label_confidence_status?: string | null;
  component_code?: string | null;
  component_family?: string | null;
  is_full_set?: boolean | null;
  configuration_id?: string | null;
  public_label?: string | null;
  unit_price_amount?: number | null;
  compare_at_price_amount?: number | null;
};

type IncomingDraft = {
  items?: IncomingItem[];
  delivery?: 'standard' | 'express';
  shipping?: number;
  subtotal?: number;
  total?: number;
  currency?: string;
  contact?: {
    email?: string;
    fullName?: string;
    phone?: string;
    address?: string;
    eventDate?: string;
    measurements?: string;
    note?: string;
  };
};

function asAmount(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function splitAddress(raw: string) {
  const address = asText(raw);
  return {
    country: null as string | null,
    city: null as string | null,
    address_line_1: address || null,
    address_line_2: null as string | null,
    postal_code: null as string | null,
  };
}

export async function POST(request: Request) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage() }, { status: 503 });
  }

  let payload: IncomingDraft;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    return NextResponse.json({ ok: false, error: 'Checkout draft requires at least one cart item.' }, { status: 400 });
  }

  const contact = payload.contact || {};
  const address = splitAddress(contact.address || '');
  const currency = asText(payload.currency) || items[0]?.currency || 'EUR';
  const delivery = payload.delivery === 'express' ? 'express' : 'standard';
  const firstPriceContract = asText(items[0]?.price_contract_version) || 'v4_unverified';

  const draftInsert = {
    email: asText(contact.email) || null,
    full_name: asText(contact.fullName) || null,
    phone: asText(contact.phone) || null,
    country: address.country,
    city: address.city,
    address_line_1: address.address_line_1,
    address_line_2: address.address_line_2,
    postal_code: address.postal_code,
    customer_note: asText(contact.note) || null,
    event_date: asText(contact.eventDate) || null,
    measurements_note: asText(contact.measurements) || null,
    shipping_method: delivery,
    shipping_price_amount: asAmount(payload.shipping),
    subtotal_amount: asAmount(payload.subtotal),
    total_amount: asAmount(payload.total),
    currency,
    payment_status: 'not_started',
    order_status: 'draft_only',
    production_status: 'not_started',
    shipping_status: 'not_started',
    price_contract_version: firstPriceContract,
    has_price_review_warning: items.some((item) => asText(item.price_confidence_status) !== 'approved'),
    has_label_review_warning: items.some((item) => asText(item.label_confidence_status) === 'needs_review'),
    raw_checkout_snapshot: payload,
  };

  const { data: draft, error: draftError } = await supabase
    .from('feya_commerce_order_drafts')
    .insert(draftInsert)
    .select('order_draft_id,draft_number')
    .single();

  if (draftError || !draft) {
    return NextResponse.json({ ok: false, error: draftError?.message || 'Could not create checkout draft.' }, { status: 500 });
  }

  const draftItems = items.map((item) => {
    const qty = Math.max(1, Number(item.qty || 1));
    const unit = asAmount(item.unit_price_amount ?? item.price);
    const itemCurrency = asText(item.currency) || currency;
    const publicLabel = asText(item.public_label) || asText(item.config) || 'Option';
    return {
      order_draft_id: draft.order_draft_id,
      product_slug: asText(item.slug) || 'unknown-product',
      canonical_product_id: null,
      matched_etsy_listing_id: null,
      product_title: asText(item.title) || 'Atelier piece',
      image_url: asText(item.image) || null,
      configuration_id: asText(item.configuration_id) || asText(item.id) || null,
      configuration_label: publicLabel,
      component_code: asText(item.component_code) || null,
      component_family: asText(item.component_family) || null,
      is_full_set: item.is_full_set === true || /full\s*set|complete\s*set/i.test(publicLabel),
      color: asText(item.color) || null,
      size: asText(item.size) || null,
      quantity: qty,
      unit_price_amount: unit,
      line_total_amount: asAmount(unit * qty),
      currency: itemCurrency,
      price_confidence_status: asText(item.price_confidence_status) || 'v4_unverified',
      label_confidence_status: asText(item.label_confidence_status) || 'unknown',
      raw_item_snapshot: item,
    };
  });

  const { error: itemsError } = await supabase
    .from('feya_commerce_order_draft_items')
    .insert(draftItems);

  if (itemsError) {
    return NextResponse.json({ ok: false, error: itemsError.message, order_draft_id: draft.order_draft_id }, { status: 500 });
  }

  return NextResponse.json({ ok: true, order_draft_id: draft.order_draft_id, draft_number: draft.draft_number });
}
