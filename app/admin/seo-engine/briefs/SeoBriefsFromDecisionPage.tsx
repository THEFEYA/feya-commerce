// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Code2, FileText, Layers3, ShieldAlert, Sparkles } from 'lucide-react';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { buildSeoPilotBrief } from '@/lib/seoPilotDraft';
import { buildSeoAgentInputFromDraft, buildSeoPackDraftContractFromBrief } from '@/lib/seoPackContractBuilder';
import SeoGenerationPreflightClient from './SeoGenerationPreflightClient';

const FOCUS_VIEW = 'feya_commerce_v_listing_master_product_focus_v1';
const DECISIONS_TABLE = 'feya_commerce_listing_master_decisions_v1';
const PRODUCT_SELECT = 'canonical_product_id,matched_etsy_listing_id,product_slug,card_title,h1,seo_title,meta_description,product_type,material,color,canonical_color_label,category_label,source_category_label,operator_section_label,world_label,primary_image_url,primary_image_alt,parent_components_json,child_components_json,component_groups_json,needs_component_review_count,has_component_review_risk,focus_text';
const STRATEGY_LABELS = { demand: 'Больше спроса', opportunity: 'Перспективные', niche: 'Нишевые' };

export default async function SeoBriefsFromDecisionPage({ searchParams }) {
  const productId = param(searchParams?.product_id).trim();
  const data = await loadSeoBriefData(productId);
  const brief = data.product ? buildSeoPilotBrief(data.product, data.keywords, data.manualFocus) : null;
  const seoPackDraft = brief ? attachProductIdentity(buildSeoPackDraftContractFromBrief(brief), data) : null;
  const agentInput = seoPackDraft ? buildSeoAgentInputFromDraft(seoPackDraft) : null;
  const contractPreview = seoPackDraft && agentInput ? { seo_pack_draft: seoPackDraft, ai_agent_input: agentInput } : null;
  const contractApiHref = data.product?.canonical_product_id ? `/api/admin/seo-engine/brief-contract?product_id=${data.product.canonical_product_id}` : null;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-7 pb-12">
      <div className="grid gap-5 lg:grid-cols-[1fr_460px] lg:items-end border-b border-[rgba(216,214,211,.12)] pb-6 mb-6">
        <div>
          <div className="eyebrow-gold mb-2">Админка · SEO-задание v2</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(42px,6vw,72px)' }}>SEO-задание товара</h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[var(--bone-dim)]">Этот экран берёт сохранённый черновик из Мастера листинга: товар, ручной Product DNA, режим и выбранные ключи. Здесь проверяем основу перед генерацией SEO-pack и будущим AI-agent шагом.</p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/admin/listing-master" className="btn-ghost">Мастер листинга <ArrowUpRight size={13} /></Link>
          <Link href="/admin/seo-keywords" className="btn-ghost">SEO-ядро <ArrowUpRight size={13} /></Link>
          {data.product?.product_slug ? <Link href={`/shop/${data.product.product_slug}`} className="btn-ghost">Открыть товар <ArrowUpRight size={13} /></Link> : null}
        </div>
      </div>

      {data.error ? <Notice tone="warning">{data.error}</Notice> : null}
      {!data.decision ? <Notice tone="warning">Для этого товара ещё нет сохранённого черновика решения. Сначала выбери товар и сохрани решение в Мастере листинга.</Notice> : null}
      {!data.product ? <Notice tone="danger">Товар не найден в Product Focus view. Вернись в Мастер листинга и выбери товар заново.</Notice> : null}

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
                <Fact label="World" value={data.product.world_label || '—'} />
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
            <div className="space-y-3">{brief.keywordRoleGroups.length ? brief.keywordRoleGroups.map((group) => <RoleGroup key={group.role} group={group} />) : <div className="text-[12px] text-[var(--bone-dim)]">Нет распределённых ролей. Вернись в Listing Master и сохрани ключи заново.</div>}</div>
          </Panel>
        </div>

        <div className="grid xl:grid-cols-[.95fr_1.05fr] gap-5 mb-5">
          <Panel title="SEO QA contract" icon={ShieldAlert}>
            <div className="space-y-2">{brief.seoQaChecks.map((check) => <CheckRow key={check.id} check={check} />)}</div>
          </Panel>

          <Panel title="Релевантные ключи" icon={Layers3}>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">{brief.candidateKeywords.length ? brief.candidateKeywords.map((kw, i) => <div key={`${kw.keyword_norm || kw.keyword}-${i}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-2.5">
              <div className="text-bone text-[13px] leading-snug">{kw.keyword || kw.keyword_norm}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5"><Chip tone={roleTone(kw.pilot_role)}>{roleLabel(kw.pilot_role)}</Chip><Chip tone="gold">{kw.avg_monthly_searches ?? '—'} / {kw.competition || '—'}</Chip></div>
              <div className="mt-1 text-[10px] leading-relaxed text-[var(--bone-dim)]">релевантность: {kw.pilot_relevance_score || 0} · {kw.pilot_relevance_reason}</div>
            </div>) : <div className="text-[12px] text-[var(--bone-dim)]">По сохранённому набору нет сильных candidate keywords.</div>}</div>
          </Panel>
        </div>

        <Panel title="Предпросмотр SEO-pack v2" icon={Sparkles}>
          <div className="grid lg:grid-cols-[.85fr_1fr] gap-5">
            <div className="space-y-3">
              <Preview label="SEO-заголовок" value={brief.draftPreview.seoTitle} />
              <Preview label="Главный заголовок H1" value={brief.draftPreview.h1} />
              <Preview label="Описание для Google" value={brief.draftPreview.metaDescription} />
              <Preview label="Решение" value={brief.decision} />
            </div>
            <div className="space-y-3">
              <TextList title="Черновой intro и тезисы" lead={brief.draftPreview.intro} items={brief.draftPreview.bullets} />
              <TextList title="FAQ candidates" items={brief.draftPreview.faqCandidates} />
              <TextList title="Image ALT direction" items={brief.draftPreview.imageAltDirection} />
              <TextList title="Internal linking hints" items={brief.draftPreview.internalLinkingHints} />
              <TextList title="Blocked / excluded words" items={brief.draftPreview.blockedWords} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3"><Link className="btn-ghost" href={`/admin/listing-master?product_id=${data.product?.canonical_product_id || ''}`}>Вернуться к ключам</Link><button className="btn-ghost opacity-60 cursor-not-allowed" disabled>Следующий шаг: генерация SEO-пакета</button></div>
        </Panel>

        {contractPreview ? <div className="mt-5">
          <Panel title="AI-agent dry-run contract" icon={Code2}>
            <div className="mb-3 rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.06)] p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">
              <span className="text-bone">Read-only bridge:</span> это будущий вход для AI-agent и draft storage. Сейчас здесь нет OpenAI call, нет Supabase write, нет publish action.
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
              <Fact label="Pack status" value={seoPackDraft.status} />
              <Fact label="Agent task" value={agentInput.task} />
              <Fact label="Primary keywords" value={seoPackDraft.keyword_roles.primary.length} />
              <Fact label="Secondary keywords" value={seoPackDraft.keyword_roles.secondary.length} />
            </div>
            <div className="mb-3 flex flex-wrap gap-3">
              {contractApiHref ? <Link className="btn-ghost" href={contractApiHref} target="_blank">Открыть JSON endpoint <ArrowUpRight size={13} /></Link> : null}
              <button className="btn-ghost opacity-60 cursor-not-allowed" disabled>OpenAI generation заблокирована</button>
              <button className="btn-ghost opacity-60 cursor-not-allowed" disabled>Supabase save заблокирован</button>
            </div>
            <div className="mb-3"><SeoGenerationPreflightClient productId={data.product?.canonical_product_id || ''} /></div>
            <JsonPreview value={contractPreview} />
          </Panel>
        </div> : null}
      </> : null}
    </section>
  </main>;
}

async function loadSeoBriefData(productId) {
  const supabase = getSupabaseServiceClient() || getSupabaseReadClient();
  if (!supabase) return { product: null, decision: null, keywords: [], manualFocus: {}, error: getMissingSupabaseEnvMessage() };

  let decisionRows = [];
  if (getSupabaseServiceClient()) {
    let q = supabase.from(DECISIONS_TABLE).select('canonical_product_id,product_slug,matched_etsy_listing_id,auto_focus_json,manual_focus_json,selected_strategy,selected_keywords_json,decision_status,updated_at,created_at').limit(2000);
    if (productId) q = q.eq('canonical_product_id', productId);
    const result = await q;
    decisionRows = result.data || [];
  }
  decisionRows.sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
  const decision = decisionRows[0] || null;
  const effectiveProductId = productId || decision?.canonical_product_id || '';

  let product = null;
  if (effectiveProductId) {
    const productResult = await supabase.from(FOCUS_VIEW).select(PRODUCT_SELECT).eq('canonical_product_id', effectiveProductId).limit(1);
    product = (productResult.data || [])[0] || null;
  }

  const keywords = normalizeDecisionKeywords(decision?.selected_keywords_json || []);
  const manualFocus = decision?.manual_focus_json && typeof decision.manual_focus_json === 'object' ? decision.manual_focus_json : {};
  return { product, decision, keywords, manualFocus, error: null };
}

function attachProductIdentity(contract, data) {
  const canonicalProductId = data.product?.canonical_product_id || data.decision?.canonical_product_id || '';
  const matchedEtsyListingId = data.product?.matched_etsy_listing_id || data.decision?.matched_etsy_listing_id || null;
  return {
    ...contract,
    canonical_product_id: canonicalProductId,
    matched_etsy_listing_id: matchedEtsyListingId,
    product_truth: {
      ...contract.product_truth,
      canonical_product_id: canonicalProductId,
      matched_etsy_listing_id: matchedEtsyListingId,
      primary_image_url: data.product?.primary_image_url || contract.product_truth.primary_image_url || null,
      primary_image_alt: data.product?.primary_image_alt || contract.product_truth.primary_image_alt || null,
    },
  };
}

function normalizeDecisionKeywords(value) {
  const rows = Array.isArray(value) ? value : [];
  return rows.map((row) => ({
    ...row,
    keyword: row.keyword || row.keyword_norm,
    keyword_norm: row.keyword_norm || row.keyword,
    priority_tier: 'tier_1',
    validation_status: row.avg_monthly_searches && String(row.competition || '').toUpperCase() !== 'UNKNOWN' ? 'validated' : 'queued',
    cleanup_pipeline_status: 'from_listing_master_decision',
    should_validate_api: false,
    should_hold: false,
  }));
}
function titleOf(product) { return product?.card_title || product?.h1 || product?.seo_title || product?.product_slug || 'Untitled product'; }
function param(value) { if (typeof value === 'string') return value; if (Array.isArray(value) && typeof value[0] === 'string') return value[0]; return ''; }
function statusLabel(value) { const labels = { pass: 'готово', warning: 'проверить', blocker: 'блокер', blocked: 'заблокировано', ready_for_human_draft_preview: 'готово к черновику', needs_metric_validation: 'нужны метрики' }; return labels[String(value || '').toLowerCase()] || value || 'нет данных'; }
function asText(value, fallback = '—') { if (value == null || value === '') return fallback; return String(value); }
function strategyLabel(value) { if (Array.isArray(value)) return value.map(strategyLabel).join(', '); return STRATEGY_LABELS[value] || String(value || 'режим не указан'); }
function roleLabel(value) { return ({ primary: 'primary', secondary: 'secondary', support: 'support', image_alt: 'image ALT', collection: 'collection', faq_commercial: 'FAQ/commercial', hold: 'hold', reject: 'reject' }[String(value || '')] || 'роль'); }
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
