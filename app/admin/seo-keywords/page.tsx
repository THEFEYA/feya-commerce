// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Database, FileSearch, Gauge, Layers3, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const KEYWORD_LIMIT = 500;
const KEYWORD_COLUMNS = 'keyword,keyword_norm,bank_bucket,review_status,source_clusters,score,avg_monthly_searches,competition,competition_index,low_bid,high_bid,region,language,metric_source,page_type,role,role_label,last_checked,duplicate_count,reason,notes,source_files';

const TABS = [
  { key: 'approved', label: 'Approved', view: 'vw_seo_keyword_bank_v1_approved', note: 'чистый пул для рекомендаций' },
  { key: 'listing_master', label: 'Listing Master', view: 'vw_seo_keyword_bank_v1_for_listing_master', note: 'approved для мастера листинга' },
  { key: 'hold', label: 'Hold', view: 'vw_seo_keyword_bank_v1_hold', note: 'спорные слова' },
  { key: 'reject', label: 'Reject', view: 'vw_seo_keyword_bank_v1_reject', note: 'память анти-предложений' },
  { key: 'all', label: 'Все', view: 'seo_keyword_bank_v1', note: 'полная таблица v1' },
];

const BUCKET_LABELS = {
  collection: 'collection',
  commercial_collection: 'commercial',
  visual_collection: 'visual',
  product: 'product',
  product_or_alt: 'product / alt',
  faq: 'FAQ',
  hold: 'hold',
  reject: 'reject',
};

const STATUS_LABELS = {
  approved_draft: 'approved draft',
  hold: 'hold',
  reject: 'reject',
};

async function countView(supabase, view) {
  const { count, error } = await supabase.from(view).select('keyword_norm', { count: 'exact', head: true });
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
}

async function loadBucketRows(supabase) {
  const { data, error } = await supabase
    .from('vw_seo_keyword_bank_v1_by_bucket')
    .select('*')
    .limit(80);

  if (error) return { rows: [], error: error.message };
  return { rows: data || [], error: null };
}

async function loadKeywords(tabKey) {
  const supabase = getSupabaseReadClient();
  if (!supabase) {
    return {
      rows: [],
      totalCount: null,
      counts: {},
      bucketRows: [],
      error: getMissingSupabaseEnvMessage(),
      bucketError: null,
    };
  }

  const activeTab = TABS.find((tab) => tab.key === tabKey) || TABS[0];

  const [approved, hold, reject, listingMaster, all, buckets] = await Promise.all([
    countView(supabase, 'vw_seo_keyword_bank_v1_approved'),
    countView(supabase, 'vw_seo_keyword_bank_v1_hold'),
    countView(supabase, 'vw_seo_keyword_bank_v1_reject'),
    countView(supabase, 'vw_seo_keyword_bank_v1_for_listing_master'),
    countView(supabase, 'seo_keyword_bank_v1'),
    loadBucketRows(supabase),
  ]);

  const { data, error, count } = await supabase
    .from(activeTab.view)
    .select(KEYWORD_COLUMNS, { count: 'exact' })
    .limit(KEYWORD_LIMIT);

  if (error) {
    return {
      rows: [],
      totalCount: null,
      counts: { approved, hold, reject, listingMaster, all },
      bucketRows: buckets.rows,
      error: error.message,
      bucketError: buckets.error,
    };
  }

  const rows = (data || []).slice().sort((a, b) => {
    const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    if (scoreDiff) return scoreDiff;
    const volumeDiff = Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0);
    if (volumeDiff) return volumeDiff;
    return String(a.keyword || '').localeCompare(String(b.keyword || ''));
  });

  return {
    rows,
    totalCount: count,
    counts: { approved, hold, reject, listingMaster, all },
    bucketRows: buckets.rows,
    error: null,
    bucketError: buckets.error,
  };
}

function asText(value, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value) {
  if (value == null) return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return new Intl.NumberFormat('en-US').format(parsed);
}

function currentTab(searchParams) {
  const tab = typeof searchParams?.tab === 'string' ? searchParams.tab : 'approved';
  return TABS.some((item) => item.key === tab) ? tab : 'approved';
}

function getCount(counts, key) {
  const value = counts?.[key]?.count;
  return value == null ? '—' : formatNumber(value);
}

function countError(counts) {
  return Object.entries(counts || {}).find(([, value]) => value?.error)?.[1]?.error || null;
}

function bucketName(row) {
  return row.bank_bucket || row.bucket || row.page_type || row.bucket_name || '—';
}

function bucketCount(row) {
  return row.cnt ?? row.count ?? row.keyword_count ?? row.total_count ?? row.keywords_count ?? row.approved_count ?? null;
}

function toneByStatus(value) {
  const text = asText(value, '').toLowerCase();
  if (text.includes('approved')) return 'success';
  if (text.includes('reject')) return 'danger';
  if (text.includes('hold')) return 'warning';
  return 'neutral';
}

function toneByBucket(value) {
  const text = asText(value, '').toLowerCase();
  if (text.includes('reject')) return 'danger';
  if (text.includes('hold')) return 'warning';
  if (text.includes('product')) return 'success';
  if (text.includes('collection') || text.includes('faq')) return 'gold';
  return 'neutral';
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'success'
    ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
    : tone === 'danger'
      ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
      : tone === 'warning'
        ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
        : tone === 'gold'
          ? 'border-[rgba(212,178,106,.35)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.08)]'
          : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, note, icon: Icon, tone = 'neutral' }) {
  const border = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]'
    : tone === 'success'
      ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
      : tone === 'warning'
        ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]'
        : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${border} p-5 min-h-[150px]`}>
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[42px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

function TabLink({ tab, active }) {
  const isActive = active === tab.key;
  return <Link href={`/admin/seo-keywords?tab=${tab.key}`} className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition-colors ${isActive ? 'border-[rgba(212,178,106,.65)] bg-[rgba(212,178,106,.12)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.14)] bg-black/10 text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)]'}`}>
    {tab.label}
  </Link>;
}

export default async function AdminSeoKeywordsPage({ searchParams }) {
  const active = currentTab(searchParams);
  const activeTab = TABS.find((tab) => tab.key === active) || TABS[0];
  const { rows, totalCount, counts, bucketRows, error, bucketError } = await loadKeywords(active);
  const firstRows = rows.slice(0, 180);
  const countLoadError = countError(counts);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · SEO-ключи · Keyword Bank v1</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>SEO Keyword Bank</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Read-only слой из Supabase. Approved используется как пул рекомендаций; Hold и Reject остаются памятью анти-предложений, чтобы система не возвращала плохие слова в Listing Master.</p>
        </div>
        <div className="flex flex-wrap gap-3"><Link href="/admin/seo-engine/scoring" className="btn-ghost">Scoring <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/metric-import/validate" className="btn-ghost">CSV метрики <ArrowUpRight size={13} /></Link><Link href="/admin" className="btn-ghost">Админка <ArrowUpRight size={13} /></Link></div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">Не удалось загрузить Keyword Bank v1. Ответ базы: {error}</div> : null}
      {countLoadError ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[var(--bone-dim)] mb-7">Один из count-запросов не вернулся: {countLoadError}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Metric icon={Database} label="Всего в банке" value={getCount(counts, 'all')} note="public.seo_keyword_bank_v1 после UPSERT." />
        <Metric icon={ShieldCheck} label="Approved" value={getCount(counts, 'approved')} note="Чистый пул для рекомендаций." tone="success" />
        <Metric icon={Layers3} label="Listing Master" value={getCount(counts, 'listingMaster')} note="Approved buckets для мастера листинга." tone="success" />
        <Metric icon={ShieldAlert} label="Hold" value={getCount(counts, 'hold')} note="Спорные слова до ручной проверки." tone="warning" />
        <Metric icon={FileSearch} label="Reject" value={getCount(counts, 'reject')} note="Память анти-предложений." tone="danger" />
      </div>

      <div className="rounded-2xl border border-[rgba(212,178,106,.18)] bg-[rgba(212,178,106,.045)] p-5 mb-6">
        <div className="flex items-center gap-2 eyebrow-gold mb-2"><Sparkles size={14} /> Текущее решение</div>
        <p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">Keyword Bank v1 импортирован в Supabase и теперь должен быть источником правды для SEO Recommendation Engine. Следующий инженерный шаг после этой страницы — подключить `vw_seo_keyword_bank_v1_for_listing_master` к Listing Master, чтобы предложения брались из approved-банка по bucket/source_clusters, а reject/hold блокировали плохие варианты.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => <TabLink key={tab.key} tab={tab} active={active} />)}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 mb-8">
        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
          <div className="flex items-center justify-between gap-4 mb-4"><div><div className="eyebrow-dim">Текущая вкладка</div><h2 className="mt-2 text-bone text-[24px]">{activeTab.label}</h2></div><Chip tone={active === 'reject' ? 'danger' : active === 'hold' ? 'warning' : 'success'}>{activeTab.note}</Chip></div>
          <p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">Загружено на экран: {formatNumber(rows.length)} из {formatNumber(totalCount ?? rows.length)}. Таблица ограничена первыми {formatNumber(KEYWORD_LIMIT)} строками, чтобы не перегружать админку.</p>
        </div>

        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
          <div className="eyebrow-dim mb-3">Approved по bucket</div>
          {bucketError ? <div className="text-[12px] leading-relaxed text-[var(--ruby-soft)]">Не удалось загрузить vw_seo_keyword_bank_v1_by_bucket: {bucketError}</div> : null}
          <div className="space-y-2">
            {bucketRows.slice(0, 8).map((row, index) => {
              const bucket = bucketName(row);
              return <div key={`${bucket}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 px-3 py-2">
                <div className="text-[12px] text-[var(--bone-dim)]">{BUCKET_LABELS[bucket] || bucket}</div>
                <div className="font-price text-[20px] text-[var(--gold-warm)]">{formatNumber(bucketCount(row))}</div>
              </div>;
            })}
            {!bucketRows.length && !bucketError ? <div className="text-[12px] text-[var(--bone-dim)]">Bucket view пустой или ещё не вернул строки.</div> : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="grid grid-cols-[1.25fr_.42fr_.6fr_.55fr_.55fr_.6fr_1fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.20em] text-[var(--smoke)]">
          <div>Ключ</div><div>Score</div><div>Bucket</div><div>Volume</div><div>Comp</div><div>Role</div><div>Источник / причина</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {firstRows.map((row, index) => <div key={`${row.keyword_norm || row.keyword}-${index}`} className="grid grid-cols-[1.25fr_.42fr_.6fr_.55fr_.55fr_.6fr_1fr] gap-4 px-5 py-4 items-center hover:bg-[rgba(212,178,106,.035)] transition-colors">
            <div><div className="text-bone text-[14px] leading-snug">{asText(row.keyword)}</div><div className="mt-1 text-[11px] text-[var(--bone-dim)]">{asText(row.keyword_norm)}</div></div>
            <div className="font-price text-[22px] text-[var(--gold-warm)]">{asText(row.score)}</div>
            <div><Chip tone={toneByBucket(row.bank_bucket)}>{BUCKET_LABELS[row.bank_bucket] || asText(row.bank_bucket)}</Chip></div>
            <div className="text-[12px] text-[var(--bone-dim)]">{formatNumber(row.avg_monthly_searches)}</div>
            <div><Chip tone={String(row.competition || '').toUpperCase() === 'LOW' ? 'success' : String(row.competition || '').toUpperCase() === 'HIGH' ? 'warning' : 'neutral'}>{asText(row.competition)}</Chip></div>
            <div><Chip tone={toneByStatus(row.review_status)}>{asText(row.role_label || row.role || STATUS_LABELS[row.review_status])}</Chip></div>
            <div className="text-[11px] leading-relaxed text-[var(--bone-dim)]"><div>{asText(row.source_clusters || row.source_files)}</div><div className="mt-1 opacity-80">{asText(row.reason || row.notes, '')}</div></div>
          </div>)}
          {!firstRows.length && !error ? <div className="px-5 py-6 text-[13px] text-[var(--bone-dim)]">Keyword Bank v1 не вернул строки для этой вкладки.</div> : null}
        </div>
      </div>
    </section>
  </main>;
}
