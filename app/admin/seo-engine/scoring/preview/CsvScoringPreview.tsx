'use client';

import { useMemo, useState } from 'react';

type CsvRow = Record<string, string>;
type Role = 'primary' | 'secondary' | 'supporting' | 'long_tail' | 'hold' | 'reject';

type ScoreResult = {
  keyword: string;
  score: number;
  role: Role;
  blockers: string[];
  notes: string[];
};

const REQUIRED = ['keyword', 'region', 'language', 'metric_source', 'avg_monthly_searches', 'competition', 'last_checked'];
const SOURCES = ['google_ads', 'csv_manual', 'erank', 'dataforseo', 'google_trends', 'search_console_future'];
const COMPETITION = ['LOW', 'MEDIUM', 'HIGH'];

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
  if (!lines.length) return [] as CsvRow[];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = cells[index] || '';
      return row;
    }, {});
  });
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function scoreDemand(volume: number | null) {
  if (volume == null) return 0;
  if (volume >= 1000) return 20;
  if (volume >= 500) return 17;
  if (volume >= 200) return 14;
  if (volume >= 50) return 10;
  if (volume > 0) return 6;
  return 2;
}

function scoreCompetition(value: string) {
  const competition = value.toUpperCase();
  if (competition === 'LOW') return 12;
  if (competition === 'MEDIUM') return 8;
  if (competition === 'HIGH') return 4;
  return 0;
}

function scoreProductTruth(bucket: string, reason: string) {
  const text = `${bucket} ${reason}`.toLowerCase();
  if (/bodysuit|panties|horns|silicone|holographic|red/.test(text)) return 0;
  if (/component|detail|product_fact|shoulder|bracer|armor|choker/.test(text)) return 25;
  if (/material|color|gold|metallic|reflective|glossy/.test(text)) return 21;
  if (/long/.test(text)) return 20;
  if (/style|persona|event/.test(text)) return 17;
  return 14;
}

function scoreBuyerIntent(bucket: string, placement: string) {
  const text = `${bucket} ${placement}`.toLowerCase();
  if (/title|h1|product|card|alt/.test(text)) return 15;
  if (/body|faq|long/.test(text)) return 12;
  if (/collection|landing|links/.test(text)) return 9;
  return 7;
}

function scoreTrend(row: CsvRow) {
  const trend = `${row.trend || ''} ${row.seasonality || ''}`.toLowerCase();
  if (/rising|growth|peak|festival|burning|summer|halloween/.test(trend)) return 10;
  if (/stable|season/.test(trend)) return 7;
  if (/falling|decline/.test(trend)) return 3;
  return 5;
}

function scorePlacement(placement: string) {
  const text = placement.toLowerCase();
  if (/title|h1/.test(text)) return 8;
  if (/body|faq|meta|alt/.test(text)) return 7;
  if (/collection|links/.test(text)) return 6;
  return 4;
}

function validate(row: CsvRow) {
  const blockers: string[] = [];
  REQUIRED.forEach((column) => {
    if (!row[column]?.trim()) blockers.push(`нет ${column}`);
  });
  if (row.metric_source && !SOURCES.includes(row.metric_source)) blockers.push('неизвестный metric_source');
  if (row.language && row.language !== 'en') blockers.push('language должен быть en');
  if (row.avg_monthly_searches && (numberValue(row.avg_monthly_searches) == null || Number(row.avg_monthly_searches) < 0)) blockers.push('avg_monthly_searches должен быть числом >= 0');
  if (row.competition && !COMPETITION.includes(row.competition.toUpperCase())) blockers.push('competition должен быть LOW / MEDIUM / HIGH');
  return blockers;
}

function roleFor(score: number, row: CsvRow, blockers: string[]): Role {
  if (blockers.length) return 'reject';
  if ((row.bucket || '').toLowerCase().includes('long')) return 'long_tail';
  if (score >= 85) return 'primary';
  if (score >= 70) return 'secondary';
  if (score >= 55) return 'supporting';
  return 'hold';
}

function scoreRow(row: CsvRow): ScoreResult {
  const blockers = validate(row);
  const volume = numberValue(row.avg_monthly_searches || '');
  const productTruth = scoreProductTruth(row.bucket || '', row.reason || '');
  const buyerIntent = scoreBuyerIntent(row.bucket || '', row.suggested_placement || '');
  const demand = scoreDemand(volume);
  const competition = scoreCompetition(row.competition || '');
  const trend = scoreTrend(row);
  const placement = scorePlacement(row.suggested_placement || '');
  const cannibalSafety = 6;
  const score = blockers.length ? 0 : productTruth + buyerIntent + demand + competition + trend + placement + cannibalSafety;
  const notes = [
    `truth ${productTruth}`,
    `intent ${buyerIntent}`,
    `demand ${demand}`,
    `competition ${competition}`,
    `trend ${trend}`,
    `placement ${placement}`,
    'cannibal safety 6 provisional',
  ];

  if (!row.low_bid && !row.high_bid) notes.push('нет bid-данных');
  if (row.metric_source === 'google_trends') notes.push('Trends не заменяет volume');

  return { keyword: row.keyword || '—', score, role: roleFor(score, row, blockers), blockers, notes };
}

function roleLabel(role: Role) {
  const labels: Record<Role, string> = {
    primary: 'главный',
    secondary: 'вторичный',
    supporting: 'поддержка',
    long_tail: 'long-tail',
    hold: 'удержать',
    reject: 'исключить',
  };
  return labels[role];
}

function roleClass(role: Role) {
  if (role === 'primary' || role === 'secondary') return 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]';
  if (role === 'reject') return 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]';
  return 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]';
}

export function CsvScoringPreview() {
  const [text, setText] = useState('');
  const rows = useMemo(() => parseCsv(text), [text]);
  const results = useMemo(() => rows.map(scoreRow).sort((a, b) => b.score - a.score), [rows]);
  const primaryCount = results.filter((row) => row.role === 'primary').length;
  const secondaryCount = results.filter((row) => row.role === 'secondary').length;
  const rejectedCount = results.filter((row) => row.role === 'reject').length;

  function handleFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.readAsText(file);
  }

  return <div className="space-y-4">
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <div>
        <div className="text-bone text-[14px] mb-2">Вставь CSV с заполненными метриками</div>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="keyword,bucket,reason,suggested_placement,region,language,metric_source,avg_monthly_searches,competition,last_checked..." className="min-h-[220px] w-full rounded-xl border border-[rgba(216,214,211,.12)] bg-black/25 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)] outline-none focus:border-[rgba(212,178,106,.45)]" />
        <input type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0] || null)} className="mt-3 text-[11px] text-[var(--bone-dim)]" />
      </div>
      <div className="space-y-2">
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Строк</div><div className="mt-1 text-bone text-[18px]">{results.length}</div></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-[rgba(108,183,138,.25)] bg-[rgba(108,183,138,.06)] p-3"><div className="text-[10px] text-[#a9dfbd]">главные</div><div className="text-bone text-[16px]">{primaryCount}</div></div>
          <div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.06)] p-3"><div className="text-[10px] text-[var(--gold-warm)]">вторичные</div><div className="text-bone text-[16px]">{secondaryCount}</div></div>
          <div className="rounded-xl border border-[rgba(196,64,88,.25)] bg-[rgba(160,32,56,.06)] p-3"><div className="text-[10px] text-[var(--ruby-soft)]">исключить</div><div className="text-bone text-[16px]">{rejectedCount}</div></div>
        </div>
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Это preview scoring. Балл provisional: anti-cannibalization пока не подключён к соседним товарам, поэтому финальное утверждение ещё заблокировано.</div>
      </div>
    </div>

    <div className="max-h-[480px] overflow-auto rounded-xl border border-[rgba(216,214,211,.10)]">
      <div className="grid grid-cols-[1fr_80px_120px_1.4fr] gap-3 px-3 py-2 border-b border-[rgba(216,214,211,.10)] bg-black/20 text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] sticky top-0 z-10"><div>Ключ</div><div>Балл</div><div>Роль</div><div>Почему</div></div>
      <div className="divide-y divide-[rgba(216,214,211,.08)]">
        {results.length ? results.map((row) => <div key={`${row.keyword}-${row.score}`} className="grid grid-cols-[1fr_80px_120px_1.4fr] gap-3 px-3 py-2 text-[11px] leading-relaxed"><div className="text-bone">{row.keyword}</div><div className="text-[var(--gold-warm)]">{row.score}</div><div><span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${roleClass(row.role)}`}>{roleLabel(row.role)}</span></div><div className="text-[var(--bone-dim)]">{row.blockers.length ? row.blockers.join(' · ') : row.notes.join(' · ')}</div></div>) : <div className="p-3 text-[12px] text-[var(--bone-dim)]">Пока CSV не загружен.</div>}
      </div>
    </div>
  </div>;
}
