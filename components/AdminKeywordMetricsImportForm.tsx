// @ts-nocheck
'use client';

import { useMemo, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { parseKeywordMetricCsv } from '@/lib/searchMetricCsv';
import { demandReasonLabel } from '@/lib/searchDemandBridge';

const SAMPLE_PAYLOAD = {
  dry_run: true,
  rows: [{ keyword: 'mirror corset', metric_source: 'google_ads_csv', source_ref: '',
    region: '', language: '', network: '', period_start: '', period_end: '', last_checked: '',
    avg_monthly_searches: '', competition: '', competition_index: '', low_bid: '', high_bid: '', bid_currency_code: '' }],
};
const CSV_TEMPLATE = `keyword,metric_source,source_ref,region,language,network,period_start,period_end,last_checked,avg_monthly_searches,competition,competition_index,low_bid,high_bid,bid_currency_code\nmirror corset,google_ads_csv,,,,,,,,,,,,,`;
function reviewInput(text: string) {
  const parsed = text.trim().startsWith('{') ? JSON.parse(text) : { csv_text: text };
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Нужен JSON объект или CSV.');
  return { ...parsed, dry_run: true };
}

export function AdminKeywordMetricsImportForm() {
  const [payload, setPayload] = useState(JSON.stringify(SAMPLE_PAYLOAD, null, 2));
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const parsedCount = useMemo(() => {
    try {
      const parsed = reviewInput(payload);
      return Array.isArray(parsed.rows) ? parsed.rows.length : typeof parsed.csv_text === 'string' ? parseKeywordMetricCsv(parsed.csv_text).rows.length : 0;
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
      body = reviewInput(payload);
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
      if (!response.ok || !json.ok) throw new Error(json.error || json.errors?.join(' · ') || 'Проверь формат данных.');
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
        <div className="eyebrow-gold mb-2">Проверка keyword metrics</div>
        <div className="text-[13px] leading-relaxed text-[var(--bone-dim)]">Вставь исходный CSV или JSON. Проверь страну, язык, сеть, период и дату получения. Шаблоны не содержат измеренных значений. Эта форма проверяет данные без сохранения.</div>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">{parsedCount} rows</div>
    </div>

    <textarea
      value={payload}
      onChange={(event) => setPayload(event.target.value)}
      spellCheck={false}
      aria-label="CSV или JSON с метриками"
      className="min-h-[360px] w-full rounded-xl border border-[rgba(216,214,211,.12)] bg-black/35 p-4 font-mono text-[12px] leading-relaxed text-bone outline-none focus:border-[rgba(212,178,106,.45)]"
    />

    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" onClick={submitImport} disabled={isLoading} className="btn-gold inline-flex items-center gap-2 disabled:opacity-60"><UploadCloud size={15} />{isLoading ? 'Проверяю…' : 'Проверить данные'}</button>
      <button type="button" onClick={() => setPayload(JSON.stringify(SAMPLE_PAYLOAD, null, 2))} className="btn-ghost">JSON шаблон</button>
      <button type="button" onClick={() => setPayload(CSV_TEMPLATE)} className="btn-ghost">CSV шаблон</button>
    </div>

    {error ? <div className="mt-4 rounded-xl border border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)] p-3 text-[13px] text-[var(--ruby-soft)]">{error}</div> : null}
    {result ? <div className="mt-4 rounded-xl border border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)] p-3 text-[13px] leading-relaxed text-[#a9dfbd]">Проверка завершена. Строк: {result.report.rows.length}; прошли проверку контекста: {result.observations.length}; требуют проверки: {result.report.rows.filter((row) => !row.usable_for_current_demand_decision).length}. Сохранено: 0. Роли ключей не назначены.
      {[...new Set(result.report.rows.flatMap((row) => row.reason_codes))].map((reason) => <div key={String(reason)}>{demandReasonLabel(String(reason))}</div>)}</div> : null}
  </div>;
}
