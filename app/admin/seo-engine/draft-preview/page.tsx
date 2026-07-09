// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileText, ShieldAlert, Sparkles } from 'lucide-react';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import { buildMockSeoAgentOutput } from '@/lib/seoAgentMockDraft';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import { buildSeoAgentPromptContract, summarizeSeoAgentPromptContract } from '@/lib/seoAgentDraftPrompt';
import SeoDraftSavePreflightClient from './SeoDraftSavePreflightClient';
import SeoAiDraftGenerateClient from './SeoAiDraftGenerateClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function param(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

function asText(value, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusTone(value) {
  const status = String(value || '').toLowerCase();
  if (status === 'valid' || status === 'pass' || status === 'draft') return 'success';
  if (status === 'blocked' || status === 'blocker') return 'danger';
  return 'warning';
}

function Pill({ children, tone = 'neutral' }) {
  const cls = tone === 'success'
    ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
    : tone === 'danger'
      ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
      : tone === 'gold' || tone === 'warning'
        ? 'border-[rgba(212,178,106,.35)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.08)]'
        : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${cls}`}>{children}</span>;
}

function Section({ label, children }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1.5">{label}</div>
    <div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">{children}</div>
  </div>;
}

function Fact({ label, value, tone }) {
  const cls = tone === 'success' ? 'text-[#a9dfbd]' : tone === 'warning' ? 'text-[var(--gold-warm)]' : tone === 'danger' ? 'text-[var(--ruby-soft)]' : 'text-bone';
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-2.5">
    <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1">{label}</div>
    <div className={`text-[12px] leading-snug ${cls}`}>{asText(value)}</div>
  </div>;
}

function Notice({ children, tone = 'warning' }) {
  const cls = tone === 'danger' ? 'border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)]' : 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)]';
  return <div className={`rounded-2xl border ${cls} p-4 text-[var(--bone-dim)] mb-5`}>{children}</div>;
}

function ReviewList({ items = [] }) {
  return items.length ? <ul className="list-disc pl-5 space-y-1.5">{items.map((item, index) => <li key={`${item}-${index}`}>{translateUiText(item)}</li>)}</ul> : <span>—</span>;
}

function FaqList({ items = [] }) {
  return items.length ? <div className="space-y-3">{items.map((item, index) => <div key={`${item.question}-${index}`}>
    <div className="text-bone text-[12px]">{item.question || 'Вопрос требует проверки'}</div>
    <div className="mt-1 text-[12px] leading-relaxed text-[var(--bone-dim)]">{translateUiText(item.answer || 'Ответ требует проверки')}</div>
    <div className="mt-1"><Pill tone="gold">{translateIntent(item.intent)}</Pill></div>
  </div>)}</div> : <span>—</span>;
}

function Issues({ issues = [] }) {
  return issues.length ? <div className="grid md:grid-cols-2 gap-2">{issues.map((issue, index) => <div key={`${issue.code}-${index}`} className="rounded-xl border border-[rgba(212,178,106,.22)] bg-black/15 p-3">
    <div className="flex flex-wrap gap-2 mb-1.5"><Pill tone={issue.severity === 'blocker' ? 'danger' : 'warning'}>{translateSeverity(issue.severity)}</Pill><Pill>{translateIssueCode(issue.code)}</Pill></div>
    <div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">{translateUiText(issue.message || 'Нужна проверка.')}</div>
  </div>)}</div> : <div className="rounded-xl border border-[rgba(108,183,138,.25)] bg-[rgba(108,183,138,.06)] p-3 text-[12px] text-[#a9dfbd]">Валидатор не нашёл блокирующих ошибок в черновике.</div>;
}

function AgentReadiness({ strategy, promptSummary, promptHasPortfolio }) {
  const strategyLoaded = Boolean(strategy);
  const doctrine = promptSummary?.doctrine_summary || null;
  const researchCheckpoint = doctrine?.research_reload_checkpoint || null;
  const variationCheckpoint = doctrine?.variation_editing_checkpoint || null;

  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden mb-5">
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]">
      <div>
        <div className="eyebrow-gold">Готовность AI-агента</div>
        <div className="mt-1 text-bone text-[18px]">Проверка без кнопок и без поиска в JSON</div>
      </div>
      <Sparkles size={17} className="text-[var(--gold-warm)]" />
    </div>
    <div className="p-4 space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Fact label="Стратегия портфеля" value={strategyLoaded ? 'загружена' : 'нет'} tone={strategyLoaded ? 'success' : 'warning'} />
        <Fact label="Стратегия в prompt" value={promptHasPortfolio ? 'да' : 'нет'} tone={promptHasPortfolio ? 'success' : 'warning'} />
        <Fact label="Классификация" value={translateClassification(strategy?.classification)} tone={strategyLoaded ? 'success' : 'warning'} />
        <Fact label="Риск" value={translateRisk(strategy?.risk_level)} tone={strategy?.risk_level === 'high' ? 'danger' : strategyLoaded ? 'warning' : undefined} />
      </div>

      {doctrine ? <div className="rounded-2xl border border-[rgba(108,183,138,.24)] bg-[rgba(108,183,138,.045)] p-3 space-y-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Fact label="Doctrine" value={doctrine.version} tone="success" />
          <Fact label="PDP-блоков" value={doctrine.pdp_block_count} tone="success" />
          <Fact label="Buyer facts" value={doctrine.buyer_fact_count} tone="success" />
          <Fact label="Visual truth" value={doctrine.visual_truth_rule_count} tone="success" />
        </div>
        <div className="grid lg:grid-cols-2 gap-3">
          <Section label="Финальный research checkpoint">{researchCheckpoint?.admin_note_ru || 'Перед финальным apply/publish нужно заново сверить последние исследования.'}</Section>
          <Section label="Единый редактор товара">{variationCheckpoint?.admin_note_ru || 'Вариации, комплектация, PDP-тексты, slug/meta и sitemap должны быть в одном потоке редактирования.'}</Section>
        </div>
      </div> : <div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-black/15 p-3 text-[12px] text-[var(--gold-warm)]">Doctrine summary ещё не пришёл в prompt summary. Нужно проверить сборку prompt-контракта.</div>}

      <div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.06)] p-3 text-[12px] leading-relaxed text-[var(--bone-dim)]">
        Это не кнопка. Это серверная проверка: страница уже собрала будущий prompt для OpenAI-агента и показывает, дошла ли туда стратегия дифференциации, doctrine правил, визуальная логика и checkpoint перед будущим применением к товару. Реальный publish выключен.
      </div>
      {strategyLoaded ? <div className="grid lg:grid-cols-2 gap-3">
        <Section label="Что должен сделать будущий агент">{translateUiText(strategy.agent_instruction_summary || 'Стратегия есть, но короткое описание не найдено.')}</Section>
        <Section label="Угол товара">{translateUiText(strategy.primary_angle_to_own || 'Нужен отдельный product angle.')}</Section>
        <Section label="Стратегия title / H1"><ReviewList items={[strategy.title_strategy, strategy.h1_strategy].filter(Boolean)} /></Section>
        <Section label="Стратегия meta / body"><ReviewList items={[strategy.meta_strategy, strategy.body_strategy].filter(Boolean)} /></Section>
        <Section label="Оставить кластерные слова"><ReviewList items={strategy.keep_cluster_terms || []} /></Section>
        <Section label="Не переспамить"><ReviewList items={strategy.avoid_overusing_terms || []} /></Section>
        <Section label="Обязательные отличия"><ReviewList items={strategy.required_differentiators || []} /></Section>
        <Section label="Ближайший похожий товар">{strategy.nearest_catalog_match ? `${strategy.nearest_catalog_match.title || strategy.nearest_catalog_match.product_slug || 'товар'} · ${strategy.nearest_catalog_match.overlap_pct ?? '—'}%` : '—'}</Section>
      </div> : <div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-black/15 p-3 text-[12px] text-[var(--gold-warm)]">Стратегия ещё не загружена. Нужно сначала на странице “Проверка SEO” нажать “Проверить текущий каталог” для сохранённого черновика.</div>}
      {promptSummary ? <div className="grid sm:grid-cols-3 gap-2">
        <Fact label="Prompt contract" value="собран" tone="success" />
        <Fact label="Символов system" value={promptSummary.system_prompt_chars} />
        <Fact label="Символов user" value={promptSummary.user_prompt_chars} />
      </div> : null}
    </div>
  </div>;
}

export default async function SeoDraftPreviewPage({ searchParams }) {
  const params = await searchParams;
  const productId = param(params?.product_id || params?.product).trim();
  const bundle = await buildSeoBriefContractBundle(productId);
  const product = bundle.product || null;
  const brief = bundle.brief || null;
  const seoPackDraft = bundle.seoPackDraft || null;
  const mockDraft = bundle.aiAgentInput ? buildMockSeoAgentOutput(bundle.aiAgentInput, brief) : null;
  const validation = mockDraft ? validateSeoAgentOutput(mockDraft) : null;
  const promptContract = bundle.aiAgentInput ? buildSeoAgentPromptContract(bundle.aiAgentInput) : null;
  const promptSummary = promptContract ? summarizeSeoAgentPromptContract(promptContract) : null;
  const portfolioStrategy = bundle.aiAgentInput?.portfolio_strategy || null;
  const promptHasPortfolio = Boolean(portfolioStrategy && promptContract?.user_prompt?.includes('Portfolio differentiation strategy'));
  const activeProductId = seoPackDraft?.canonical_product_id || product?.canonical_product_id || productId;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-7 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-5 mb-5">
        <div>
          <div className="eyebrow-gold mb-2">Админка · SEO · проверка черновика</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,64px)' }}>Проверка SEO-черновика</h1>
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Этот экран показывает черновик для проверки, готовность будущего AI-агента и безопасную draft-only генерацию. Здесь нет публикации и нет изменения товара.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeProductId ? <Link href={`/admin/seo-engine/briefs?product_id=${activeProductId}`} className="btn-ghost">Назад к SEO-брифу <ArrowUpRight size={13} /></Link> : null}
          {activeProductId ? <Link href={`/api/admin/seo-engine/brief-contract?product_id=${activeProductId}`} className="btn-ghost" target="_blank">Открыть JSON-контракт <ArrowUpRight size={13} /></Link> : null}
          <Link href="/admin/seo-engine/metric-import" className="btn-ghost">Импорт метрик <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {bundle.error ? <Notice tone="danger">{bundle.error}</Notice> : null}
      {!product ? <Notice tone="danger">Товар не найден в Product Focus view. Открой SEO-бриф с конкретным product_id.</Notice> : null}
      {product && !bundle.decision ? <Notice>Для этого товара нет сохранённого решения Listing Master. Черновик может быть неполным, потому что нет ручного Product DNA и выбранных ключей.</Notice> : null}

      {product && brief && seoPackDraft && mockDraft ? <>
        <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-5 mb-5">
          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold">Исходный товар</div><FileText size={17} className="text-[var(--gold-warm)]" /></div>
            <div className="p-4">
              <div className="grid sm:grid-cols-[118px_1fr] gap-4">
                <div className="h-32 rounded-xl overflow-hidden border border-[rgba(216,214,211,.10)] bg-black/30">
                  {product.primary_image_url ? <img src={product.primary_image_url} alt={product.primary_image_alt || product.card_title || ''} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">нет фото</div>}
                </div>
                <div>
                  <div className="text-bone text-[18px] leading-tight">{brief.productTitle}</div>
                  <div className="mt-2 text-[11px] text-[var(--bone-dim)]">ID: {activeProductId} · /{brief.productSlug}</div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-2">
                    <Fact label="Статус SEO-pack" value={translatePackStatus(seoPackDraft.status)} />
                    <Fact label="Статус брифа" value={translateBriefStatus(brief.status)} />
                    <Fact label="Главные ключи" value={seoPackDraft.keyword_roles.primary.length} />
                    <Fact label="Вторичные ключи" value={seoPackDraft.keyword_roles.secondary.length} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold">Контрольные проверки</div><ShieldAlert size={17} className="text-[var(--gold-warm)]" /></div>
            <div className="p-4 space-y-3">
              <div className="grid sm:grid-cols-3 gap-2">
                <Fact label="Черновик" value={translateDraftStatus(mockDraft.status)} />
                <Fact label="Валидатор" value={translateValidationStatus(validation?.status)} />
                <Fact label="Сохранение" value="нет" />
              </div>
              <div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.06)] p-3 text-[12px] leading-relaxed text-[var(--bone-dim)]">
                Главный текст ниже восстановлен из SEO-брифа, чтобы не терять качество preview. Сохранение в Supabase, OpenAI generation и publish остаются заблокированы до review gates.
              </div>
              <div className="flex flex-wrap gap-2"><Pill tone={statusTone(validation?.status)}>{translateValidationStatus(validation?.status)}</Pill><Pill tone="success">SEO baseline</Pill><Pill tone="warning">без записи в Supabase</Pill><Pill tone="warning">без публикации</Pill><Pill tone="warning">без реального OpenAI</Pill></div>
            </div>
          </div>
        </div>

        <AgentReadiness strategy={portfolioStrategy} promptSummary={promptSummary} promptHasPortfolio={promptHasPortfolio} />

        <div className="mb-5"><SeoAiDraftGenerateClient productId={activeProductId} /></div>

        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden mb-5">
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div><div className="eyebrow-gold">SEO-база / черновик для проверки</div><div className="mt-1 text-bone text-[18px]">Черновик восстановлен из SEO-брифа</div></div><Sparkles size={17} className="text-[var(--gold-warm)]" /></div>
          <div className="p-4 grid lg:grid-cols-[1fr_.85fr] gap-4">
            <div className="space-y-3">
              <Section label="SEO-заголовок">{mockDraft.seo_title}</Section>
              <Section label="H1-заголовок">{mockDraft.h1}</Section>
              <Section label="Meta description">{mockDraft.meta_description}</Section>
              <Section label="Intro / первый абзац">{mockDraft.intro}</Section>
            </div>
            <div className="space-y-3">
              <Section label="Тезисы"><ReviewList items={mockDraft.bullet_highlights || []} /></Section>
              <Section label="FAQ"><FaqList items={mockDraft.faq || []} /></Section>
              <Section label="ALT для изображений"><ReviewList items={(mockDraft.image_alt_candidates || []).map((item) => `${item.alt_text || 'ALT требует проверки'} · ${translateTruthBasis(item.truth_basis)}`)} /></Section>
              <Section label="Внутренние ссылки"><ReviewList items={(mockDraft.internal_linking_hints || []).map((item) => `${item.anchor || 'anchor'} → ${translateTargetType(item.target_type)} · ${translateUiText(item.reason || 'нужно проверить')}`)} /></Section>
              <Section label="Служебные заметки"><ReviewList items={mockDraft.generation_notes || []} /></Section>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden mb-5">
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div><div className="eyebrow-gold">Результат валидатора</div><div className="mt-1 text-bone text-[18px]">Перед любым будущим сохранением</div></div><CheckCircle2 size={17} className="text-[var(--gold-warm)]" /></div>
          <div className="p-4"><Issues issues={validation?.issues || []} /></div>
        </div>

        <div className="mb-5"><SeoDraftSavePreflightClient productId={activeProductId} /></div>

        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4">
          <div className="eyebrow-gold mb-3">Следующие действия пока намеренно заблокированы</div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-ghost opacity-60 cursor-not-allowed" disabled>Автосохранение AI-черновика — заблокировано</button>
            <button className="btn-ghost opacity-60 cursor-not-allowed" disabled>Одобрить к публикации — заблокировано</button>
            <button className="btn-ghost opacity-60 cursor-not-allowed" disabled>Применить к товару — заблокировано</button>
          </div>
        </div>
      </> : null}
    </section>
  </main>;
}

function translateIntent(value) {
  const map = { commercial: 'коммерческий', fit: 'размер', shipping: 'доставка', materials: 'материалы', styling: 'стилизация', care: 'уход', other: 'другое' };
  return map[value] || value || 'другое';
}

function translateSeverity(value) {
  const map = { blocker: 'блокер', warning: 'проверить', info: 'инфо' };
  return map[value] || value || 'проверить';
}

function translateIssueCode(value) {
  const map = {
    missing_output: 'нет output',
    invalid_contract_version: 'версия контракта',
    missing_seo_title: 'нет SEO title',
    missing_h1: 'нет H1',
    missing_meta_description: 'нет meta',
    missing_intro: 'нет intro',
    bullet_count: 'тезисы',
    faq_count: 'FAQ',
    image_alt_count: 'ALT',
    seo_title_audit_phrase: 'audit-стиль title',
    h1_audit_phrase: 'audit-стиль H1',
    meta_description_audit_phrase: 'audit-стиль meta',
    intro_audit_phrase: 'audit-стиль intro',
    seo_title_weak_availability: 'слабая формулировка',
    h1_weak_availability: 'слабая формулировка',
    meta_description_weak_availability: 'слабая формулировка',
    intro_weak_availability: 'слабая формулировка',
  };
  if (String(value || '').startsWith('pdp_block_audit_phrase')) return 'audit-стиль PDP';
  if (String(value || '').startsWith('pdp_block_weak_availability')) return 'слабая доступность';
  if (String(value || '').startsWith('pdp_block_materials_care_thin')) return 'тонкий уход/материал';
  if (String(value || '').startsWith('faq_audit_phrase')) return 'audit-стиль FAQ';
  if (String(value || '').startsWith('faq_weak_availability')) return 'слабая доступность FAQ';
  return map[value] || value || 'валидация';
}

function translateTruthBasis(value) {
  const map = { visible_product_fact: 'видимый факт товара', needs_image_review: 'нужна проверка фото' };
  return map[value] || value || 'нужна проверка';
}

function translateTargetType(value) {
  const map = { collection: 'коллекция', related_product: 'похожий товар', guide: 'гайд' };
  return map[value] || value || 'цель';
}

function translateDraftStatus(value) {
  const map = { draft: 'черновик', needs_review: 'нужна проверка', blocked: 'заблокирован' };
  return map[value] || value || '—';
}

function translatePackStatus(value) {
  const map = {
    brief_ready: 'бриф готов',
    draft_generated: 'черновик создан',
    needs_human_review: 'нужна ручная проверка',
    needs_keyword_review: 'нужна проверка ключей',
    needs_similarity_check: 'нужна проверка похожести',
    needs_image_alt_review: 'нужна проверка ALT',
    approved_draft: 'черновик одобрен',
    ready_for_publish: 'готов к публикации',
    published: 'опубликован',
    archived: 'архив',
  };
  return map[value] || value || '—';
}

function translateBriefStatus(value) {
  const map = { ready: 'готов', brief_ready: 'бриф готов', needs_metric_validation: 'нужна проверка метрик', blocked: 'заблокирован' };
  return map[value] || value || '—';
}

function translateValidationStatus(value) {
  const map = { valid: 'валидно', warning: 'есть предупреждения', blocked: 'заблокировано', invalid: 'ошибка', not_checked: 'не проверено', unknown: 'неизвестно' };
  return map[value] || value || 'неизвестно';
}

function translateClassification(value) {
  const map = {
    portfolio_clear: 'портфель чистый',
    strategic_cluster_overlap_needs_differentiation: 'кластер нормальный, нужна дифференциация',
    possible_duplicate_risk: 'риск дубля',
    source_mapping_issue: 'проблема source mapping',
  };
  return map[value] || value || '—';
}

function translateRisk(value) {
  const map = { low: 'низкий', medium: 'средний', high: 'высокий', mapping: 'mapping' };
  return map[value] || value || '—';
}

function translateUiText(value) {
  const text = String(value || '');
  const map = {
    'Mock output only. No OpenAI call was made.': 'Это тестовый черновик. Реальный OpenAI-вызов не выполнялся.',
    'Content fields are seeded from SeoPilotBrief.draftPreview to preserve the human-readable SEO baseline.': 'Текст взят из SEO-брифа, чтобы не потерять качество базового preview.',
    'Use this object to test validator, UI rendering, and future draft save gates.': 'Этот объект нужен для проверки валидатора, интерфейса и будущего безопасного сохранения.',
    'Human review, similarity check, and image ALT review are still required before publish readiness.': 'До готовности к публикации всё ещё нужны ручная проверка, проверка похожести и проверка ALT.',
    'Needs human answer before publish. Keep the answer specific to product facts, production, sizing, shipping, or styling context.': 'Нужен человеческий ответ перед публикацией. Ответ должен быть конкретным: факты товара, производство, размер, доставка или styling context.',
    'Collection keyword from the selected role map. Needs final URL review.': 'Ключ коллекции из выбранной карты ролей. Финальный URL нужно проверить.',
    'Customer-facing PDP block reads like visual audit, not buyer copy.': 'PDP-блок звучит как технический осмотр, а не как текст для покупателя.',
    'Customer-facing PDP block uses weak availability wording instead of clear service wording.': 'PDP-блок использует слабую формулировку доступности вместо уверенного описания сервиса.',
    'Materials & care block should mention practical cleaning/storage/shape care, not only list materials.': 'Блок материала и ухода должен объяснять чистку, хранение и сохранение формы, а не просто перечислять материал.',
    'FAQ reads like an audit note instead of answering a buyer concern.': 'FAQ звучит как техническая заметка, а не как ответ на вопрос покупателя.',
    'FAQ answer uses weak availability wording instead of clear service wording.': 'FAQ использует слабую формулировку доступности вместо нормального ответа покупателю.',
  };
  return map[text] || text;
}
