// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Database, Layers3, SearchCheck, ShieldCheck, Sparkles, Tags } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LIMIT = 700;
const COLUMNS = 'keyword,keyword_norm,bank_bucket,review_status,source_clusters,score,avg_monthly_searches,competition,competition_index,low_bid,high_bid,region,language,metric_source,page_type,role,role_label,last_checked,duplicate_count,reason,notes,source_files';
const BUCKETS = ['all', 'product', 'product_or_alt', 'collection', 'commercial_collection', 'visual_collection', 'faq'];

const BUCKET_LABELS = {
  all: 'Все',
  product: 'Product',
  product_or_alt: 'Product / Alt',
  collection: 'Collection',
  commercial_collection: 'Commercial',
  visual_collection: 'Visual',
  faq: 'FAQ',
};

async function countBucket(supabase, bucket) {
  let query = supabase.from('vw_seo_keyword_bank_v1_for_listing_master').select('keyword_norm', { count: 'exact', head: true });
  if (bucket !== 'all') query = query.eq('bank_bucket', bucket);
  const { count, error } = await query;
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
}

async function loadRows(bucket) {
  const supabase = getSupabaseReadClient();
  if (!supabase) {
    return {
      rows: [],
      counts: {},
      error: getMissingSupabaseEnvMessage(),
    };
  }

  const safeBucket = BUCKETS.includes(bucket) ? bucket : 'all';
  const countEntries = await Promise.all(BUCKETS.map(async (item) => [item, await countBucket(supabase, item)]));
  const counts = Object.fromEntries(countEntries);

  let query = supabase
    .from('vw_seo_keyword_bank_v1_for_listing_master')
    .select(COLUMNS, { count: 'exact' })
    .limit(LIMIT);

  if (safeBucket !== 'all') query = query.eq('bank_bucket', safeBucket);

  const { data, error, count } = await query;
  if (error) return { rows: [], totalCount: null, counts, error: error.message };

  const rows = (data || []).slice().sort((a, b) => {
    const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    if (scoreDiff) return scoreDiff;
    const volumeDiff = Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0);
    if (volumeDiff) return volumeDiff;
    return String(a.keyword || '').localeCompare(String(b.keyword || ''));
  });

  return { rows, totalCount: count ?? 0, counts, error: null };
}

function currentBucket(searchParams) {
  const bucket = typeof searchParams?.bucket === 'string' ? searchParams.bucket : 'all';
  return BUCKETS.includes(bucket) ? bucket : 'all';
}

function asText(value, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function formatNumber(value) {
  if (value == null) return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return new Intl.NumberFormat('en-US').format(parsed);
}

function bucketCount(counts, bucket) {
  const value = counts?.[bucket]?.count;
  return value == null ? '—' : formatNumber(value);
}

function countError(counts) {
  return Object.values(counts || {}).find((item) => item?.error)?.error || null;
}

function toneByBucket(value) {
  const text = asText(value, '').toLowerCase();
  if (text.includes('product')) return 'success';
  if (text.includes('commercial') || text.includes('visual') || text.includes('collection')) return 'gold';
  if (text.includes('faq')) return 'warning';
  return 'neutral';
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'success'
    ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : tone === 'gold'
        ? 'border-[rgba(212,178,106,.35)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.08)]'
        : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, note, icon: Icon, tone = 'neutral' }) {
  const border = tone === 'success'
    ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]'
      : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${border} p-5 min-h-[138px]`}>
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[38px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

function BucketLink({ bucket, active, counts }) {
  const isActive = bucket === active;
  return <Link href={`/admin/listing-master?bucket=${bucket}`} className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition-colors ${isActive ? 'border-[rgba(212,178,106,.65)] bg-[rgba(212,178,106,.12)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.14)] bg-black/10 text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)]'}`}>
    {BUCKET_LABELS[bucket] || bucket} · {bucketCount(counts, bucket)}
  </Link>;
}

export default async function AdminListingMasterPage({ searchParams }) {
  const activeBucket = currentBucket(searchParams);
  const { rows, totalCount, counts, error } = await loadRows(activeBucket);
  const firstRows = rows.slice(0, 180);
  const countsError = countError(counts);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · Listing Master · SEO Tags P0</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Listing Master</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Первый read-only слой мастера листинга: approved-подсказки из `vw_seo_keyword_bank_v1_for_listing_master`. Пока без записи в товар и без автозамены тегов — только безопасная выдача кандидатов.</p>
        </div>
        <div className="flex flex-wrap gap-3"><Link href="/admin/seo-keywords" className="btn-ghost">SEO-ключи <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/scoring" className="btn-ghost">Scoring <ArrowUpRight size={13} /></Link><Link href="/admin" className="btn-ghost">Админка <ArrowUpRight size={13} /></Link></div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">Не удалось загрузить Listing Master keywords. Ответ базы: {error}</div> : null}
      {countsError ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[var(--bone-dim)] mb-7">Один из bucket count-запросов не вернулся: {countsError}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Metric icon={Database} label="Всего approved" value={bucketCount(counts, 'all')} note="Пул view для Listing Master." tone="success" />
        <Metric icon={Tags} label="Product" value={bucketCount(counts, 'product')} note="Ключи для товарных тегов и title-кандидатов." tone="success" />
        <Metric icon={Layers3} label="Product / Alt" value={bucketCount(counts, 'product_or_alt')} note="Точные material/component слова для товара и alt." tone="success" />
        <Metric icon={SearchCheck} label="Collections" value={formatNumber((counts.collection?.count || 0) + (counts.commercial_collection?.count || 0) + (counts.visual_collection?.count || 0))} note="Collection / commercial / visual demand." tone="warning" />
      </div>

      <div className="rounded-2xl border border-[rgba(212,178,106,.18)] bg-[rgba(212,178,106,.045)] p-5 mb-6">
        <div className="flex items-center gap-2 eyebrow-gold mb-2"><Sparkles size={14} /> Текущее решение</div>
        <p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">На этом этапе Listing Master получает проверенный пул ключей. Следующий шаг — привязать выдачу к конкретному товару через DNA/source_clusters: component, material, color, event, persona. Reject/Hold не показываются здесь вообще.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {BUCKETS.map((bucket) => <BucketLink key={bucket} bucket={bucket} active={activeBucket} counts={counts} />)}
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 mb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="eyebrow-dim">Активный bucket</div><h2 className="mt-2 text-bone text-[24px]">{BUCKET_LABELS[activeBucket] || activeBucket}</h2></div>
          <Chip tone="success">Загружено {formatNumber(rows.length)} из {formatNumber(totalCount ?? rows.length)}</Chip>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-[var(--bone-dim)]">Таблица ограничена первыми {formatNumber(LIMIT)} строками, чтобы не перегружать админку. Сортировка на серверном слое страницы: score → volume → keyword.</p>
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="grid grid-cols-[1.2fr_.45fr_.62fr_.55fr_.55fr_.8fr_1fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.20em] text-[var(--smoke)]">
          <div>Ключ</div><div>Score</div><div>Bucket</div><div>Volume</div><div>Comp</div><div>Role</div><div>Source clusters / reason</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {firstRows.map((row, index) => <div key={`${row.keyword_norm || row.keyword}-${index}`} className="grid grid-cols-[1.2fr_.45fr_.62fr_.55fr_.55fr_.8fr_1fr] gap-4 px-5 py-4 items-center hover:bg-[rgba(212,178,106,.035)] transition-colors">
            <div><div className="text-bone text-[14px] leading-snug">{asText(row.keyword)}</div><div className="mt-1 text-[11px] text-[var(--bone-dim)]">{asText(row.keyword_norm)}</div></div>
            <div className="font-price text-[22px] text-[var(--gold-warm)]">{asText(row.score)}</div>
            <div><Chip tone={toneByBucket(row.bank_bucket)}>{BUCKET_LABELS[row.bank_bucket] || asText(row.bank_bucket)}</Chip></div>
            <div className="text-[12px] text-[var(--bone-dim)]">{formatNumber(row.avg_monthly_searches)}</div>
            <div><Chip tone={String(row.competition || '').toUpperCase() === 'LOW' ? 'success' : String(row.competition || '').toUpperCase() === 'HIGH' ? 'warning' : 'neutral'}>{asText(row.competition)}</Chip></div>
            <div><Chip tone="success">{asText(row.role_label || row.role)}</Chip></div>
            <div className="text-[11px] leading-relaxed text-[var(--bone-dim)]"><div>{asText(row.source_clusters || row.source_files)}</div><div className="mt-1 opacity-80">{asText(row.reason || row.notes, '')}</div></div>
          </div>)}
          {!firstRows.length && !error ? <div className="px-5 py-6 text-[13px] text-[var(--bone-dim)]">Approved keywords для этого bucket не вернулись.</div> : null}
        </div>
      </div>
    </section>
  </main>;
}
