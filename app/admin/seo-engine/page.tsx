// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Database, FileCheck2, FileText, FlaskConical, Layers3, SearchCheck, ShieldCheck } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SOURCE_SELECT = 'source_code,source_name,source_type,connection_status,priority_level,notes';
const STATUS_SELECT = 'product_slug,collection_slug,page_type,brief_status,primary_keyword,asset_status,check_status,qa_approved';

async function safeCount(supabase, tableName, columnName) {
  const { count, error } = await supabase.from(tableName).select(columnName, { count: 'exact', head: true });
  return { count: count || 0, error: error?.message || null };
}

async function loadEngine() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { sources: [], rows: [], counts: {}, error: getMissingSupabaseEnvMessage() };

  const [sources, rows, keywords, briefs, assets, checks, runs, conflicts] = await Promise.all([
    supabase.from('feya_seo_source_connections_v1').select(SOURCE_SELECT).order('priority_level', { ascending: true }),
    supabase.from('feya_commerce_v_seo_content_engine_status_v1').select(STATUS_SELECT).limit(120),
    safeCount(supabase, 'feya_keyword_candidates_v1', 'keyword_candidate_id'),
    safeCount(supabase, 'feya_seo_briefs_v1', 'seo_brief_id'),
    safeCount(supabase, 'feya_seo_content_assets_v1', 'content_asset_id'),
    safeCount(supabase, 'feya_seo_quality_checks_v1', 'quality_check_id'),
    safeCount(supabase, 'feya_seo_generation_runs_v1', 'generation_run_id'),
    safeCount(supabase, 'feya_seo_cannibalization_map_v1', 'cannibalization_id'),
  ]);

  const error = [sources.error?.message, rows.error?.message, keywords.error, briefs.error, assets.error, checks.error, runs.error, conflicts.error].filter(Boolean)[0] || null;

  return {
    sources: sources.data || [],
    rows: rows.data || [],
    counts: {
      keywords: keywords.count,
      briefs: briefs.count,
      assets: assets.count,
      checks: checks.count,
      runs: runs.count,
      conflicts: conflicts.count,
    },
    error,
  };
}

const STATUS_LABELS = {
  connected: 'подключено',
  active: 'активно',
  approved: 'одобрено',
  applied: 'применено',
  planned: 'запланировано',
  manual_only: 'ручной ввод',
  manual_import: 'ручной импорт',
  optional_later: 'позже / опционально',
  paid_later: 'платно позже',
  later_after_indexation: 'после индексации',
  draft: 'черновик',
};

const SOURCE_LABELS = {
  product_dna: 'ДНК товара / текущие данные',
  manual_seed: 'Ручные ключевые фразы',
  old_etsy_data: 'Старые данные Etsy',
  google_ads_keyword_planner: 'Google Ads Keyword Planner',
  google_trends: 'Google Trends',
  erank: 'eRank',
  search_console: 'Google Search Console',
  dataforseo: 'DataForSEO',
};

function statusLabel(status = '') {
  return STATUS_LABELS[status] || status || 'нет данных';
}

function sourceLabel(source) {
  return SOURCE_LABELS[source.source_code] || source.source_name || source.source_code;
}

function sourceNote(source) {
  const notes = {
    product_dna: 'Главный внутренний источник смысла: тип товара, материал, цвет, контекст, стиль и брендовые правила.',
    manual_seed: 'Ручные ключи, которые мы можем добавить сами до подключения внешних сервисов.',
    old_etsy_data: 'Исторические сигналы из Etsy: старые titles, tags, organic queries и кластеры после импорта.',
    google_ads_keyword_planner: 'Будущий источник частотности, конкуренции и гео-метрик ключевых слов.',
    google_trends: 'Будущий опциональный источник сезонности и трендов.',
    erank: 'Опциональная проверка marketplace-ключей через экспорт/импорт.',
    search_console: 'Будет нужен после индексации, когда появятся реальные показы и клики.',
    dataforseo: 'Платный fallback, если данных Google Ads будет недостаточно.',
  };
  return notes[source.source_code] || source.notes || source.source_code;
}

function tone(status = '') {
  if (['connected', 'active', 'approved', 'applied'].includes(status)) return 'success';
  if (['planned', 'manual_only', 'manual_import', 'optional_later', 'paid_later', 'later_after_indexation', 'draft'].includes(status)) return 'warning';
  return 'neutral';
}

function Chip({ children, tone: toneName = 'neutral' }) {
  const className = toneName === 'success'
    ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
    : toneName === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[40px] leading-none">{value || 0}</div>
  </div>;
}

export default async function SeoEnginePage() {
  const { sources, rows, counts, error } = await loadEngine();

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · SEO-движок</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>SEO Engine</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Рабочая зона до индексации: кандидаты ключевых слов, SEO-брифы, англоязычные контент-черновики, проверки качества, история генераций и конфликты ключей.</p>
        </div>
        <div className="flex flex-wrap gap-3"><Link href="/admin/seo-engine/briefs" className="btn-ghost">Первый SEO-бриф <ArrowUpRight size={13} /></Link><Link href="/admin/seo-keywords" className="btn-ghost">SEO-ключи <ArrowUpRight size={13} /></Link><Link href="/admin/seo-lab" className="btn-ghost">SEO Lab <ArrowUpRight size={13} /></Link><Link href="/admin/products" className="btn-ghost">Товары <ArrowUpRight size={13} /></Link></div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[13px] leading-relaxed text-[var(--bone-dim)] mb-7">Часть SEO Engine таблиц ещё не применена в Supabase. Это не блокирует pilot preview, потому что первый SEO-бриф читает только подтверждённые storefront + keyword views. Ответ базы: {error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8"><Metric icon={SearchCheck} label="Ключи" value={counts.keywords} /><Metric icon={FileText} label="Брифы" value={counts.briefs} /><Metric icon={FileCheck2} label="Контент" value={counts.assets} /><Metric icon={ShieldCheck} label="Проверки" value={counts.checks} /><Metric icon={FlaskConical} label="Запуски" value={counts.runs} /><Metric icon={Layers3} label="Конфликты" value={counts.conflicts} /></div>

      <div className="grid xl:grid-cols-[1fr_420px] gap-6">
        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(216,214,211,.10)]"><div><div className="eyebrow-gold mb-1">Источники данных</div><div className="text-[12px] text-[var(--bone-dim)]">Внешние сервисы дают сигналы. Ядро системы — наши товары, ДНК и утверждённый контент.</div></div><Database size={18} className="text-[var(--gold-warm)]" /></div>
          <div className="divide-y divide-[rgba(216,214,211,.08)]">{sources.length ? sources.map((source) => <div key={source.source_code} className="grid md:grid-cols-[1fr_170px] gap-4 px-5 py-4 items-center"><div><div className="text-bone text-[14px] leading-snug">{sourceLabel(source)}</div><div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">{sourceNote(source)}</div></div><Chip tone={tone(source.connection_status)}>{statusLabel(source.connection_status)}</Chip></div>) : <div className="px-5 py-5 text-[13px] text-[var(--bone-dim)]">Источники ещё не загружены.</div>}</div>
        </div>

        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-black/20 p-5"><div className="eyebrow-gold mb-4">Следующий практический шаг</div><div className="space-y-3 text-[13px] leading-relaxed text-[var(--bone-dim)]"><p>1. Открыть первый SEO-бриф.</p><p>2. Проверить gate: товарные факты, изображение, slug, цена, ключи, метрики.</p><p>3. Если blocker'ов нет — перейти к human draft preview.</p><p>4. Потом масштабировать метод на список товаров, а не генерировать всё вслепую.</p></div><Link href="/admin/seo-engine/briefs" className="btn-ghost mt-5 inline-flex">Открыть pilot <ArrowUpRight size={13} /></Link></div>
      </div>

      <div className="mt-6 rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="grid grid-cols-[1.2fr_.7fr_.8fr_.8fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.22em] text-[var(--smoke)]"><div>Страница</div><div>Тип</div><div>Бриф</div><div>Проверка</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{rows.length ? rows.map((row, index) => <div key={`${row.page_type}-${row.product_slug || row.collection_slug || index}`} className="grid grid-cols-[1.2fr_.7fr_.8fr_.8fr] gap-4 px-5 py-4 items-center"><div><div className="text-bone text-[14px] leading-snug">{row.product_slug || row.collection_slug || 'Не привязано'}</div><div className="mt-1 text-[11px] text-[var(--bone-dim)]">{row.primary_keyword || 'Главный ключ ещё не выбран'}</div></div><Chip>{row.page_type || 'page'}</Chip><Chip tone={tone(row.brief_status)}>{statusLabel(row.brief_status)}</Chip><Chip tone={row.qa_approved ? 'success' : 'warning'}>{row.qa_approved ? 'одобрено' : statusLabel(row.check_status)}</Chip></div>) : <div className="px-5 py-5 text-[13px] text-[var(--bone-dim)]">SEO-статусы ещё не созданы.</div>}</div></div>
    </section>
  </main>;
}
