// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Database, Layers3, SearchCheck, SlidersHorizontal, Sparkles, Tags } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LIMIT = 1200;
const DISPLAY_LIMIT = 220;
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

const COMPONENTS = ['armor', 'harness', 'bodysuit', 'mask', 'headpiece', 'choker', 'corset', 'skirt', 'chain', 'wings'];
const MATERIALS = ['gold', 'silver', 'black', 'white', 'metallic', 'holographic', 'leather', 'mirror', 'acrylic', 'reflective'];
const EVENTS = ['rave', 'festival', 'burning man', 'stage', 'edm', 'coachella', 'halloween', 'pride', 'drag', 'photoshoot'];

const MATCH_SYNONYMS = {
  armor: ['armor', 'armour', 'shoulder', 'bracer', 'arm cuff', 'robot', 'warrior'],
  harness: ['harness', 'chest harness', 'body harness', 'chain harness', 'leg harness'],
  bodysuit: ['bodysuit', 'body suit', 'catsuit'],
  mask: ['mask', 'face mask', 'futuristic mask'],
  headpiece: ['headpiece', 'head piece', 'horn', 'crown', 'cleopatra'],
  choker: ['choker', 'collar'],
  corset: ['corset', 'top', 'bra'],
  skirt: ['skirt'],
  chain: ['chain', 'body chain'],
  wings: ['wings', 'wing'],
  gold: ['gold', 'golden'],
  silver: ['silver', 'chrome'],
  black: ['black'],
  white: ['white'],
  metallic: ['metallic', 'metal'],
  holographic: ['holographic', 'holo', 'iridescent'],
  leather: ['leather', 'vegan leather'],
  mirror: ['mirror', 'mirrored'],
  acrylic: ['acrylic'],
  reflective: ['reflective', 'shiny'],
  rave: ['rave', 'edm'],
  festival: ['festival', 'coachella', 'tomorrowland'],
  'burning man': ['burning man', 'burningman'],
  stage: ['stage', 'performance', 'performer', 'dance performance'],
  edm: ['edm', 'rave'],
  coachella: ['coachella', 'festival'],
  halloween: ['halloween'],
  pride: ['pride', 'drag'],
  drag: ['drag', 'drag queen'],
  photoshoot: ['photoshoot', 'photo shoot'],
};

const PRESETS = [
  { label: 'Gold rave harness', bucket: 'product_or_alt', component: 'harness', material: 'gold', event: 'rave' },
  { label: 'Silver stage bodysuit', bucket: 'product_or_alt', component: 'bodysuit', material: 'silver', event: 'stage' },
  { label: 'Gold armor Burning Man', bucket: 'product_or_alt', component: 'armor', material: 'gold', event: 'burning man' },
  { label: 'Futuristic mask stage', bucket: 'product', component: 'mask', material: 'metallic', event: 'stage' },
  { label: 'Festival headpiece gold', bucket: 'product_or_alt', component: 'headpiece', material: 'gold', event: 'festival' },
];

async function countBucket(supabase, bucket) {
  let query = supabase.from('vw_seo_keyword_bank_v1_for_listing_master').select('keyword_norm', { count: 'exact', head: true });
  if (bucket !== 'all') query = query.eq('bank_bucket', bucket);
  const { count, error } = await query;
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
}

async function loadRows(filters) {
  const supabase = getSupabaseReadClient();
  if (!supabase) {
    return {
      rows: [],
      totalCount: null,
      counts: {},
      rawCount: null,
      error: getMissingSupabaseEnvMessage(),
    };
  }

  const safeBucket = BUCKETS.includes(filters.bucket) ? filters.bucket : 'all';
  const countEntries = await Promise.all(BUCKETS.map(async (item) => [item, await countBucket(supabase, item)]));
  const counts = Object.fromEntries(countEntries);

  let query = supabase
    .from('vw_seo_keyword_bank_v1_for_listing_master')
    .select(COLUMNS, { count: 'exact' })
    .limit(LIMIT);

  if (safeBucket !== 'all') query = query.eq('bank_bucket', safeBucket);

  const { data, error, count } = await query;
  if (error) return { rows: [], totalCount: null, counts, rawCount: count ?? null, error: error.message };

  const matched = applyDnaMatching(data || [], filters);

  return { rows: matched, totalCount: matched.length, counts, rawCount: count ?? 0, error: null };
}

function currentFilters(searchParams) {
  const bucket = stringParam(searchParams?.bucket, 'all');
  return {
    bucket: BUCKETS.includes(bucket) ? bucket : 'all',
    component: normalizeFilter(stringParam(searchParams?.component, '')),
    material: normalizeFilter(stringParam(searchParams?.material, '')),
    event: normalizeFilter(stringParam(searchParams?.event, '')),
    q: stringParam(searchParams?.q, '').trim().toLowerCase(),
  };
}

function stringParam(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return fallback;
}

function normalizeFilter(value) {
  return String(value || '').trim().toLowerCase();
}

function rowText(row) {
  return `${row.keyword || ''} ${row.keyword_norm || ''} ${row.source_clusters || ''} ${row.page_type || ''} ${row.bank_bucket || ''} ${row.reason || ''} ${row.notes || ''}`.toLowerCase();
}

function termsFor(value) {
  const clean = normalizeFilter(value);
  if (!clean) return [];
  return MATCH_SYNONYMS[clean] || [clean];
}

function matchesValue(text, value) {
  const terms = termsFor(value);
  if (!terms.length) return true;
  return terms.some((term) => text.includes(term));
}

function searchTokens(q) {
  return normalizeFilter(q).split(/\s+/).map((item) => item.trim()).filter((item) => item.length >= 2);
}

function queryMatches(text, q) {
  const tokens = searchTokens(q);
  if (!tokens.length) return true;
  return tokens.every((token) => text.includes(token));
}

function hasActiveDna(filters) {
  return Boolean(filters.component || filters.material || filters.event || filters.q);
}

function matchRow(row, filters) {
  const text = rowText(row);
  const componentOk = matchesValue(text, filters.component);
  const materialOk = matchesValue(text, filters.material);
  const eventOk = matchesValue(text, filters.event);
  const queryOk = queryMatches(text, filters.q);
  const eligible = componentOk && materialOk && eventOk && queryOk;

  let matchScore = 0;
  const reasons = [];
  if (filters.component && componentOk) { matchScore += 45; reasons.push(`component:${filters.component}`); }
  if (filters.material && materialOk) { matchScore += 35; reasons.push(`material:${filters.material}`); }
  if (filters.event && eventOk) { matchScore += 35; reasons.push(`event:${filters.event}`); }
  if (filters.q && queryOk) { matchScore += Math.min(30, searchTokens(filters.q).length * 10); reasons.push(`search:${filters.q}`); }
  if (row.bank_bucket === 'product_or_alt') matchScore += 8;
  if (row.bank_bucket === 'product') matchScore += 6;
  if (row.bank_bucket === 'collection_visual') matchScore += 4;

  return { eligible, matchScore, reasons };
}

function applyDnaMatching(rows, filters) {
  const active = hasActiveDna(filters);
  const enriched = rows.map((row) => {
    const match = matchRow(row, filters);
    return { ...row, match_score: active ? match.matchScore : null, match_reasons: match.reasons.join(' · ') };
  });

  const filtered = active ? enriched.filter((row) => matchRow(row, filters).eligible) : enriched;

  return filtered.sort((a, b) => {
    const matchDiff = Number(b.match_score || 0) - Number(a.match_score || 0);
    if (matchDiff) return matchDiff;
    const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    if (scoreDiff) return scoreDiff;
    const volumeDiff = Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0);
    if (volumeDiff) return volumeDiff;
    return String(a.keyword || '').localeCompare(String(b.keyword || ''));
  });
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

function buildHref(filters, patch = {}) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.bucket && next.bucket !== 'all') params.set('bucket', next.bucket);
  if (next.component) params.set('component', next.component);
  if (next.material) params.set('material', next.material);
  if (next.event) params.set('event', next.event);
  if (next.q) params.set('q', next.q);
  const query = params.toString();
  return query ? `/admin/listing-master?${query}` : '/admin/listing-master';
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

function BucketLink({ bucket, active, counts, filters }) {
  const isActive = bucket === active;
  return <Link href={buildHref(filters, { bucket })} className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition-colors ${isActive ? 'border-[rgba(212,178,106,.65)] bg-[rgba(212,178,106,.12)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.14)] bg-black/10 text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)]'}`}>
    {BUCKET_LABELS[bucket] || bucket} · {bucketCount(counts, bucket)}
  </Link>;
}

function FilterChip({ type, value, filters, label }) {
  const active = filters[type] === value;
  const patch = { [type]: active ? '' : value };
  return <Link href={buildHref(filters, patch)} className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.15em] transition-colors ${active ? 'border-[rgba(108,183,138,.55)] bg-[rgba(108,183,138,.11)] text-[#a9dfbd]' : 'border-[rgba(216,214,211,.13)] bg-black/10 text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)] hover:text-bone'}`}>
    {label || value}
  </Link>;
}

function PresetLink({ preset }) {
  return <Link href={buildHref({ bucket: preset.bucket, component: preset.component, material: preset.material, event: preset.event, q: '' })} className="rounded-2xl border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.055)] p-4 hover:border-[rgba(212,178,106,.45)] transition-colors">
    <div className="text-bone text-[13px]">{preset.label}</div>
    <div className="mt-2 flex flex-wrap gap-1.5"><Chip tone="success">{preset.component}</Chip><Chip tone="gold">{preset.material}</Chip><Chip tone="warning">{preset.event}</Chip></div>
  </Link>;
}

export default async function AdminListingMasterPage({ searchParams }) {
  const filters = currentFilters(searchParams);
  const { rows, totalCount, counts, rawCount, error } = await loadRows(filters);
  const firstRows = rows.slice(0, DISPLAY_LIMIT);
  const countsError = countError(counts);
  const dnaActive = hasActiveDna(filters);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · Listing Master · SEO Tags P1</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Listing Master</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Read-only слой мастера листинга: approved-подсказки из `vw_seo_keyword_bank_v1_for_listing_master` + первый DNA matching по component / material / event / search. Без записи в товар и без автозамены тегов.</p>
        </div>
        <div className="flex flex-wrap gap-3"><Link href="/admin/seo-keywords" className="btn-ghost">SEO-ключи <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/scoring" className="btn-ghost">Scoring <ArrowUpRight size={13} /></Link><Link href="/admin" className="btn-ghost">Админка <ArrowUpRight size={13} /></Link></div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">Не удалось загрузить Listing Master keywords. Ответ базы: {error}</div> : null}
      {countsError ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[var(--bone-dim)] mb-7">Один из bucket count-запросов не вернулся: {countsError}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Metric icon={Database} label="Всего approved" value={bucketCount(counts, 'all')} note="Пул view для Listing Master." tone="success" />
        <Metric icon={Tags} label="Product" value={bucketCount(counts, 'product')} note="Ключи для товарных тегов и title-кандидатов." tone="success" />
        <Metric icon={Layers3} label="Product / Alt" value={bucketCount(counts, 'product_or_alt')} note="Точные material/component слова для товара и alt." tone="success" />
        <Metric icon={SearchCheck} label="Matched сейчас" value={formatNumber(totalCount ?? rows.length)} note={dnaActive ? 'Результат текущих DNA-фильтров.' : 'Без DNA-фильтра: показываем общий approved-пул.'} tone="warning" />
      </div>

      <div className="rounded-2xl border border-[rgba(212,178,106,.18)] bg-[rgba(212,178,106,.045)] p-5 mb-6">
        <div className="flex items-center gap-2 eyebrow-gold mb-2"><Sparkles size={14} /> Текущее решение</div>
        <p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">Теперь Listing Master умеет сузить keyword bank по DNA товара. Логика простая и безопасная: выбранные component/material/event должны встретиться в keyword/source_clusters. Reject/Hold сюда не попадают вообще.</p>
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 mb-6">
        <div className="flex items-center gap-2 eyebrow-gold mb-4"><SlidersHorizontal size={14} /> DNA matching filters</div>
        <div className="grid xl:grid-cols-[1fr_1fr] gap-5">
          <div className="space-y-4">
            <div><div className="eyebrow-dim mb-2">Component</div><div className="flex flex-wrap gap-2">{COMPONENTS.map((item) => <FilterChip key={item} type="component" value={item} filters={filters} />)}</div></div>
            <div><div className="eyebrow-dim mb-2">Material / Color</div><div className="flex flex-wrap gap-2">{MATERIALS.map((item) => <FilterChip key={item} type="material" value={item} filters={filters} />)}</div></div>
            <div><div className="eyebrow-dim mb-2">Event / Context</div><div className="flex flex-wrap gap-2">{EVENTS.map((item) => <FilterChip key={item} type="event" value={item} filters={filters} />)}</div></div>
          </div>
          <div>
            <div className="eyebrow-dim mb-2">Search inside approved bank</div>
            <form action="/admin/listing-master" className="rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
              <input type="hidden" name="bucket" value={filters.bucket} />
              <input type="hidden" name="component" value={filters.component} />
              <input type="hidden" name="material" value={filters.material} />
              <input type="hidden" name="event" value={filters.event} />
              <input name="q" defaultValue={filters.q} placeholder="Например: gold rave, burning man, chest harness" className="w-full rounded-xl border border-[rgba(216,214,211,.14)] bg-black/25 px-4 py-3 text-[13px] text-bone outline-none focus:border-[rgba(212,178,106,.45)]" />
              <div className="mt-3 flex flex-wrap gap-2"><button className="btn-ghost" type="submit">Применить поиск</button><Link href="/admin/listing-master" className="btn-ghost">Очистить DNA</Link></div>
            </form>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {PRESETS.map((preset) => <PresetLink key={preset.label} preset={preset} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {BUCKETS.map((bucket) => <BucketLink key={bucket} bucket={bucket} active={filters.bucket} counts={counts} filters={filters} />)}
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 mb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="eyebrow-dim">Активный подбор</div><h2 className="mt-2 text-bone text-[24px]">{BUCKET_LABELS[filters.bucket] || filters.bucket}</h2></div>
          <div className="flex flex-wrap gap-2"><Chip tone="success">Показано {formatNumber(firstRows.length)}</Chip><Chip tone="warning">Matched {formatNumber(totalCount ?? rows.length)}</Chip><Chip>Из выборки {formatNumber(rawCount ?? rows.length)}</Chip></div>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-[var(--bone-dim)]">Активные фильтры: component={filters.component || '—'} · material={filters.material || '—'} · event={filters.event || '—'} · search={filters.q || '—'}. Таблица ограничена первыми {formatNumber(DISPLAY_LIMIT)} строками.</p>
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="grid grid-cols-[1.1fr_.42fr_.46fr_.62fr_.50fr_.50fr_.7fr_1fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.20em] text-[var(--smoke)]">
          <div>Ключ</div><div>Match</div><div>Score</div><div>Bucket</div><div>Volume</div><div>Comp</div><div>Role</div><div>Source clusters / reason</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {firstRows.map((row, index) => <div key={`${row.keyword_norm || row.keyword}-${index}`} className="grid grid-cols-[1.1fr_.42fr_.46fr_.62fr_.50fr_.50fr_.7fr_1fr] gap-4 px-5 py-4 items-center hover:bg-[rgba(212,178,106,.035)] transition-colors">
            <div><div className="text-bone text-[14px] leading-snug">{asText(row.keyword)}</div><div className="mt-1 text-[11px] text-[var(--bone-dim)]">{asText(row.keyword_norm)}</div></div>
            <div className="font-price text-[20px] text-[#a9dfbd]">{row.match_score == null ? '—' : row.match_score}</div>
            <div className="font-price text-[22px] text-[var(--gold-warm)]">{asText(row.score)}</div>
            <div><Chip tone={toneByBucket(row.bank_bucket)}>{BUCKET_LABELS[row.bank_bucket] || asText(row.bank_bucket)}</Chip></div>
            <div className="text-[12px] text-[var(--bone-dim)]">{formatNumber(row.avg_monthly_searches)}</div>
            <div><Chip tone={String(row.competition || '').toUpperCase() === 'LOW' ? 'success' : String(row.competition || '').toUpperCase() === 'HIGH' ? 'warning' : 'neutral'}>{asText(row.competition)}</Chip></div>
            <div><Chip tone="success">{asText(row.role_label || row.role)}</Chip></div>
            <div className="text-[11px] leading-relaxed text-[var(--bone-dim)]"><div>{asText(row.match_reasons || row.source_clusters || row.source_files)}</div><div className="mt-1 opacity-80">{asText(row.reason || row.notes, '')}</div></div>
          </div>)}
          {!firstRows.length && !error ? <div className="px-5 py-6 text-[13px] text-[var(--bone-dim)]">По текущим DNA-фильтрам approved keywords не найдены. Сними один фильтр или используй bucket “Все”.</div> : null}
        </div>
      </div>
    </section>
  </main>;
}
