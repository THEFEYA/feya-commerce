'use client';

import { useMemo, useState } from 'react';

const REQUIRED_COLUMNS = ['keyword', 'region', 'language', 'metric_source', 'avg_monthly_searches', 'competition', 'last_checked'];
const ALLOWED_SOURCES = ['google_ads', 'google_keyword_planner', 'csv_manual', 'erank', 'dataforseo', 'google_trends', 'search_console_future'];
const ALLOWED_COMPETITION = ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'];

type CsvRow = Record<string, string>;
type RowStatus = 'valid' | 'blocked' | 'warning';
type ParsedCsv = { headers: string[]; rows: CsvRow[]; source: 'our_csv' | 'google_keyword_planner' | 'empty'; detectedAtLine: number };

type ValidationResult = { rowNumber: number; keyword: string; status: RowStatus; issues: string[] };

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') { current += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === delimiter && !quoted) { cells.push(current.trim()); current = ''; continue; }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function cleanNumber(value: string) {
  const cleaned = String(value || '').replaceAll('"', '').replaceAll('\u202f', '').replaceAll(' ', '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  return cleaned;
}

function normalizeCompetition(value: string) {
  const text = String(value || '').trim().toLowerCase();
  if (['high', 'высокий', 'высокая'].includes(text)) return 'HIGH';
  if (['medium', 'средний', 'средняя'].includes(text)) return 'MEDIUM';
  if (['low', 'низкий', 'низкая'].includes(text)) return 'LOW';
  return 'UNKNOWN';
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

function normalizeGoogleRow(row: CsvRow): CsvRow {
  const keyword = row.Keyword || row.keyword || '';
  return {
    keyword,
    region: 'US',
    language: 'en',
    metric_source: 'google_keyword_planner',
    avg_monthly_searches: cleanNumber(row['Avg. monthly searches']),
    competition: normalizeCompetition(row.Competition),
    competition_index: cleanNumber(row['Competition (indexed value)']),
    low_bid: cleanNumber(row['Top of page bid (low range)']),
    high_bid: cleanNumber(row['Top of page bid (high range)']),
    trend: row['Изменение за год'] || '',
    seasonality: [
      row['Searches: Jun 2025'], row['Searches: Jul 2025'], row['Searches: Aug 2025'], row['Searches: Sep 2025'], row['Searches: Oct 2025'], row['Searches: Nov 2025'],
      row['Searches: Dec 2025'], row['Searches: Jan 2026'], row['Searches: Feb 2026'], row['Searches: Mar 2026'], row['Searches: Apr 2026'], row['Searches: May 2026'],
    ].filter(Boolean).join('|'),
    last_checked: todayIso(),
    notes: `google_export_currency=${row.Currency || ''}; qoq=${row['Изменение за квартал'] || ''}; yoy=${row['Изменение за год'] || ''}`,
  };
}

function parseCsv(text: string): ParsedCsv {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [], source: 'empty', detectedAtLine: 0 };
  const googleHeaderIndex = lines.findIndex((line) => line.includes('Keyword\t') && line.includes('Avg. monthly searches'));
  const delimiter = googleHeaderIndex >= 0 ? '\t' : ',';
  const headerIndex = googleHeaderIndex >= 0 ? googleHeaderIndex : 0;
  const rawHeaders = parseDelimitedLine(lines[headerIndex], delimiter).map((header) => header.trim().replace(/^\uFEFF/, ''));
  const rawRows = lines.slice(headerIndex + 1).map((line) => {
    const cells = parseDelimitedLine(line, delimiter);
    return rawHeaders.reduce<CsvRow>((row, header, index) => { row[header] = cells[index] || ''; return row; }, {});
  });
  if (googleHeaderIndex >= 0) {
    const rows = rawRows.map(normalizeGoogleRow).filter((row) => row.keyword);
    const headers = ['keyword', 'region', 'language', 'metric_source', 'avg_monthly_searches', 'competition', 'competition_index', 'low_bid', 'high_bid', 'trend', 'seasonality', 'last_checked', 'notes'];
    return { headers, rows, source: 'google_keyword_planner', detectedAtLine: googleHeaderIndex + 1 };
  }
  return { headers: rawHeaders, rows: rawRows, source: 'our_csv', detectedAtLine: 1 };
}

function isNonNegativeNumber(value: string) {
  if (value.trim() === '') return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

function validateRow(row: CsvRow, rowNumber: number): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  REQUIRED_COLUMNS.forEach((column) => { if (!row[column]?.trim()) issues.push(`нет ${column}`); });
  if (row.metric_source && !ALLOWED_SOURCES.includes(row.metric_source)) issues.push('неизвестный metric_source');
  if (row.language && row.language !== 'en') issues.push('language должен быть en');
  if (row.avg_monthly_searches && !isNonNegativeNumber(row.avg_monthly_searches)) issues.push('avg_monthly_searches должен быть числом >= 0');
  if (row.competition && !ALLOWED_COMPETITION.includes(row.competition.toUpperCase())) issues.push('competition должен быть LOW / MEDIUM / HIGH / UNKNOWN');
  if (row.competition === 'UNKNOWN') warnings.push('competition unknown: можно оставить как support/hold');
  if (row.metric_source === 'google_trends') warnings.push('Google Trends не заменяет search volume');
  if (!row.low_bid && !row.high_bid) warnings.push('нет bid-данных: scoring будет менее точным');
  if (issues.length) return { rowNumber, keyword: row.keyword || '—', status: 'blocked', issues };
  if (warnings.length) return { rowNumber, keyword: row.keyword || '—', status: 'warning', issues: warnings };
  return { rowNumber, keyword: row.keyword || '—', status: 'valid', issues: ['готово к scoring'] };
}

function statusText(status: RowStatus) { if (status === 'valid') return 'валидно'; if (status === 'warning') return 'проверить'; return 'блокер'; }
function statusClass(status: RowStatus) { if (status === 'valid') return 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'; if (status === 'warning') return 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'; return 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'; }

function toCsv(rows: CsvRow[]) {
  const headers = ['keyword', 'region', 'language', 'metric_source', 'avg_monthly_searches', 'competition', 'competition_index', 'low_bid', 'high_bid', 'trend', 'seasonality', 'last_checked', 'notes'];
  const esc = (value: string) => /[",\n\r]/.test(value || '') ? `"${String(value || '').replaceAll('"', '""')}"` : String(value || '');
  return `${headers.join(',')}\n${rows.map((row) => headers.map((header) => esc(row[header])).join(',')).join('\n')}\n`;
}

export function CsvMetricImportValidator() {
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseCsv(text), [text]);
  const missingHeaders = REQUIRED_COLUMNS.filter((column) => parsed.headers.length && !parsed.headers.includes(column));
  const results = useMemo(() => parsed.rows.map((row, index) => validateRow(row, index + 2)), [parsed.rows]);
  const validCount = results.filter((row) => row.status === 'valid').length;
  const warningCount = results.filter((row) => row.status === 'warning').length;
  const blockedCount = results.filter((row) => row.status === 'blocked').length;

  function handleFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);
      const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
      setText(new TextDecoder(encoding).decode(buffer));
    };
    reader.readAsArrayBuffer(file);
  }

  function downloadNormalized() {
    const blob = new Blob([toCsv(parsed.rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `thefeya-normalized-google-keywords-${todayIso()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  }

  return <div className="space-y-4">
    <div className="grid lg:grid-cols-[1fr_340px] gap-4">
      <div>
        <div className="text-bone text-[14px] mb-2">Вставь наш CSV или загрузи сырой Google Keyword Planner CSV</div>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Можно загрузить файл Keyword Stats ...csv прямо из Google." className="min-h-[220px] w-full rounded-xl border border-[rgba(216,214,211,.12)] bg-black/25 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)] outline-none focus:border-[rgba(212,178,106,.45)]" />
        <div className="mt-3 flex flex-wrap items-center gap-3"><input type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0] || null)} className="text-[11px] text-[var(--bone-dim)]" />{parsed.rows.length ? <button type="button" onClick={downloadNormalized} className="btn-ghost">Скачать нормализованный CSV</button> : null}</div>
      </div>
      <div className="space-y-2">
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Источник</div><div className="mt-1 text-bone text-[14px]">{parsed.source === 'google_keyword_planner' ? 'Google Keyword Planner' : parsed.source === 'our_csv' ? 'TheFEYA CSV' : '—'}</div></div>
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Строк</div><div className="mt-1 text-bone text-[18px]">{results.length}</div></div>
        <div className="grid grid-cols-3 gap-2"><div className="rounded-xl border border-[rgba(108,183,138,.25)] bg-[rgba(108,183,138,.06)] p-3"><div className="text-[10px] text-[#a9dfbd]">валидно</div><div className="text-bone text-[16px]">{validCount}</div></div><div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.06)] p-3"><div className="text-[10px] text-[var(--gold-warm)]">проверить</div><div className="text-bone text-[16px]">{warningCount}</div></div><div className="rounded-xl border border-[rgba(196,64,88,.25)] bg-[rgba(160,32,56,.06)] p-3"><div className="text-[10px] text-[var(--ruby-soft)]">блокер</div><div className="text-bone text-[16px]">{blockedCount}</div></div></div>
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Google export автоматически переводится в наш формат: keyword, volume, competition, bids, trend, seasonality, source, date.</div>
      </div>
    </div>
    {missingHeaders.length ? <div className="rounded-xl border border-[rgba(196,64,88,.30)] bg-[rgba(160,32,56,.08)] p-3 text-[11px] leading-relaxed text-[var(--ruby-soft)]">В CSV не хватает обязательных колонок: {missingHeaders.join(', ')}</div> : null}
    <div className="max-h-[420px] overflow-auto rounded-xl border border-[rgba(216,214,211,.10)]"><div className="grid grid-cols-[70px_1fr_110px_1.3fr] gap-3 px-3 py-2 border-b border-[rgba(216,214,211,.10)] bg-black/20 text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] sticky top-0 z-10"><div>Строка</div><div>Ключ</div><div>Статус</div><div>Причина</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{results.length ? results.slice(0, 400).map((row) => <div key={`${row.rowNumber}-${row.keyword}`} className="grid grid-cols-[70px_1fr_110px_1.3fr] gap-3 px-3 py-2 text-[11px] leading-relaxed"><div className="text-[var(--smoke)]">{row.rowNumber}</div><div className="text-bone">{row.keyword}</div><div><span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${statusClass(row.status)}`}>{statusText(row.status)}</span></div><div className="text-[var(--bone-dim)]">{row.issues.join(' · ')}</div></div>) : <div className="p-3 text-[12px] text-[var(--bone-dim)]">Пока CSV не загружен.</div>}</div></div>
  </div>;
}
