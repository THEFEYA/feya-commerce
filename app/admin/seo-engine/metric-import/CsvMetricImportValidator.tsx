'use client';

import { useMemo, useState } from 'react';

const REQUIRED_COLUMNS = ['keyword', 'region', 'language', 'metric_source', 'avg_monthly_searches', 'competition', 'last_checked'];
const ALLOWED_SOURCES = ['google_ads', 'csv_manual', 'erank', 'dataforseo', 'google_trends', 'search_console_future'];
const ALLOWED_COMPETITION = ['LOW', 'MEDIUM', 'HIGH'];

type CsvRow = Record<string, string>;
type RowStatus = 'valid' | 'blocked' | 'warning';

type ValidationResult = {
  rowNumber: number;
  keyword: string;
  status: RowStatus;
  issues: string[];
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] as CsvRow[] };

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = cells[index] || '';
      return row;
    }, {});
  });

  return { headers, rows };
}

function isNonNegativeNumber(value: string) {
  if (value.trim() === '') return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

function validateRow(row: CsvRow, rowNumber: number): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  REQUIRED_COLUMNS.forEach((column) => {
    if (!row[column]?.trim()) issues.push(`нет ${column}`);
  });

  if (row.metric_source && !ALLOWED_SOURCES.includes(row.metric_source)) {
    issues.push('неизвестный metric_source');
  }

  if (row.language && row.language !== 'en') {
    issues.push('language должен быть en');
  }

  if (row.avg_monthly_searches && !isNonNegativeNumber(row.avg_monthly_searches)) {
    issues.push('avg_monthly_searches должен быть числом >= 0');
  }

  if (row.competition && !ALLOWED_COMPETITION.includes(row.competition.toUpperCase())) {
    issues.push('competition должен быть LOW / MEDIUM / HIGH');
  }

  if (row.metric_source === 'google_trends') {
    warnings.push('Google Trends не заменяет search volume');
  }

  if (!row.low_bid && !row.high_bid) {
    warnings.push('нет bid-данных: scoring будет менее точным');
  }

  if (issues.length) {
    return { rowNumber, keyword: row.keyword || '—', status: 'blocked', issues };
  }

  if (warnings.length) {
    return { rowNumber, keyword: row.keyword || '—', status: 'warning', issues: warnings };
  }

  return { rowNumber, keyword: row.keyword || '—', status: 'valid', issues: ['готово к scoring'] };
}

function statusText(status: RowStatus) {
  if (status === 'valid') return 'валидно';
  if (status === 'warning') return 'проверить';
  return 'блокер';
}

function statusClass(status: RowStatus) {
  if (status === 'valid') return 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]';
  if (status === 'warning') return 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]';
  return 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]';
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
    reader.onload = () => setText(String(reader.result || ''));
    reader.readAsText(file);
  }

  return <div className="space-y-4">
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <div>
        <div className="text-bone text-[14px] mb-2">Вставь CSV или загрузи файл</div>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="keyword,bucket,region,language,metric_source,avg_monthly_searches,competition,last_checked..." className="min-h-[220px] w-full rounded-xl border border-[rgba(216,214,211,.12)] bg-black/25 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)] outline-none focus:border-[rgba(212,178,106,.45)]" />
        <input type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0] || null)} className="mt-3 text-[11px] text-[var(--bone-dim)]" />
      </div>
      <div className="space-y-2">
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Строк</div><div className="mt-1 text-bone text-[18px]">{results.length}</div></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-[rgba(108,183,138,.25)] bg-[rgba(108,183,138,.06)] p-3"><div className="text-[10px] text-[#a9dfbd]">валидно</div><div className="text-bone text-[16px]">{validCount}</div></div>
          <div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.06)] p-3"><div className="text-[10px] text-[var(--gold-warm)]">проверить</div><div className="text-bone text-[16px]">{warningCount}</div></div>
          <div className="rounded-xl border border-[rgba(196,64,88,.25)] bg-[rgba(160,32,56,.06)] p-3"><div className="text-[10px] text-[var(--ruby-soft)]">блокер</div><div className="text-bone text-[16px]">{blockedCount}</div></div>
        </div>
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Это только preview validation. Даже валидные строки не записываются в Supabase.</div>
      </div>
    </div>

    {missingHeaders.length ? <div className="rounded-xl border border-[rgba(196,64,88,.30)] bg-[rgba(160,32,56,.08)] p-3 text-[11px] leading-relaxed text-[var(--ruby-soft)]">В CSV не хватает обязательных колонок: {missingHeaders.join(', ')}</div> : null}

    <div className="max-h-[420px] overflow-auto rounded-xl border border-[rgba(216,214,211,.10)]">
      <div className="grid grid-cols-[70px_1fr_110px_1.3fr] gap-3 px-3 py-2 border-b border-[rgba(216,214,211,.10)] bg-black/20 text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] sticky top-0 z-10"><div>Строка</div><div>Ключ</div><div>Статус</div><div>Причина</div></div>
      <div className="divide-y divide-[rgba(216,214,211,.08)]">
        {results.length ? results.map((row) => <div key={`${row.rowNumber}-${row.keyword}`} className="grid grid-cols-[70px_1fr_110px_1.3fr] gap-3 px-3 py-2 text-[11px] leading-relaxed"><div className="text-[var(--smoke)]">{row.rowNumber}</div><div className="text-bone">{row.keyword}</div><div><span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${statusClass(row.status)}`}>{statusText(row.status)}</span></div><div className="text-[var(--bone-dim)]">{row.issues.join(' · ')}</div></div>) : <div className="p-3 text-[12px] text-[var(--bone-dim)]">Пока CSV не загружен.</div>}
      </div>
    </div>
  </div>;
}
