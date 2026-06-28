// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, FileSearch, Gauge, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const KEYWORD_LIMIT = 500;
const KEYWORD_SELECT = 'keyword,keyword_norm,priority_tier,queue_suggested_page_level,queue_keyword_axis,queue_keyword_pattern,validation_status,cleanup_pipeline_status,cleaned_keyword,suggested_keyword,should_validate_api,should_hold,warning_flags';

const VALUE_LABELS = {
  needs_human_review: 'нужна ручная проверка',
  needs_ai_cleanup: 'нужна AI-чистка',
  ready_for_metric_validation: 'готово к проверке метрик',
  queued: 'в очереди',
  validated: 'метрики подтверждены',
  hold: 'удержать',
  tier_1: 'приоритет 1',
  tier_2: 'приоритет 2',
  product: 'товар',
  collection: 'коллекция',
  image_alt: 'alt изображения',
  body: 'текст страницы',
  true: 'да',
  false: 'нет',
};

async function loadKeywords() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], totalCount: null, error: getMissingSupabaseEnvMessage() };

  const { data, error, count } = await supabase
    .from('feya_commerce_v_seo_keyword_ai_cleanup_report_v1')
    .select(KEYWORD_SELECT, { count: 'exact' })
    .limit(KEYWORD_LIMIT);

  if (error) return { rows: [], totalCount: null, error: error.message };
  return { rows: data || [], totalCount: count, error: null };
}

function asText(value, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function readable(value) {
  const text = asText(value);
  return VALUE_LABELS[text.toLowerCase()] || text;
}

function norm(value) {
  return asText(value, '').trim().toLowerCase();
}

function countBy(rows, key, value) {
  return rows.filter((row) => norm(row[key]) === value).length;
}

function countTrue(rows, key) {
  return rows.filter((row) => row[key] === true).length;
}

function tone(value) {
  const text = norm(value);
  if (text.includes('validated') || text.includes('ready') || text.includes('approved')) return 'success';
  if (text.includes('hold') || text.includes('reject') || text.includes('error')) return 'danger';
  return 'warning';
}

function Chip({ children, tone: toneName = 'neutral' }) {
  const className = toneName === 'success'
    ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
    : toneName === 'danger'
      ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
      : toneName === 'warning'
        ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
        : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, note, icon: Icon, tone: toneName = 'neutral' }) {
  const border = toneName === 'danger'
    ? 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]'
    : toneName === 'success'
      ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
      : toneName === 'warning'
        ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]'
        : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${border} p-5 min-h-[150px]`}>
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[42px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export default async function AdminSeoKeywordsPage() {
  const { rows, totalCount, error } = await loadKeywords();
  const loadedCount = rows.length;
  const needsHumanReview = countBy(rows, 'cleanup_pipeline_status', 'needs_human_review');
  const queuedForMetrics = countBy(rows, 'validation_status', 'queued');
  const tier1 = countBy(rows, 'priority_tier', 'tier_1');
  const tier2 = countBy(rows, 'priority_tier', 'tier_2');
  const shouldValidate = countTrue(rows, 'should_validate_api');
  const shouldHold = countTrue(rows, 'should_hold');
  const metricReadyRows = rows.filter((row) => row.should_validate_api === true && row.should_hold !== true);
  const firstWaveRows = metricReadyRows.filter((row) => norm(row.priority_tier) === 'tier_1');
  const notReadyForScoring = rows.filter((row) => norm(row.validation_status) !== 'validated').length;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · SEO-ключи</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Проверка ключей</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Read-only очередь кандидатов перед первым SEO-черновиком товара. Это не финальные ключи: сначала подтверждаем смысл, метрики, соответствие товару и риск каннибализации.</p>
        </div>
        <div className="flex flex-wrap gap-3"><Link href="/admin/seo" className="btn-ghost">SEO readiness <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/keyword-metrics" className="btn-ghost">Метрики <ArrowUpRight size={13} /></Link><Link href="/admin" className="btn-ghost">Админка <ArrowUpRight size={13} /></Link></div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">Не удалось загрузить SEO-ключи. Ответ базы: {error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Metric icon={FileSearch} label="Всего кандидатов" value={totalCount ?? loadedCount} note="Строки в текущей SEO-очереди Supabase." />
        <Metric icon={ShieldCheck} label="Ручная проверка" value={needsHumanReview} note="Нельзя автоматически пускать в заголовки и описания." tone="warning" />
        <Metric icon={UploadCloud} label="Ждут метрик" value={queuedForMetrics} note="Нужен Google Ads / CSV / внешний источник." tone="warning" />
        <Metric icon={Gauge} label="Первая волна" value={firstWaveRows.length} note="Tier 1: логично проверять первыми." tone="success" />
      </div>

      <div className="grid lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-3">Приоритет 1</div><div className="font-price text-gold-grad text-[34px] leading-none">{tier1}</div><p className="mt-3 text-[12px] text-[var(--bone-dim)]">Первые кандидаты для проверки спроса.</p></div>
        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-3">Приоритет 2</div><div className="font-price text-gold-grad text-[34px] leading-none">{tier2}</div><p className="mt-3 text-[12px] text-[var(--bone-dim)]">Вторая волна после ядра.</p></div>
        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-3">Нужно API/CSV</div><div className="font-price text-gold-grad text-[34px] leading-none">{shouldValidate}</div><p className="mt-3 text-[12px] text-[var(--bone-dim)]">Кандидаты для проверки внешними метриками.</p></div>
        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-3">Нельзя score'ить</div><div className="font-price text-gold-grad text-[34px] leading-none">{notReadyForScoring}</div><p className="mt-3 text-[12px] text-[var(--bone-dim)]">Пока нет validated metric source.</p></div>
      </div>

      <div className="rounded-2xl border border-[rgba(212,178,106,.18)] bg-[rgba(212,178,106,.045)] p-5 mb-8">
        <div className="flex items-center gap-2 eyebrow-gold mb-2"><Sparkles size={14} /> Текущее решение</div>
        <p className="text-[13px] leading-relaxed text-[var(--bone-dim)]">Не запускаем массовую генерацию. Следующий практический результат — один безопасный SEO-черновик товара, но только после выбора первой волны ключей и фиксации источника метрик. OpenAI может помогать с нормализацией смысла, но не может быть источником search volume, competition, bids, trend или seasonality.</p>
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="grid grid-cols-[1.15fr_.55fr_.65fr_.75fr_.8fr_1fr] gap-4 px-5 py-4 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.20em] text-[var(--smoke)]">
          <div>Ключ</div><div>Приоритет</div><div>Куда</div><div>Метрики</div><div>Этап</div><div>Предупреждения</div>
        </div>
        <div className="divide-y divide-[rgba(216,214,211,.08)]">
          {rows.slice(0, 180).map((row, index) => <div key={`${row.keyword_norm || row.keyword}-${index}`} className="grid grid-cols-[1.15fr_.55fr_.65fr_.75fr_.8fr_1fr] gap-4 px-5 py-4 items-center hover:bg-[rgba(212,178,106,.035)] transition-colors">
            <div><div className="text-bone text-[14px] leading-snug">{asText(row.keyword)}</div><div className="mt-1 text-[11px] text-[var(--bone-dim)]">{asText(row.keyword_norm)}</div></div>
            <div><Chip tone={tone(row.priority_tier)}>{readable(row.priority_tier)}</Chip></div>
            <div className="text-[12px] text-[var(--bone-dim)]">{readable(row.queue_suggested_page_level)}</div>
            <div><Chip tone={tone(row.validation_status)}>{readable(row.validation_status)}</Chip></div>
            <div><Chip tone={tone(row.cleanup_pipeline_status)}>{readable(row.cleanup_pipeline_status)}</Chip></div>
            <div className="flex flex-wrap gap-1.5">{row.should_hold ? <Chip tone="danger">удержать</Chip> : null}{row.should_validate_api ? <Chip tone="warning">нужно API/CSV</Chip> : null}{asText(row.warning_flags, '') ? <span className="text-[11px] leading-relaxed text-[var(--bone-dim)]">{asText(row.warning_flags)}</span> : null}</div>
          </div>)}
          {!rows.length && !error ? <div className="px-5 py-6 text-[13px] text-[var(--bone-dim)]">SEO-ключи не вернулись из Supabase.</div> : null}
        </div>
      </div>
    </section>
  </main>;
}
