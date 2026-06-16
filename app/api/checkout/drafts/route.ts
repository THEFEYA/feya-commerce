import { NextResponse } from 'next/server';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';

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
  is_bundle?: boolean | null;
  configuration_id?: string | null;
  public_label?: string | null;
  unit_price_amount?: number | null;
  compare_at_price_amount?: number | null;
  canonical_product_id?: string | null;
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

function normalizeCurrency(value: unknown) {
  const currency = asText(value).toUpperCase();
  return currency === 'USD' ? 'USD' : 'EUR';
}

function normalizeDraft(payload: IncomingDraft) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const currency = normalizeCurrency(payload.currency || items[0]?.currency);
  const delivery = payload.delivery === 'express' ? 'express' : 'standard';
  const contact = payload.contact || {};

  const normalizedItems = items.map((item) => {
    const qty = Math.max(1, Number(item.qty || 1));
    const unit = asAmount(item.unit_price_amount ?? item.price);
    const itemCurrency = normalizeCurrency(item.currency || currency);
    const publicLabel = asText(item.public_label) || asText(item.config) || 'Option';
    return {
      canonical_product_id: asText(item.canonical_product_id) || null,
      product_slug: asText(item.slug) || 'unknown-product',
      product_title: asText(item.title) || 'TheFEYA piece',
      image_url: asText(item.image) || null,
      configuration_id: asText(item.configuration_id) || asText(item.id) || null,
      configuration_label: publicLabel,
      public_label: publicLabel,
      component_code: asText(item.component_code) || null,
      component_family: asText(item.component_family) || null,
      is_full_set: item.is_full_set === true || /full\s*set|complete\s*set/i.test(publicLabel),
      is_bundle: item.is_bundle === true,
      color: asText(item.color) || null,
      size: asText(item.size) || null,
      quantity: qty,
      unit_price_amount: unit,
      compare_at_price_amount: item.compare_at_price_amount == null ? null : asAmount(item.compare_at_price_amount),
      line_total_amount: asAmount(unit * qty),
      currency: itemCurrency,
      price_contract_version: asText(item.price_contract_version) || 'v4_unverified',
      price_confidence_status: asText(item.price_confidence_status) || 'unverified',
      label_confidence_status: asText(item.label_confidence_status) || 'unknown',
    };
  });

  return {
    customer: {
      email: asText(contact.email) || null,
      full_name: asText(contact.fullName) || null,
      phone: asText(contact.phone) || null,
      shipping_address: asText(contact.address) || null,
      customer_note: asText(contact.note) || null,
      delivery_method: delivery,
    },
    totals: {
      subtotal_amount: asAmount(payload.subtotal),
      shipping_amount: asAmount(payload.shipping),
      total_amount: asAmount(payload.total),
      currency,
    },
    warnings: {
      has_price_review_warning: normalizedItems.some((item) => item.price_confidence_status !== 'approved'),
      has_label_review_warning: normalizedItems.some((item) => item.label_confidence_status === 'needs_review' || item.label_confidence_status === 'unknown'),
    },
    items: normalizedItems,
    payment_status: 'not_started',
    order_status: 'draft_only',
    production_status: 'not_started',
    shipping_status: 'not_started',
    payload_raw_json: payload,
  };
}

async function callCreateDraft(supabase: NonNullable<ReturnType<typeof getSupabaseReadClient>>, draftPayload: Record<string, unknown>) {
  const variants = [
    { payload: draftPayload },
    { p_payload: draftPayload },
    { draft_payload: draftPayload },
    { input_payload: draftPayload },
  ];

  let lastError: unknown = null;
  for (const args of variants) {
    const { data, error } = await supabase.rpc('feya_commerce_create_order_draft_v1', args);
    if (!error) return { data, error: null };
    lastError = error;
  }

  return { data: null, error: lastError };
}

function pickDraftResult(data: unknown) {
  const value = Array.isArray(data) ? data[0] : data;
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return { order_draft_id: typeof value === 'string' ? value : null };
}

export async function POST(request: Request) {
  const supabase = getSupabaseReadClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseEnvMessage() }, { status: 503 });
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

  const draftPayload = normalizeDraft(payload);
  const { data, error } = await callCreateDraft(supabase, draftPayload);

  if (error) {
    return NextResponse.json({ ok: false, error: (error as { message?: string })?.message || 'Could not create checkout draft.' }, { status: 500 });
  }

  const result = pickDraftResult(data);
  return NextResponse.json({
    ok: true,
    order_draft_id: result.order_draft_id || result.id || null,
    draft_number: result.draft_number || result.draft_no || null,
    payment_status: 'not_started',
    order_status: 'draft_only',
  });
}
