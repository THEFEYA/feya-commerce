// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Code2, FileText, Layers3, ShieldAlert, Sparkles } from 'lucide-react';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import SeoGenerationPreflightClient from './SeoGenerationPreflightClient';

const STRATEGY_LABELS = { demand: 'Больше спроса', opportunity: 'Перспективные', niche: 'Нишевые' };

export default async function SeoBriefsFromDecisionPage({ searchParams }) {
  const productId = param(searchParams?.product_id).trim();
  const data = await buildSeoBriefContractBundle(productId);
  const brief = data.brief;
  const seoPackDraft = data.seoPackDraft;
  const agentInput = data.aiAgentInput;
  const contractPreview = seoPackDraft && agentInput ? { seo_pack_draft: seoPackDraft, ai_agent_input: agentInput } : null;
  const activeProductId = data.product?.canonical_product_id || seoPackDraft?.canonical_product_id || productId || '';
  const contractApiHref = activeProductId ? `/api/admin/seo-engine/brief-contract?product_id=${activeProductId}` : null;
  const draftPreviewHref = activeProductId ? `/admin/seo-engine/draft-preview?product_id=${activeProductId}` : null;

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">SEO · задание товара</div>
          <h1>SEO-бриф</h1>
          <p>Собираем сохранённые оси товара, подтверждённые факты и выбранные ключи в единое задание для генерации. Это тот же контракт, который используют API и проверки черновика.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/listing-master" className="owner-button primary">Мастер листинга <ArrowUpRight size={13} /></Link>
          <Link href="/admin/seo-keywords" className="owner-button">SEO-ядро <ArrowUpRight size={13} /></Link>
          {draftPreviewHref ? <Link href={draftPreviewHref} className="owner-button">Проверка черновика <ArrowUpRight size={13} /></Link> : null}
          {data.product?.product_slug ? <Link href={`/shop/${data.product.product_slug}`} className="owner-button">Товар <ArrowUpRight size={13} /></Link> : null}
        </div>
      </header>

      {data.error ? <Notice tone="warning">{data.error}</Notice> : null}
      {!data.decision ? <Notice tone="warning">Для этого товара ещё нет сохранённого черновика решения. Сначала выбери товар и сохрани решение в Мастере листинга.</Notice> : null}
      {!data.product ? <Notice tone="danger">Товар не найден в рабочем представлении фокуса товара. Вернись в Мастер листинга и выбери товар заново.</Notice> : null}

      {data.product ? <div className="grid xl:grid-cols-[.95fr_1.05fr] gap-5 mb-5">
        <Panel title="Товар" icon={FileText}>
          <div className="grid sm:grid-cols-[118px_1fr] gap-4">
            <div className="h-32 rounded-xl overflow-hidden border border-[rgba(216,214,211,.10)] bg-black/30">
              {data.product.primary_image_url ? <img src={data.product.primary_image_url} alt={data.product.primary_image_alt || data.product.card_title || ''} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">нет фото</div>}
            </div>
            <div>
              <h2 className="text-bone text-[18px] leading-tight">{titleOf(data.product)}</h2>
              <div className="mt-2 text-[11px] text-[var(--bone-dim)]">/{data.product.product_slug || 'no-slug'}</div>
              <div className="mt-4 grid sm:grid-cols-2 gap-2">
                <Fact label="Раздел" value={data.product.operator_section_label || data.product.category_label} />
                <Fact label="Источник Etsy" value={data.product.source_category_label || '—'} />
                <Fact label="Материал" value={data.product.material || '—'} />
                <Fact label="Цвет" value={data.product.canonical_color_label || data.product.color || '—'} />
                <Fact label="Визуальный мир" value={data.product.world_label || '—'} />
                <Fact label="ДНК-риск" value={data.product.has_component_review_risk ? `проверить: ${data.product.needs_component_review_count || 0}` : 'нет'} />
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Решение из Мастера листинга" icon={CheckCircle2}>
          {data.decision ? <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Chip tone="success">черновик сохранён</Chip>
              <Chip tone="gold">{strategyLabel(data.decision.selected_strategy)}</Chip>
              <Chip>{data.keywords.length} ключей</Chip>
              {brief ? <Chip tone={brief.metricsStatus.status === 'validated' ? 'success' : 'warning'}>{brief.metricsStatus.validatedCount} с метриками</Chip> : null}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <Fact label="Состав" value={data.manualFocus.component || 'не выбран'} />
              <Fact label="Материал / цвет" value={data.manualFocus.material || 'не выбран'} />
              <Fact label="Событие" value={data.manualFocus.event || 'не выбрано'} />
              <Fact label="Стиль" value={data.manualFocus.style || 'не выбран'} />
              <Fact label="Персона / образ" value={data.manualFocus.persona || 'не выбрана'} />
              <Fact label="Аудитория" value={data.manualFocus.audience || 'не выбрана'} />
            </div>
            <KeywordMiniTable title="Ключи из черновика" rows={data.keywords.slice(0, 35)} />
          </div> : <div className="text-[13px] text-[var(--bone-dim)]">Нет сохранённого решения.</div>}
        </Panel>
      </div> : null}

      {brief ? <>
        <div className="grid xl:grid-cols-[.85fr_1.15fr] gap-5 mb-5">
          <Panel title="Проверки качества" icon={ShieldAlert}>
            <div className="space-y-2">{brief.blockerChecks.map((check) => <CheckRow key={check.label} check={check} />)}</div>
          </Panel>

          <Panel title="Роли ключей v2" icon={Layers3}>
            <div className="mb-3 rounded-xl border border-[rgba(108,183,138,.25)] bg-[rgba(108,183,138,.06)] p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">
              <span className="text-bone">Метрики:</span> {brief.metricsStatus.note}
            </div>
            <div className="space-y-3">{brief.keywordRoleGroups.length ? brief.keywordRoleGroups.map((group) => <RoleGroup key={group.role} group={group} />) : <div className="text-[12px] text-[var(--bone-dim)]">Нет распределённых ролей. Вернись в Мастер листинга и сохрани ключи заново.</div>}</div>
          </Panel>
        </div>

        <div className="grid xl:grid-cols-[.95fr_1.05fr] gap-5 mb-5">
          <Panel title="Контракт проверки качества SEO" icon={ShieldAlert}>
            <div className="space-y-2">{brief.seoQaChecks.map((check) => <CheckRow key={check.id} check={check} />)}</div>
          </Panel>

          <Panel title="Релевантные ключи" icon={Layers3}>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">{brief.candidateKeywords.length ? brief.candidateKeywords.map((kw, i) => <div key={`${kw.keyword_norm || kw.keyword}-${i}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-2.5">
              <div className="text-bone text-[13px] leading-snug">{kw.keyword || kw.keyword_norm}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5"><Chip tone={roleTone(kw.pilot_role)}>{roleLabel(kw.pilot_role)}</Chip><Chip tone="gold">{kw.avg_monthly_searches ?? '—'} / {kw.competition || '—'}</Chip></div>
              <div className="mt-1 text-[10px] leading-relaxed text-[var(--bone-dim)]">релевантность: {kw.pilot_relevance_score || 0} · {kw.pilot_relevance_reason}</div>
            </div>) : <div className="text-[12px] text-[var(--bone-dim)]">В сохранённом наборе нет сильных кандидатов ключевых слов.</div>}</div>
          </Panel>
        </div>

        <Panel title="Предпросмотр SEO-пакета v2" icon={Sparkles}>
          <div className="grid lg:grid-cols-[.85fr_1fr] gap-5">
            <div className="space-y-3">
              <Preview label="SEO-заголовок" value={brief.draftPreview.seoTitle} />
              <Preview label="Главный заголовок H1" value={brief.draftPreview.h1} />
              <Preview label="Описание для Google" value={brief.draftPreview.metaDescription} />
              <Preview label="Решение" value={brief.decision} />
            </div>
            <div className="space-y-3">
              <TextList title="Черновое вступление и тезисы" lead={brief.draftPreview.intro} items={brief.draftPreview.bullets} />
              <TextList title="Кандидаты для FAQ" items={brief.draftPreview.faqCandidates} />
              <TextList title="Направление ALT для изображений" items={brief.draftPreview.imageAltDirection} />
              <TextList title="Подсказки для внутренних ссылок" items={brief.draftPreview.internalLinkingHints} />
              <TextList title="Заблокированные / исключённые слова" items={brief.draftPreview.blockedWords} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="btn-ghost" href={`/admin/listing-master?product_id=${activeProductId}`}>Вернуться к ключам</Link>
            {draftPreviewHref ? <Link className="btn-ghost" href={draftPreviewHref}>Открыть проверку черновика <ArrowUpRight size={13} /></Link> : null}
            <button className="btn-ghost opacity-60 cursor-not-allowed" disabled>Сохранить SEO-пакет — заблокировано</button>
          </div>
        </Panel>

        {contractPreview ? <div className="mt-5">
          <Panel title="Тестовый контракт AI-агента" icon={Code2}>
            <div className="mb-3 rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.06)] p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">
              <span className="text-bone">Только просмотр:</span> это будущий вход для AI-агента и хранения черновиков. Сейчас здесь нет вызова OpenAI, записи в Supabase или публикации.
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
              <Fact label="Статус пакета" value={seoPackDraft.status} />
              <Fact label="Задача агента" value={agentInput.task} />
              <Fact label="Главные ключи" value={seoPackDraft.keyword_roles.primary.length} />
              <Fact label="Вторичные ключи" value={seoPackDraft.keyword_roles.secondary.length} />
            </div>
            <div className="mb-3 flex flex-wrap gap-3">
              {contractApiHref ? <Link className="btn-ghost" href={contractApiHref} target="_blank">Открыть JSON-контракт <ArrowUpRight size={13} /></Link> : null}
              {draftPreviewHref ? <Link className="btn-ghost" href={draftPreviewHref}>Открыть проверку черновика <ArrowUpRight size={13} /></Link> : null}
              <button className="btn-ghost opacity-60 cursor-not-allowed" disabled>Генерация OpenAI — заблокирована</button>
              <button className="btn-ghost opacity-60 cursor-not-allowed" disabled>Сохранение в Supabase — заблокировано</button>
            </div>
            <div className="mb-3"><SeoGenerationPreflightClient productId={activeProductId} /></div>
            <JsonPreview value={contractPreview} />
          </Panel>
        </div> : null}
      </> : null}
    </div>
  </main>;
}

function titleOf(product) { return product?.card_title || product?.h1 || product?.seo_title || product?.product_slug || 'Без названия'; }
function param(value) { if (typeof value === 'string') return value; if (Array.isArray(value) && typeof value[0] === 'string') return value[0]; return ''; }
function statusLabel(value) { const labels = { pass: 'готово', warning: 'проверить', blocker: 'блокер', blocked: 'заблокировано', ready_for_human_draft_preview: 'готово к черновику', needs_metric_validation: 'нужны метрики' }; return labels[String(value || '').toLowerCase()] || value || 'нет данных'; }
function asText(value, fallback = '—') { if (value == null || value === '') return fallback; return String(value); }
function strategyLabel(value) { if (Array.isArray(value)) return value.map(strategyLabel).join(', '); return STRATEGY_LABELS[value] || String(value || 'режим не указан'); }
function roleLabel(value) { return ({ primary: 'основной', secondary: 'вторичный', support: 'поддерживающий', image_alt: 'ALT изображений', collection: 'коллекция', faq_commercial: 'FAQ / коммерческий', hold: 'отложить', reject: 'исключить' }[String(value || '')] || 'роль'); }
function roleTone(value) { if (value === 'primary' || value === 'secondary') return 'success'; if (value === 'reject') return 'danger'; if (value === 'hold') return 'warning'; if (value === 'collection' || value === 'faq_commercial') return 'gold'; return 'neutral'; }
function Chip({ children, tone = 'neutral' }) { const cls = tone === 'success' ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]' : tone === 'danger' ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]' : tone === 'gold' ? 'border-[rgba(212,178,106,.35)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.08)]' : tone === 'warning' ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]' : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15'; return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${cls}`}>{children}</span>; }
function Notice({ children, tone = 'warning' }) { const cls = tone === 'danger' ? 'border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)]' : 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)]'; return <div className={`rounded-2xl border ${cls} p-4 text-[var(--bone-dim)] mb-5`}>{children}</div>; }
function Panel({ title, children, icon: Icon }) { return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden"><div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold">{title}</div>{Icon ? <Icon size={16} className="text-[var(--gold-warm)]" /> : null}</div><div className="p-4">{children}</div></div>; }
function Fact({ label, value }) { return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-2.5"><div className="text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1">{label}</div><div className="text-[12px] text-bone leading-snug">{asText(value)}</div></div>; }
function Preview({ label, value }) { return <div><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1.5">{label}</div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-bone text-[13px] leading-relaxed">{value}</div></div>; }
function CheckRow({ check }) { return <div className="grid grid-cols-[150px_92px_1fr] gap-2 items-center rounded-xl border border-[rgba(216,214,211,.09)] bg-black/15 p-2.5"><div className="text-bone text-[12px]">{check.label}</div><Chip tone={check.status === 'pass' ? 'success' : check.status === 'blocker' ? 'danger' : 'warning'}>{statusLabel(check.status)}</Chip><div className="text-[11px] leading-relaxed text-[var(--bone-dim)]">{check.note}</div></div>; }
function RoleGroup({ group }) { return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-bone text-[13px]">{group.label}</div><div className="mt-1 text-[10px] leading-relaxed text-[var(--bone-dim)]">{group.purpose}</div></div><Chip tone={roleTone(group.role)}>{group.items.length}</Chip></div><div className="mt-3 grid sm:grid-cols-2 gap-2">{group.items.slice(0, 8).map((kw, i) => <div key={`${kw.keyword_norm || kw.keyword}-${i}`} className="rounded-lg border border-[rgba(216,214,211,.08)] bg-black/20 p-2"><div className="text-[12px] text-bone">{kw.keyword || kw.keyword_norm}</div><div className="mt-1 text-[10px] text-[var(--bone-dim)]">{kw.avg_monthly_searches ?? '—'} / {kw.competition || '—'} · {kw.pilot_role_reason}</div></div>)}</div></div>; }
function KeywordMiniTable({ title, rows }) { return <div><div className="eyebrow-dim mb-2">{title}</div><div className="max-h-[220px] overflow-auto rounded-xl border border-[rgba(216,214,211,.10)] divide-y divide-[rgba(216,214,211,.08)]">{rows.map((kw, i) => <div key={`${kw.keyword_norm || kw.keyword}-${i}`} className="grid grid-cols-[1fr_90px_90px] gap-2 px-3 py-2 text-[11px]"><div className="text-bone">{kw.keyword || kw.keyword_norm}</div><div className="text-[var(--bone-dim)]">{kw.avg_monthly_searches ?? '—'}</div><div className="text-[var(--gold-warm)]">{kw.competition || '—'}</div></div>)}</div></div>; }
function TextList({ title, lead, items = [] }) { return <div><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1.5">{title}</div><div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 text-[12px] leading-relaxed text-[var(--bone-dim)]">{lead ? <p>{lead}</p> : null}{items.length ? <ul className="mt-2 space-y-1.5 list-disc pl-5">{items.map((item) => <li key={item}>{item}</li>)}</ul> : null}</div></div>; }
function JsonPreview({ value }) { return <pre className="max-h-[520px] overflow-auto rounded-xl border border-[rgba(216,214,211,.10)] bg-black/30 p-3 text-[10px] leading-relaxed text-[var(--bone-dim)] whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>; }
