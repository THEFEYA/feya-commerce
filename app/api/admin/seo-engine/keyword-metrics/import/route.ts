// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getMissingSupabaseServiceEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type KeywordMetricInputRow = {
  keyword?: string;
  source_code?: string;
  country_code?: string;
  language_code?: string;
  page_type?: string;
  strategy_code?: string;
  event_code?: string;
  avg_monthly_searches?: number | string | null;
  competition_level?: string | null;
  competition_index?: number | string | null;
  low_top_of_page_bid_micros?: number | string | null;
  high_top_of_page_bid_micros?: number | string | null;
  trend_score?: number | string | null;
  seasonality_score?: number | string | null;
  buyer_intent_score?: number | string | null;
  event_fit_score?: number | string | null;
  visual_fit_score?: number | string | null;
  observed_month?: string | null;
};

type ImportPayload = {
  source_code?: string;
  source_name?: string;
  source_kind?: string;
  source_file_name?: string;
  country_code?: string;
  language_code?: string;
  notes?: string;
  rows?: KeywordMetricInputRow[];
};

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanInteger(value: unknown) {
  const parsed = cleanNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function cleanDate(value: unknown) {
  const text = cleanText(value);
  if (!text) return null;
  const match = text.match(/^\d{4}-\d{2}(-\d{2})?$/);
  if (!match) return null;
  return text.length === 7 ? `${text}-01` : text;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: getMissingSupabaseServiceEnvMessage() }, { status: 503 });
  }

  let input: ImportPayload;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const rows = Array.isArray(input.rows) ? input.rows : [];
  if (!rows.length) {
    return NextResponse.json({ ok: false, error: 'Missing rows.' }, { status: 400 });
  }

  const sourceCode = cleanText(input.source_code, 'manual_keyword_import');
  const countryCode = cleanText(input.country_code, 'US').toUpperCase();
  const languageCode = cleanText(input.language_code, 'en').toLowerCase();

  const batchResult = await supabase
    .from('feya_keyword_import_batches_v1')
    .insert({
      source_code: sourceCode,
      source_name: cleanText(input.source_name, sourceCode),
      source_kind: cleanText(input.source_kind, 'manual_import'),
      source_file_name: cleanText(input.source_file_name) || null,
      country_code: countryCode,
      language_code: languageCode,
      import_status: 'processing',
      notes: cleanText(input.notes) || null,
      raw_payload_json: { row_count: rows.length },
    })
    .select('import_batch_id')
    .single();

  if (batchResult.error) {
    return NextResponse.json({ ok: false, error: batchResult.error.message }, { status: 500 });
  }

  const importBatchId = batchResult.data.import_batch_id;
  const acceptedRows = [];
  const rejectedRows = [];

  for (const row of rows) {
    const keyword = cleanText(row.keyword);
    if (!keyword) {
      rejectedRows.push({ row, reason: 'missing_keyword' });
      continue;
    }

    acceptedRows.push({
      import_batch_id: importBatchId,
      source_code: cleanText(row.source_code, sourceCode),
      keyword,
      country_code: cleanText(row.country_code, countryCode).toUpperCase(),
      language_code: cleanText(row.language_code, languageCode).toLowerCase(),
      page_type: cleanText(row.page_type) || null,
      strategy_code: cleanText(row.strategy_code) || null,
      event_code: cleanText(row.event_code) || null,
      avg_monthly_searches: cleanInteger(row.avg_monthly_searches),
      competition_level: cleanText(row.competition_level) || null,
      competition_index: cleanNumber(row.competition_index),
      low_top_of_page_bid_micros: cleanInteger(row.low_top_of_page_bid_micros),
      high_top_of_page_bid_micros: cleanInteger(row.high_top_of_page_bid_micros),
      trend_score: cleanNumber(row.trend_score),
      seasonality_score: cleanNumber(row.seasonality_score),
      buyer_intent_score: cleanNumber(row.buyer_intent_score),
      event_fit_score: cleanNumber(row.event_fit_score),
      visual_fit_score: cleanNumber(row.visual_fit_score),
      observed_month: cleanDate(row.observed_month),
      raw_row_json: row,
    });
  }

  if (acceptedRows.length) {
    const insertResult = await supabase.from('feya_keyword_metrics_v1').insert(acceptedRows);
    if (insertResult.error) {
      await supabase.from('feya_keyword_import_batches_v1').update({ import_status: 'failed', rejected_rows: rows.length, notes: insertResult.error.message }).eq('import_batch_id', importBatchId);
      return NextResponse.json({ ok: false, error: insertResult.error.message }, { status: 500 });
    }
  }

  await supabase
    .from('feya_keyword_import_batches_v1')
    .update({
      import_status: 'completed',
      imported_rows: rows.length,
      accepted_rows: acceptedRows.length,
      rejected_rows: rejectedRows.length,
      raw_payload_json: { row_count: rows.length, rejected: rejectedRows.slice(0, 50) },
      imported_at: new Date().toISOString(),
    })
    .eq('import_batch_id', importBatchId);

  return NextResponse.json({
    ok: true,
    import_batch_id: importBatchId,
    imported_rows: rows.length,
    accepted_rows: acceptedRows.length,
    rejected_rows: rejectedRows.length,
  });
}
