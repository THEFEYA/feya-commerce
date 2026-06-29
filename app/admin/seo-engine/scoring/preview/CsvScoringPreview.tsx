'use client';

import { useMemo, useState } from 'react';

type CsvRow = Record<string, string>;
type Role = 'primary' | 'secondary' | 'supporting' | 'long_tail' | 'hold' | 'reject';
type ScoreResult = { keyword: string; score: number; role: Role; blockers: string[]; notes: string[] };

const REQUIRED = ['keyword', 'region', 'language', 'metric_source', 'avg_monthly_searches', 'competition', 'last_checked'];
const SOURCES = ['google_ads', 'google_keyword_planner', 'csv_manual', 'erank', 'dataforseo', 'google_trends', 'search_console_future'];
const COMPETITION = ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'];
const EXPORT_COLUMNS = ['keyword','score','role','role_label','reason','region','language','metric_source','avg_monthly_searches','competition','competition_index','low_bid','high_bid','trend','seasonality','last_checked','notes'];

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') { current += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { cells.push(current.trim()); current = ''; continue; }
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
    return headers.reduce<CsvRow>((row, header, index) => { row[header] = cells[index] || ''; return row; }, {});
  });
}

function numberValue(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function scoreDemand(volume: number | null) { if (volume == null) return 0; if (volume >= 10000) return 20; if (volume >= 3000) return 18; if (volume >= 1000) return 16; if (volume >= 500) return 14; if (volume >= 200) return 12; if (volume >= 50) return 9; if (volume > 0) return 5; return 1; }
function scoreCompetition(value: string) { const competition = value.toUpperCase(); if (competition === 'LOW') return 12; if (competition === 'MEDIUM') return 8; if (competition === 'HIGH') return 4; return 3; }
function scoreCommercial(row: CsvRow) { const low = numberValue(row.low_bid || ''); const high = numberValue(row.high_bid || ''); if ((high || 0) > 50) return 10; if ((high || 0) > 15) return 8; if ((low || 0) > 0 || (high || 0) > 0) return 6; return 3; }
function scoreIntent(keyword: string) { const text = keyword.toLowerCase(); if (/buy|shop|for sale|custom|handmade|price|order/.test(text)) return 15; if (/outfit|costume|wear|clothing|armor|harness|bodysuit|mask|headpiece/.test(text)) return 12; if (/ideas|inspiration|how to|diy|pattern/.test(text)) return 5; return 8; }
function scoreTruth(keyword: string) { const text = keyword.toLowerCase(); if (/motorcycle|tactical|airsoft|minecraft|fortnite|lego|wall[- ]?e|kids|child|baby|dog|necklace|pearl|diamond|wedding/.test(text)) return 0; if (/armor|shoulder|bracer|choker|collar|festival|rave|stage|performance|burning man|robot|warrior|futuristic|metallic|gold|silver|outfit|costume/.test(text)) return 25; return 12; }
function scoreTrend(row: CsvRow) { const trend = `${row.trend || ''} ${row.seasonality || ''} ${row.notes || ''}`.toLowerCase(); if (/rising|growth|peak|burning|festival|halloween|summer|aug|sep|oct/.test(trend)) return 10; if (/stable|season/.test(trend)) return 7; if (/decline|falling|-100|-90|-80/.test(trend)) return 3; return 5; }
function scorePlacement(row: CsvRow) { if (row.suggested_placement) { const text = row.suggested_placement.toLowerCase(); if (/title|h1/.test(text)) return 8; if (/body|faq|meta|alt/.test(text)) return 7; if (/collection|links/.test(text)) return 6; } return 5; }
function validate(row: CsvRow) {
  const blockers: string[] = [];
  REQUIRED.forEach((column) => { if (!row[column]?.trim()) blockers.push(`нет ${column}`); });
  if (row.metric_source && !SOURCES.includes(row.metric_source)) blockers.push('неизвестный metric_source');
  if (row.language && row.language !== 'en') blockers.push('language должен быть en');
  if (row.avg_monthly_searches && (numberValue(row.avg_monthly_searches) == null || Number(row.avg_monthly_searches) < 0)) blockers.push('avg_monthly_searches должен быть числом >= 0');
  if (row.competition && !COMPETITION.includes(row.competition.toUpperCase())) blockers.push('competition должен быть LOW / MEDIUM / HIGH / UNKNOWN');
  return blockers;
}
function roleFor(score: number, row: CsvRow, blockers: string[]): Role { if (blockers.length) return 'reject'; const keyword = (row.keyword || '').toLowerCase(); if (/diy|pattern|template|kids|motorcycle|tactical|necklace|pearl|diamond|amazon|target|walmart|ikea/.test(keyword)) return 'reject'; if (/how to|ideas|inspiration/.test(keyword)) return 'hold'; if ((row.competition || '').toUpperCase() === 'UNKNOWN') return score >= 70 ? 'supporting' : 'hold'; if (/buy|shop|for sale|custom|price|order/.test(keyword)) return score >= 70 ? 'secondary' : 'supporting'; if (score >= 82) return 'primary'; if (score >= 68) return 'secondary'; if (score >= 52) return 'supporting'; return 'hold'; }
function scoreRow(row: CsvRow): ScoreResult {
  const blockers = validate(row);
  const keyword = row.keyword || '—';
  const volume = numberValue(row.avg_monthly_searches || '');
  const truth = scoreTruth(keyword);
  const intent = scoreIntent(keyword);
  const demand = scoreDemand(volume);
  const competition = scoreCompetition(row.competition || '');
  const commercial = scoreCommercial(row);
  const trend = scoreTrend(row);
  const placement = scorePlacement(row);
  const portfolio = 6;
  const score = blockers.length ? 0 : truth + intent + demand + competition + commercial + trend + placement + portfolio;
  const notes = [`truth ${truth}`, `intent ${intent}`, `demand ${demand}`, `competition ${competition}`, `commercial ${commercial}`, `trend ${trend}`, `placement ${placement}`, 'portfolio 6'];
  if (!row.low_bid && !row.high_bid) notes.push('нет bid-данных');
  if ((row.competition || '').toUpperCase() === 'UNKNOWN') notes.push('competition unknown: не главный без ручной проверки');
  return { keyword, score, role: roleFor(score, row, blockers), blockers, notes };
}
function roleLabel(role: Role) { return ({ primary: 'главный', secondary: 'вторичный', supporting: 'поддержка', long_tail: 'точный длинный', hold: 'удержать', reject: 'исключить' } as Record<Role, string>)[role]; }
function roleClass(role: Role) { if (role === 'primary' || role === 'secondary') return 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'; if (role === 'reject') return 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'; return 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'; }
function esc(value: string) { return /[",\n\r]/.test(value || '') ? `"${String(value || '').replaceAll('"', '""')}"` : String(value || ''); }
function downloadScoredCsv(rows: CsvRow[]) {
  const output = rows.map((row) => {
    const scored = scoreRow(row);
    return { ...row, score: String(scored.score), role: scored.role, role_label: roleLabel(scored.role), reason: scored.blockers.length ? scored.blockers.join(' · ') : scored.notes.join(' · ') };
  });
  const csv = `${EXPORT_COLUMNS.join(',')}\n${output.map((row) => EXPORT_COLUMNS.map((column) => esc(row[column] || '')).join(',')).join('\n')}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `thefeya-scored-keywords-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
}

export function CsvScoringPreview() {
  const [text, setText] = useState('');
  const rows = useMemo(() => parseCsv(text), [text]);
  const results = useMemo(() => rows.map(scoreRow).sort((a, b) => b.score - a.score), [rows]);
  const counts = { primary: results.filter((r) => r.role === 'primary').length, secondary: results.filter((r) => r.role === 'secondary').length, rejected: results.filter((r) => r.role === 'reject').length };
  function handleFile(file: File | null) { if (!file) return; const reader = new FileReader(); reader.onload = () => setText(String(reader.result || '')); reader.readAsText(file); }
  return <div className="space-y-4">
    <div className="rounded-2xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] p-4"><div className="text-bone text-[18px]">1. Нажми “Выбрать файл” и выбери нормализованный CSV</div><div className="mt-2 text-[12px] text-[var(--bone-dim)]">Нужен файл вида thefeya-normalized-google-keywords-....csv. Это preview: записи в Supabase нет.</div><div className="mt-4 flex flex-wrap gap-2"><input type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files?.[0] || null)} className="block flex-1 min-w-[260px] rounded-xl border border-[rgba(216,214,211,.14)] bg-black/25 p-3 text-[12px] text-bone" />{rows.length ? <button type="button" onClick={() => downloadScoredCsv(rows)} className="btn-ghost">Скачать scored CSV</button> : null}</div></div>
    <div className="grid lg:grid-cols-[1fr_320px] gap-4"><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Или вставь CSV текстом сюда" className="min-h-[220px] w-full rounded-xl border border-[rgba(216,214,211,.12)] bg-black/25 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)] outline-none focus:border-[rgba(212,178,106,.45)]" /><div className="space-y-2"><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Строк</div><div className="mt-1 text-bone text-[18px]">{results.length}</div></div><div className="grid grid-cols-3 gap-2"><div className="rounded-xl border border-[rgba(108,183,138,.25)] bg-[rgba(108,183,138,.06)] p-3"><div className="text-[10px] text-[#a9dfbd]">главные</div><div className="text-bone text-[16px]">{counts.primary}</div></div><div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.06)] p-3"><div className="text-[10px] text-[var(--gold-warm)]">вторичные</div><div className="text-bone text-[16px]">{counts.secondary}</div></div><div className="rounded-xl border border-[rgba(196,64,88,.25)] bg-[rgba(160,32,56,.06)] p-3"><div className="text-[10px] text-[var(--ruby-soft)]">исключить</div><div className="text-bone text-[16px]">{counts.rejected}</div></div></div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Этот scoring принимает normalized Google Keyword Planner CSV. UNKNOWN competition не блокирует строку, но не даёт ставить ключ главным без проверки.</div></div></div>
    <div className="max-h-[480px] overflow-auto rounded-xl border border-[rgba(216,214,211,.10)]"><div className="grid grid-cols-[1fr_80px_120px_1.4fr] gap-3 px-3 py-2 border-b border-[rgba(216,214,211,.10)] bg-black/20 text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] sticky top-0 z-10"><div>Ключ</div><div>Балл</div><div>Роль</div><div>Почему</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{results.length ? results.map((row) => <div key={`${row.keyword}-${row.score}`} className="grid grid-cols-[1fr_80px_120px_1.4fr] gap-3 px-3 py-2 text-[11px] leading-relaxed"><div className="text-bone">{row.keyword}</div><div className="text-[var(--gold-warm)]">{row.score}</div><div><span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${roleClass(row.role)}`}>{roleLabel(row.role)}</span></div><div className="text-[var(--bone-dim)]">{row.blockers.length ? row.blockers.join(' · ') : row.notes.join(' · ')}</div></div>) : <div className="p-3 text-[12px] text-[var(--bone-dim)]">Пока CSV не загружен.</div>}</div></div>
  </div>;
}
