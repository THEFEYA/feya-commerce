// @ts-nocheck
import Link from 'next/link';
import { getMissingSupabaseEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const REVIEW_VIEW = 'feya_commerce_v_seo_commercial_new_candidate_review_queue_v1';
const SELECT = 'commercial_id,source_batch,keyword,keyword_norm,normalized_market,normalized_language,avg_monthly_searches,competition,competition_index,suggested_bucket,operator_decision,target_bank_bucket,decision_note,review_priority,suggested_usage';
const BATCH = 'commercial_v1_a_google_ads_stats_2026_07_05';

export default async function CommercialKeywordReviewPage({ searchParams }) {
  const q = String(searchParams?.q || '').trim().toLowerCase();
  const priority = String(searchParams?.priority || 'all');
  const loaded = await loadQueue({ q, priority });
  const rows = loaded.rows || [];
  const counts = buildCounts(loaded.allRows || []);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-7 pb-14">
      <div className="grid gap-5 lg:grid-cols-[1fr_420px] lg:items-end border-b border-[rgba(216,214,211,.12)] pb-6 mb-6">
        <div>
          <div className="eyebrow-gold mb-2">Админка · SEO · Google Ads metrics</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(38px,5.5vw,70px)' }}>Commercial metrics</h1>
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Это не ручная работа по каждому слову. Экран показывает новые Google Ads candidates после импорта. Основной путь — batch import → validation → scoring → auto rules → SEO-ядро. Ручной review нужен только как override для спорных слов.</p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/admin/seo-engine/metric-import/validate" className="btn-ghost">CSV метрики ↗</Link>
          <Link href="/admin/seo-engine/scoring" className="btn-ghost">Scoring ↗</Link>
          <Link href="/admin/seo-keywords" className="btn-ghost">SEO-ядро ↗</Link>
        </div>
      </div>

      {loaded.error ? <Notice tone="danger">{loaded.error}</Notice> : null}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <Metric label="Новых кандидатов" value={fmt(counts.total)} note="Из первого commercial batch." />
        <Metric label="High priority" value={fmt(counts.high)} note="Спрос от 100+ запросов." tone="gold" />
        <Metric label="Landing / meta" value={fmt(counts.landing)} note="Где купить / сайты / shop." tone="success" />
        <Metric label="Local hold" value={fmt(counts.local)} note="near me — не продвигать в товар." tone="warning" />
        <Metric label="Research hold" value={fmt(counts.research)} note="reddit / исследовательский интент." tone="warning" />
      </div>

      <div className="rounded-2xl border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.045)] p-4 mb-5">
        <div className="eyebrow-gold mb-2">Решение по процессу</div>
        <p className="text-[12px] leading-relaxed text-[var(--bone-dim)]">Не заставляем оператора approve/reject каждое слово. Эти 47 слов — staging-сигналы. Дальше я делаю rule-based dry-run: что можно добавить в ядро автоматически, что держать как FAQ/landing signal, а что оставить как evidence only.</p>
      </div>

      <Filters q={q} priority={priority} />
      <Table rows={rows} />
    </section>
  </main>;
}

async function loadQueue(filters) {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { rows: [], allRows: [], error: getMissingSupabaseEnvMessage() };
  const base = supabase.from(REVIEW_VIEW).select(SELECT).eq('source_batch', BATCH).order('avg_monthly_searches', { ascending: false }).limit(200);
  let query = base;
  if (filters.priority !== 'all') query = query.eq('review_priority', filters.priority);
  if (filters.q) query = query.ilike('keyword_norm', `%${filters.q}%`);
  const [{ data, error }, all] = await Promise.all([
    query,
    supabase.from(REVIEW_VIEW).select(SELECT).eq('source_batch', BATCH).limit(1000),
  ]);
  return { rows: data || [], allRows: all.data || [], error: error?.message || all.error?.message || null };
}

function classifyKeyword(row) {
  const k = String(row.keyword_norm || row.keyword || '').toLowerCase();
  if (k.includes('near me')) return { label: 'local hold', tone: 'warning', reason: 'Локальный интент. Для онлайн-магазина не добавлять в product SEO автоматически.' };
  if (k.includes('reddit')) return { label: 'research hold', tone: 'warning', reason: 'Исследовательский интент. Можно использовать позже для FAQ/контента, не для товарного ядра.' };
  if (k.includes('where to buy') || k.includes('where can i buy') || k.includes('where do you buy') || k.includes('websites') || k.includes('shop') || k.includes('buy')) return { label: 'landing / meta', tone: 'success', reason: 'Коммерческий интент. Кандидат для category/FAQ/meta, не обязательно для каждой карточки.' };
  return { label: 'candidate', tone: 'neutral', reason: 'Новый кандидат. Нужен rule-based promote preview.' };
}

function buildCounts(rows) {
  const counts = { total: rows.length, high: 0, landing: 0, local: 0, research: 0 };
  rows.forEach((row) => {
    if (row.review_priority === 'high') counts.high += 1;
    const cls = classifyKeyword(row).label;
    if (cls === 'landing / meta') counts.landing += 1;
    if (cls === 'local hold') counts.local += 1;
    if (cls === 'research hold') counts.research += 1;
  });
  return counts;
}

function Filters({ q, priority }) { return <form action="/admin/seo-engine/commercial-review" className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4 mb-5"><div className="grid md:grid-cols-[1fr_190px_160px] gap-3 items-end"><label><div className="eyebrow-dim mb-1.5">Поиск</div><input name="q" defaultValue={q} placeholder="where to buy, websites, near me" className="field" /></label><Select name="priority" label="Приоритет" value={priority}><option value="all">Все</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select><button className="btn-ghost" type="submit">Применить</button></div></form>; }
function Table({ rows }) { return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="grid grid-cols-[1.45fr_.45fr_.55fr_.9fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.20em] text-[var(--smoke)]"><div>Ключ</div><div>Спрос</div><div>Конкуренция</div><div>Авто-логика</div></div><div className="divide-y divide-[rgba(216,214,211,.08)]">{rows.map((row) => <Row key={row.commercial_id} row={row} />)}{!rows.length ? <div className="px-5 py-6 text-[13px] text-[var(--bone-dim)]">Кандидатов нет.</div> : null}</div></div>; }
function Row({ row }) { const cls = classifyKeyword(row); return <div className="grid grid-cols-[1.45fr_.45fr_.55fr_.9fr] gap-4 px-5 py-4 items-start hover:bg-[rgba(212,178,106,.035)]"><div><div className="text-bone text-[14px] leading-snug">{row.keyword}</div><div className="mt-1 text-[10px] text-[var(--bone-dim)]">{row.suggested_usage} · {row.normalized_market}/{row.normalized_language}</div><div className="mt-2 flex flex-wrap gap-1.5"><Chip tone={row.review_priority === 'high' ? 'gold' : 'neutral'}>{row.review_priority}</Chip><Chip>{row.suggested_bucket || '—'}</Chip></div></div><div className="font-price text-[24px] text-[var(--gold-warm)]">{fmt(row.avg_monthly_searches)}</div><div><Chip tone={String(row.competition).toUpperCase() === 'HIGH' ? 'gold' : 'success'}>{row.competition || '—'} {row.competition_index ? `· ${row.competition_index}` : ''}</Chip></div><div><Chip tone={cls.tone}>{cls.label}</Chip><div className="mt-2 text-[10px] leading-relaxed text-[var(--bone-dim)]">{cls.reason}</div></div></div>; }
function Select({ name, label, value, children }) { return <label><div className="eyebrow-dim mb-1.5">{label}</div><select name={name} defaultValue={value} className="field">{children}</select></label>; }
function Metric({ label, value, note, tone = 'neutral' }) { const border = tone === 'success' ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]' : tone === 'danger' ? 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]' : tone === 'gold' || tone === 'warning' ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]' : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]'; return <div className={`rounded-2xl border ${border} p-4 min-h-[112px]`}><div className="eyebrow-dim mb-3">{label}</div><div className="font-price text-gold-grad text-[32px] leading-none">{value}</div><div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>; }
function Chip({ children, tone = 'neutral' }) { const cls = tone === 'success' ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]' : tone === 'danger' ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]' : tone === 'gold' || tone === 'warning' ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]' : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15'; return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${cls}`}>{children}</span>; }
function Notice({ children, tone = 'warning' }) { const cls = tone === 'danger' ? 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]' : 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)]'; return <div className={`rounded-2xl border ${cls} p-4 text-[var(--bone-dim)] mb-5`}>{children}</div>; }
function fmt(v) { const n = Number(v); return Number.isFinite(n) ? new Intl.NumberFormat('en-US').format(n) : '—'; }
