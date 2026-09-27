// @ts-nocheck
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import Link from 'next/link';
import { loadMetricStatus } from '@/lib/searchMetricStatus';
import { ArrowUpRight, Database, FileText, UploadCloud } from 'lucide-react';
import { AdminKeywordMetricsImportForm } from '@/components/AdminKeywordMetricsImportForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadStatus() {
  const supabase = getAdminReadClient();
  const empty = { rows: [], totalRows: 0, totalKeywords: 0 };
  if (!supabase) return { ...empty, error: getMissingAdminDataEnvMessage() };
  try { return { ...await loadMetricStatus(supabase), error: null }; }
  catch (error) { return { ...empty, error: error instanceof Error ? error.message : 'Сводка недоступна.' }; }
}

function Metric({ label, value, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[38px] leading-none">{value || 0}</div></div>;
}

export default async function KeywordMetricsPage() {
  const { rows, error, totalRows, totalKeywords } = await loadStatus();

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Админка · SEO Engine</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Keyword Metrics</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Проверка внешних метрик и обзор сохранённых наблюдений. Наличие записи не подтверждает контекст источника и не назначает роль ключа.</p></div><div className="flex flex-wrap gap-3"><Link href="/admin/seo-engine" className="btn-ghost">SEO Engine <ArrowUpRight size={13} /></Link><Link href="/admin/seo-lab" className="btn-ghost">SEO Lab <ArrowUpRight size={13} /></Link></div></div>
    {error ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[13px] leading-relaxed text-[var(--bone-dim)] mb-6">Не удалось получить полную сводку наблюдений: {error}</div> : null}
    <div className="grid md:grid-cols-3 gap-4 mb-6"><Metric icon={Database} label="Metric rows" value={totalRows} /><Metric icon={FileText} label="Unique keywords" value={totalKeywords} /><Metric icon={UploadCloud} label="Sources" value={rows.length} /></div>
    <div className="grid xl:grid-cols-[1fr_460px] gap-6"><AdminKeywordMetricsImportForm /><div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="px-5 py-4 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold mb-2">Статус источников</div><div className="text-[12px] text-[var(--bone-dim)]">Все сохранённые наблюдения, включая исторические и ожидающие проверки.</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{rows.length ? rows.map((row) => <div key={`${row.source_code}-${row.country_code}-${row.language_code}`} className="px-5 py-4"><div className="flex items-center justify-between gap-4"><div className="text-bone text-[14px]">{row.source_code}</div><div className="text-[11px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">{row.country_code}/{row.language_code}</div></div><div className="mt-2 grid grid-cols-2 gap-2 text-[12px] text-[var(--bone-dim)]"><div>rows: {row.metric_rows}</div><div>keywords: {row.unique_keywords}</div><div>Проверка контекста — отдельно</div><div>Дата: {row.last_metric_at?.slice(0, 10) || '—'}</div></div></div>) : <div className="px-5 py-5 text-[13px] text-[var(--bone-dim)]">Импортов ещё нет.</div>}</div></div></div>
  </section></main>;
}
