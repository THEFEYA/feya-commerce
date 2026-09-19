// @ts-nocheck
import { competitionLabel } from '@/lib/adminDisplayRu';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const KEYWORD_LIMIT = 500;
const KEYWORD_COLUMNS = 'keyword,keyword_norm,bank_bucket,review_status,source_clusters,score,avg_monthly_searches,competition,competition_index,low_bid,high_bid,region,language,metric_source,page_type,role,role_label,last_checked,duplicate_count,reason,notes,source_files';

const TABS = [
  { key: 'approved', label: 'Одобрено', view: 'vw_seo_keyword_bank_v1_approved', note: 'чистый пул для рекомендаций' },
  { key: 'listing_master', label: 'Мастер листинга', view: 'vw_seo_keyword_bank_v1_for_listing_master', note: 'одобренный пул для мастера листинга' },
  { key: 'hold', label: 'Отложено', view: 'vw_seo_keyword_bank_v1_hold', note: 'спорные слова' },
  { key: 'reject', label: 'Исключено', view: 'vw_seo_keyword_bank_v1_reject', note: 'память анти-предложений' },
  { key: 'all', label: 'Все', view: null, note: 'одобрено + отложено + исключено' },
];

const BUCKET_LABELS = {
  collection: 'категория',
  commercial_collection: 'коммерческая посадочная',
  visual_collection: 'визуальный поиск',
  product: 'товар',
  product_or_alt: 'товар / ALT',
  faq: 'FAQ',
  hold: 'отложено',
  reject: 'исключено',
};

const STATUS_LABELS = {
  approved_draft: 'одобренный черновик',
  hold: 'hold',
  reject: 'reject',
};

async function countView(supabase, view) {
  const { count, error } = await supabase.from(view).select('keyword_norm', { count: 'exact', head: true });
  if (error) return { count: null, error: error.message };
  return { count: count ?? 0, error: null };
}

function searchTerms(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]+/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

async function loadRowsFromView(supabase, view, limit = KEYWORD_LIMIT, query = '') {
  let request = supabase
    .from(view)
    .select(KEYWORD_COLUMNS, { count: 'exact' })
    .limit(limit);

  searchTerms(query).forEach((term) => {
    request = request.ilike('keyword_norm', `%${term}%`);
  });

  const { data, error, count } = await request;

  if (error) return { rows: [], count: null, error: error.message };
  return { rows: data || [], count: count ?? 0, error: null };
}

async function loadBucketRows(supabase) {
  const { data, error } = await supabase
    .from('vw_seo_keyword_bank_v1_by_bucket')
    .select('*')
    .limit(80);

  if (error) return { rows: [], error: error.message };
  return { rows: data || [], error: null };
}

function safeCount(value) {
  return typeof value?.count === 'number' ? value.count : 0;
}

function sortKeywordRows(rows) {
  return (rows || []).slice().sort((a, b) => {
    const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    if (scoreDiff) return scoreDiff;
    const volumeDiff = Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0);
    if (volumeDiff) return volumeDiff;
    return String(a.keyword || '').localeCompare(String(b.keyword || ''));
  });
}

async function loadKeywords(tabKey, query = '') {
  const supabase = getAdminReadClient();
  if (!supabase) {
    return {
      rows: [],
      totalCount: null,
      counts: {},
      bucketRows: [],
      error: getMissingAdminDataEnvMessage(),
      bucketError: null,
    };
  }

  const activeTab = TABS.find((tab) => tab.key === tabKey) || TABS[0];

  const [approved, hold, reject, listingMaster, buckets] = await Promise.all([
    countView(supabase, 'vw_seo_keyword_bank_v1_approved'),
    countView(supabase, 'vw_seo_keyword_bank_v1_hold'),
    countView(supabase, 'vw_seo_keyword_bank_v1_reject'),
    countView(supabase, 'vw_seo_keyword_bank_v1_for_listing_master'),
    loadBucketRows(supabase),
  ]);

  const derivedAll = {
    count: safeCount(approved) + safeCount(hold) + safeCount(reject),
    error: approved.error || hold.error || reject.error || null,
    derived: true,
  };
  const counts = { approved, hold, reject, listingMaster, all: derivedAll };

  if (activeTab.key === 'all') {
    const [approvedRows, holdRows, rejectRows] = await Promise.all([
      loadRowsFromView(supabase, 'vw_seo_keyword_bank_v1_approved', KEYWORD_LIMIT, query),
      loadRowsFromView(supabase, 'vw_seo_keyword_bank_v1_hold', KEYWORD_LIMIT, query),
      loadRowsFromView(supabase, 'vw_seo_keyword_bank_v1_reject', KEYWORD_LIMIT, query),
    ]);
    const rowError = approvedRows.error || holdRows.error || rejectRows.error;
    if (rowError) {
      return { rows: [], totalCount: derivedAll.count, counts, bucketRows: buckets.rows, error: rowError, bucketError: buckets.error };
    }

    return {
      rows: sortKeywordRows([...approvedRows.rows, ...holdRows.rows, ...rejectRows.rows]).slice(0, KEYWORD_LIMIT),
      totalCount: query
        ? Number(approvedRows.count || 0) + Number(holdRows.count || 0) + Number(rejectRows.count || 0)
        : derivedAll.count,
      counts,
      bucketRows: buckets.rows,
      error: null,
      bucketError: buckets.error,
    };
  }

  const result = await loadRowsFromView(supabase, activeTab.view, KEYWORD_LIMIT, query);
  if (result.error) {
    return {
      rows: [],
      totalCount: null,
      counts,
      bucketRows: buckets.rows,
      error: result.error,
      bucketError: buckets.error,
    };
  }

  return {
    rows: sortKeywordRows(result.rows),
    totalCount: result.count,
    counts,
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

function currentQuery(searchParams) {
  return typeof searchParams?.q === 'string'
    ? searchTerms(searchParams.q).join(' ')
    : '';
}

function getCount(counts, key) {
  const value = counts?.[key]?.count;
  return value == null ? '—' : formatNumber(value);
}

function countError(counts) {
  return Object.entries(counts || {}).filter(([key]) => key !== 'all').find(([, value]) => value?.error)?.[1]?.error || null;
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

function TabLink({ tab, active, query }) {
  const isActive = active === tab.key;
  const href = `/admin/seo-keywords?tab=${tab.key}${query ? `&q=${encodeURIComponent(query)}` : ''}`;
  return <Link href={href} className={`rounded-lg border px-4 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors ${isActive ? 'border-[rgba(212,178,106,.65)] bg-[rgba(212,178,106,.12)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.14)] bg-black/10 text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)]'}`}>
    {tab.label}
  </Link>;
}

export default async function AdminSeoKeywordsPage({ searchParams }) {
  const params = await searchParams;
  const active = currentTab(params);
  const query = currentQuery(params);
  const requestedPage = Math.max(1, Number(params?.page || 1) || 1);
  const pageSize = 100;
  const activeTab = TABS.find((tab) => tab.key === active) || TABS[0];
  const { rows, totalCount, counts, bucketRows, error, bucketError } = await loadKeywords(active, query);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const countLoadError = countError(counts);

  const pageHref = (nextPage) => {
    const next = new URLSearchParams();
    next.set('tab', active);
    if (query) next.set('q', query);
    if (nextPage > 1) next.set('page', String(nextPage));
    return `/admin/seo-keywords?${next.toString()}`;
  };

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">SEO · банк ключевых слов</div>
          <h1>SEO-ключи</h1>
          <p>Одобренные запросы используются в рекомендациях и Мастере листинга; отложенные и исключённые сохраняются как память системы, чтобы плохие варианты не возвращались.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/seo-engine/scoring" className="owner-button">Оценка ключей <ArrowUpRight size={13} /></Link>
          <Link href="/admin/seo-engine/metric-import/validate" className="owner-button">Метрики Google <ArrowUpRight size={13} /></Link>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">Не удалось загрузить банк ключевых слов. Ответ базы: {error}</div> : null}
      {countLoadError ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[var(--bone-dim)] mb-7">Один из count-запросов не вернулся: {countLoadError}</div> : null}

      <section className="owner-summary-strip" style={{ marginBottom: '16px' }}>
        <div className="owner-summary-cell"><strong>{getCount(counts, 'approved')}</strong><span>Одобрено для рекомендаций</span></div>
        <div className="owner-summary-cell"><strong>{getCount(counts, 'listingMaster')}</strong><span>Доступно Мастеру листинга</span></div>
        <div className="owner-summary-cell"><strong>{getCount(counts, 'hold')}</strong><span>Отложено до проверки</span></div>
        <div className="owner-summary-cell"><strong>{getCount(counts, 'reject')}</strong><span>Исключено и не должно возвращаться</span></div>
      </section>

      <div className="owner-card is-info" style={{ marginBottom: '16px' }}>
        <div className="owner-status is-info">Источник для SEO-рекомендаций</div>
        <p className="owner-card-copy">Банк уже подключён к Мастеру листинга: одобренный пул используется для подбора кандидатов, а отложенные и исключённые запросы не должны возвращаться как обычные рекомендации.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => <TabLink key={tab.key} tab={tab} active={active} query={query} />)}
      </div>

      <form action="/admin/seo-keywords" method="get" className="grid gap-3 rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4 mb-6 sm:grid-cols-[1fr_auto_auto]">
        <input type="hidden" name="tab" value={active} />
        <input
          className="field"
          name="q"
          defaultValue={query}
          placeholder="Поиск по банку: armor outfit, bracelet, post apocalyptic"
          aria-label="Поиск по банку ключевых слов"
        />
        <button type="submit" className="owner-button justify-center">Найти в банке</button>
        {query ? <Link href={`/admin/seo-keywords?tab=${active}`} className="owner-button justify-center">Сбросить</Link> : <span />}
      </form>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 mb-8">
        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
          <div className="flex items-center justify-between gap-4 mb-4"><div><div className="eyebrow-dim">Текущая вкладка</div><h2 className="mt-2 text-bone text-[24px]">{activeTab.label}</h2></div><Chip tone={active === 'reject' ? 'danger' : active === 'hold' ? 'warning' : 'success'}>{activeTab.note}</Chip></div>
          <p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">{query ? <>По запросу <span className="text-bone">“{query}”</span> найдено: {formatNumber(totalCount ?? rows.length)}.</> : <>Загружено в рабочий срез: {formatNumber(rows.length)} из {formatNumber(totalCount ?? rows.length)}.</>} На одной странице показываем до {pageSize} строк; серверный срез ограничен {formatNumber(KEYWORD_LIMIT)} строками.</p>
        </div>

        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
          <div className="eyebrow-dim mb-3">Распределение по группе и статусу</div>
          {bucketError ? <div className="text-[12px] leading-relaxed text-[var(--ruby-soft)]">Не удалось загрузить распределение по группам. Техническая причина доступна в логах.</div> : null}
          <div className="space-y-2">
            {bucketRows.slice(0, 8).map((row, index) => {
              const bucket = bucketName(row);
              return <div key={`${bucket}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 px-3 py-2">
                <div className="text-[12px] text-[var(--bone-dim)]">{BUCKET_LABELS[bucket] || bucket}</div>
                <div className="font-price text-[20px] text-[var(--gold-warm)]">{formatNumber(bucketCount(row))}</div>
              </div>;
            })}
            {!bucketRows.length && !bucketError ? <div className="text-[12px] text-[var(--bone-dim)]">Данные по группам пока пусты или ещё не загрузились.</div> : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="sticky top-[64px] z-10 grid grid-cols-[1.25fr_.42fr_.6fr_.55fr_.55fr_.6fr_1fr] gap-4 px-5 py-3 border-b border-[rgba(216,214,211,.10)] bg-[#0f0f15]/95 backdrop-blur-xl text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">
          <div>Ключ</div><div>Оценка</div><div>Группа</div><div>Спрос</div><div>Конкуренция</div><div>Роль</div><div>Источник / причина</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {visibleRows.map((row, index) => <div key={`${row.keyword_norm || row.keyword}-${index}`} className="grid grid-cols-[1.25fr_.42fr_.6fr_.55fr_.55fr_.6fr_1fr] gap-4 px-5 py-4 items-center hover:bg-[rgba(212,178,106,.035)] transition-colors">
            <div><div className="text-bone text-[14px] leading-snug">{asText(row.keyword)}</div><div className="mt-1 text-[11px] text-[var(--bone-dim)]">{asText(row.keyword_norm)}</div></div>
            <div className="font-price text-[22px] text-[var(--gold-warm)]">{asText(row.score)}</div>
            <div><Chip tone={toneByBucket(row.bank_bucket)}>{BUCKET_LABELS[row.bank_bucket] || asText(row.bank_bucket)}</Chip></div>
            <div className="text-[12px] text-[var(--bone-dim)]">{formatNumber(row.avg_monthly_searches)}</div>
            <div><Chip tone={String(row.competition || '').toUpperCase() === 'LOW' ? 'success' : String(row.competition || '').toUpperCase() === 'HIGH' ? 'warning' : 'neutral'}>{competitionLabel(row.competition)}</Chip></div>
            <div><Chip tone={toneByStatus(row.review_status)}>{asText(row.role_label || row.role || STATUS_LABELS[row.review_status])}</Chip></div>
            <div className="text-[11px] leading-relaxed text-[var(--bone-dim)]"><div>{asText(row.source_clusters || row.source_files)}</div><div className="mt-1 opacity-80">{asText(row.reason || row.notes, '')}</div></div>
          </div>)}
          {!visibleRows.length && !error ? <div className="px-5 py-6 text-[13px] text-[var(--bone-dim)]">Для этой вкладки строки не найдены.</div> : null}
        </div>
      </div>

      {rows.length > pageSize ? (
        <div className="flex items-center justify-between gap-3" style={{ marginTop: '14px' }}>
          <div className="owner-section-kicker">Страница {page} из {pageCount} · показано {visibleRows.length}</div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            {page > 1 ? <Link href={pageHref(page - 1)} className="owner-button">Назад</Link> : <span className="owner-button" style={{ opacity: .4 }}>Назад</span>}
            {page < pageCount ? <Link href={pageHref(page + 1)} className="owner-button">Дальше</Link> : <span className="owner-button" style={{ opacity: .4 }}>Дальше</span>}
          </div>
        </div>
      ) : null}
    </div>
  </main>;
}
