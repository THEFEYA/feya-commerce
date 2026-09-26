'use client';

import { useMemo, useState } from 'react';
import { useKeywordMetricCsv } from '@/lib/useKeywordMetricCsv';

import { metricRowsToCsv } from '@/lib/searchMetricCsv';
import { buildDemandReview, demandReasonLabel, DEFAULT_DEMAND_CONTEXT } from '@/lib/searchDemandBridge';

const REQUIRED_COLUMNS = ['keyword'];
type RowStatus = 'valid' | 'blocked' | 'warning';
function todayIso() { return new Date().toISOString().slice(0, 10); }

function statusText(status: RowStatus) { if (status === 'valid') return 'валидно'; if (status === 'warning') return 'проверить'; return 'блокер'; }
function statusClass(status: RowStatus) { if (status === 'valid') return 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'; if (status === 'warning') return 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'; return 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'; }

export function CsvMetricImportValidator() {
  const [text, setText] = useState('');
  const parsed = useKeywordMetricCsv(text);
  const missingHeaders = [...REQUIRED_COLUMNS.filter((column) => parsed.headers.length && !parsed.headers.includes(column)), ...parsed.errors];
  const results = useMemo(() => buildDemandReview(parsed.rows, {...DEFAULT_DEMAND_CONTEXT, now: new Date()}).rows.map((row) => ({ rowNumber: row.row_number, keyword: row.keyword || '—', status: row.status, issues: row.reason_codes.length ? row.reason_codes.map(demandReasonLabel) : [row.duplicate_of !== null ? `Повтор строки ${row.duplicate_of}; спрос повторно не учитывается` : 'метрики подготовлены для проверки интента; записи в базу нет'] })), [parsed.rows]);
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
    const blob = new Blob([metricRowsToCsv(parsed.rows)], { type: 'text/csv;charset=utf-8' });
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
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Импорт сохраняет исходные значения и диапазоны. Регион, язык, сеть, период и дата должны подтверждаться экспортом; неизвестные данные требуют проверки. Рекламная конкуренция не является сложностью SEO.</div>
      </div>
    </div>
    {missingHeaders.length ? <div className="rounded-xl border border-[rgba(196,64,88,.30)] bg-[rgba(160,32,56,.08)] p-3 text-[11px] leading-relaxed text-[var(--ruby-soft)]">CSV требует проверки: {missingHeaders.join(', ')}</div> : null}
    <div className="max-h-[420px] overflow-auto rounded-xl border border-[rgba(216,214,211,.10)]"><div className="grid grid-cols-[70px_1fr_110px_1.3fr] gap-3 px-3 py-2 border-b border-[rgba(216,214,211,.10)] bg-black/20 text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] sticky top-0 z-10"><div>Строка</div><div>Ключ</div><div>Статус</div><div>Причина</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{results.length ? results.slice(0, 400).map((row) => <div key={`${row.rowNumber}-${row.keyword}`} className="grid grid-cols-[70px_1fr_110px_1.3fr] gap-3 px-3 py-2 text-[11px] leading-relaxed"><div className="text-[var(--smoke)]">{row.rowNumber}</div><div className="text-bone">{row.keyword}</div><div><span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${statusClass(row.status)}`}>{statusText(row.status)}</span></div><div className="text-[var(--bone-dim)]">{row.issues.join(' · ')}</div></div>) : <div className="p-3 text-[12px] text-[var(--bone-dim)]">Пока CSV не загружен.</div>}</div></div>
  </div>;
}
