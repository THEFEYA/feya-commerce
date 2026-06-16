// @ts-nocheck
'use client';

import { useMemo, useState } from 'react';
import { UploadCloud } from 'lucide-react';

const SAMPLE_PAYLOAD = {
  source_code: 'manual_keyword_import',
  source_name: 'Manual Keyword Import',
  source_kind: 'manual_import',
  source_file_name: 'keyword-metrics.csv',
  country_code: 'US',
  language_code: 'en',
  rows: [
    {
      keyword: 'gold mirror corset',
      avg_monthly_searches: 120,
      competition_level: 'HIGH',
      competition_index: 0.82,
      page_type: 'product',
      strategy_code: 'material_visual_focus',
      event_code: 'stage_performance',
      buyer_intent_score: 84,
      visual_fit_score: 96,
      observed_month: '2026-06',
    },
  ],
};

const CSV_TEMPLATE = `keyword,avg_monthly_searches,competition_level,competition_index,page_type,strategy_code,event_code,buyer_intent_score,visual_fit_score,observed_month\ngold mirror corset,120,HIGH,0.82,product,material_visual_focus,stage_performance,84,96,2026-06`;

function splitCsvLine(line: string) {
  const result: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      result.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }
  result.push(value.trim());
  return result;
}

function csvToPayload(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV должен содержать header и минимум одну строку.');
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
  return { ...SAMPLE_PAYLOAD, source_kind: 'csv_paste', rows };
}

export function AdminKeywordMetricsImportForm() {
  const [payload, setPayload] = useState(JSON.stringify(SAMPLE_PAYLOAD, null, 2));
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const parsedCount = useMemo(() => {
    try {
      const parsed = payload.trim().startsWith('{') ? JSON.parse(payload) : csvToPayload(payload);
      return Array.isArray(parsed.rows) ? parsed.rows.length : 0;
    } catch {
      return 0;
    }
  }, [payload]);

  async function submitImport() {
    setIsLoading(true);
    setError('');
    setResult(null);

    let body;
    try {
      body = payload.trim().startsWith('{') ? JSON.parse(payload) : csvToPayload(payload);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Данные не читаются. Вставь JSON payload или CSV с header-строкой.');
      return;
    }

    try {
      const response = await fetch('/api/admin/seo-engine/keyword-metrics/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || 'Import failed');
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  }

  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between mb-5">
      <div>
        <div className="eyebrow-gold mb-2">Импорт keyword metrics</div>
        <div className="text-[13px] leading-relaxed text-[var(--bone-dim)]">Вставь JSON payload или CSV с header-строкой. CSV будет автоматически превращён в rows для API.</div>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">{parsedCount} rows</div>
    </div>

    <textarea
      value={payload}
      onChange={(event) => setPayload(event.target.value)}
      spellCheck={false}
      className="min-h-[360px] w-full rounded-xl border border-[rgba(216,214,211,.12)] bg-black/35 p-4 font-mono text-[12px] leading-relaxed text-bone outline-none focus:border-[rgba(212,178,106,.45)]"
    />

    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" onClick={submitImport} disabled={isLoading} className="btn-gold inline-flex items-center gap-2 disabled:opacity-60"><UploadCloud size={15} />{isLoading ? 'Импортирую…' : 'Импортировать metrics'}</button>
      <button type="button" onClick={() => setPayload(JSON.stringify(SAMPLE_PAYLOAD, null, 2))} className="btn-ghost">JSON пример</button>
      <button type="button" onClick={() => setPayload(CSV_TEMPLATE)} className="btn-ghost">CSV пример</button>
    </div>

    {error ? <div className="mt-4 rounded-xl border border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)] p-3 text-[13px] text-[var(--ruby-soft)]">{error}</div> : null}
    {result ? <div className="mt-4 rounded-xl border border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)] p-3 text-[13px] leading-relaxed text-[#a9dfbd]">Импорт готов: accepted {result.accepted_rows}, rejected {result.rejected_rows}, batch {result.import_batch_id}</div> : null}
  </div>;
}
