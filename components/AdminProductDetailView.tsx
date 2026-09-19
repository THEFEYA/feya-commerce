// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Boxes, ImageIcon, ShieldAlert, Tags, WalletCards } from 'lucide-react';
import { AdminReviewActionsClient } from '@/components/AdminReviewActionsClient';
import { componentEvidenceLabel, type ComponentTruthDiagnostic } from '@/lib/adminComponentTruth';
import { getProductFlags } from '@/lib/admin-readiness';
import { asMediaGallery, categoryLabel, colorLabel, formatPrice, optionLabel, optionPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

function blockerLabel(value: string) {
  if (value === 'canonical_product_truth_unavailable') return 'Факты товара недоступны';
  if (value === 'composition_missing_confirmed_components') return 'Состав ещё не подтверждён';
  if (value === 'composition_has_unresolved_facts') return 'Есть неразобранные факты';
  if (value === 'composition_has_review_blockers') return 'Есть блокеры проверки состава';
  return 'Нужно проверить состав';
}

function Chip({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'warning' | 'danger' }) {
  const cls = tone === 'danger'
    ? 'border-[rgba(196,64,88,.36)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${cls}`}>{children}</span>;
}

function Panel({ id, title, icon: Icon, children }: { id?: string; title: string; icon: React.ComponentType<{ size?: number }>; children: React.ReactNode }) {
  return <section id={id} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 scroll-mt-24">
    <div className="eyebrow-gold mb-4 flex items-center gap-2"><Icon size={14} /> {title}</div>
    {children}
  </section>;
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3"><div className="eyebrow-dim mb-1">{label}</div><div className="text-bone break-words">{value || '—'}</div></div>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4"><div className="eyebrow-dim mb-2">{label}</div><div className="text-bone text-[20px] leading-none">{value}</div></div>;
}

function Blocker({ label, active, detail }: { label: string; active: boolean; detail?: string }) {
  return <div className={`rounded-xl border p-4 ${active ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]' : 'border-[rgba(216,214,211,.10)] bg-black/15'}`}><div className="eyebrow-dim mb-2">{label}</div><div className={active ? 'text-[var(--gold-warm)]' : 'text-[var(--bone-dim)]'}>{active ? `Требует работы${detail ? ` · ${detail}` : ''}` : 'ОК'}</div></div>;
}

type OwnerProductContext = {
  brief?: Record<string, unknown> | null;
  cqa?: Record<string, unknown> | null;
  seoPage?: Record<string, unknown> | null;
  history?: Array<Record<string, unknown>>;
};

function textValue(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function contentBriefLabel(value: unknown) {
  const key = textValue(value, '').toUpperCase();
  const labels: Record<string,string> = {
    SHADOW_READY: 'Можно готовить безопасный черновик',
    CANONICAL_READY: 'Канонически готово',
    BLOCKED_KEYWORD_REVIEW: 'Нужна проверка ключевых слов',
    BLOCKED_PRODUCT_FACT_REVIEW: 'Блокируют факты товара',
    BLOCKED_GENERATION_GATE: 'Генерация пока закрыта',
    BLOCKED_NO_SEO_PAGE: 'Нет SEO-страницы',
  };
  return labels[key] || (key ? 'Требует проверки' : 'Данных пока нет');
}

function cqaLabel(value: unknown) {
  const key = textValue(value, '').toUpperCase();
  const labels: Record<string,string> = {
    APPROVED_NEEDS_COMPONENT_CLAIM_CHECK: 'Проверить утверждения о составе',
    APPROVED_NEEDS_SIMILARITY_CHECK: 'Проверить сходство контента',
    BLOCKED_BY_VALIDATION: 'Заблокировано автоматической проверкой',
    NEEDS_PRECHECKS: 'Нужны предварительные проверки',
    READY_FOR_HUMAN_AND_CQA_REVIEW: 'Готово к проверке человеком и CQA',
    READY_FOR_INDEPENDENT_CQA: 'Готово к независимой CQA',
    REVISION_REQUIRED: 'Нужны исправления',
  };
  return labels[key] || (key ? 'Контроль качества в процессе' : 'CQA ещё не создана');
}

function indexationLabel(value: unknown) {
  const key = textValue(value, '').toUpperCase();
  if (key === 'INDEXABLE') return 'Разрешена к индексации';
  if (key === 'NOINDEX') return 'Не индексировать';
  if (key === 'CANDIDATE') return 'Кандидат';
  return key ? 'Подготовка' : 'SEO-страница не создана';
}

function historyEventLabel(value: unknown) {
  const key = textValue(value, '').toLowerCase();
  const labels: Record<string,string> = {
    seo_ready_checked: 'Проверена SEO-готовность',
    order_draft_reviewed: 'Проверен черновик заказа',
    internal_note_added: 'Добавлена внутренняя заметка',
    needs_fix: 'Отмечено: нужны исправления',
    media_ready_checked: 'Проверены медиа',
    product_fact_reviewed: 'Проверены факты товара',
  };
  return labels[key] || 'Зафиксировано рабочее событие';
}

function eventStatusLabel(value: unknown) {
  const key = textValue(value, '').toLowerCase();
  if (key === 'approved') return 'Одобрено';
  if (key === 'recorded') return 'Записано';
  if (key === 'needs_fix') return 'Нужны исправления';
  if (key === 'rejected') return 'Отклонено';
  return key ? 'Зафиксировано' : '—';
}

function dateTimeLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return textValue(value);
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function AdminProductDetailView({ product, componentTruth, ownerContext = {} }: { product: StorefrontProduct; componentTruth: ComponentTruthDiagnostic; ownerContext?: OwnerProductContext }) {
  const flags = getProductFlags(product);
  const configs = flags.configs;
  const media = asMediaGallery(product);
  const missingComponents = flags.missingComponent;
  const labelReview = flags.labelReview;
  const priceReview = flags.priceReview;
  const mediaReview = flags.mediaReview;
  const componentBlocked = missingComponents > 0 || !componentTruth.available || componentTruth.blockers.length > 0;
  const componentEvidence = [...componentTruth.reviewBlockers, ...componentTruth.unresolvedFacts].slice(0, 8);
  const slugValue = productSlug(product);
  const storefrontAvailable = product.storefront_candidate_flag !== false && slugValue !== product.canonical_product_id;
  const storefrontHref = `/shop/${slugValue}`;
  const adminHref = `/admin/products/${slugValue}`;
  const brief = ownerContext.brief || null;
  const cqa = ownerContext.cqa || null;
  const seoPage = ownerContext.seoPage || null;
  const history = ownerContext.history || [];

  return <main className="owner-page">
    <div className="owner-page-inner">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-6 mb-7">
        <div className="max-w-4xl">
          <div className="owner-eyebrow">Товар · рабочее пространство</div>
          <h1 className="text-bone text-[22px] md:text-[24px] lg:text-[26px] leading-snug font-medium max-w-4xl">{productTitle(product)}</h1>
          <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[var(--bone-dim)]">Внутренняя карточка контроля товара. Данные могут приходить из витрины, Product Builder или резервного каталога. Действия ниже сохраняются как проверочные события и не меняют товар напрямую.</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Chip>{worldLabel(product)}</Chip>
            <Chip>{categoryLabel(product)}</Chip>
            <Chip>{colorLabel(product)}</Chip>
            {!storefrontAvailable ? <Chip tone="warning">Данные из резервного каталога</Chip> : null}
            {labelReview ? <Chip tone="warning">Проверить название</Chip> : null}
            {priceReview ? <Chip tone="warning">Проверить цену</Chip> : null}
            {componentTruth.blockers.map((blocker) => <Chip key={blocker} tone="danger">{blockerLabel(blocker)}</Chip>)}
            {missingComponents ? <Chip tone="danger">Нет компонентов витрины: {missingComponents}</Chip> : null}
            {mediaReview ? <Chip tone="danger">Проверить медиа</Chip> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products" className="owner-button">Назад к товарам</Link>
          {product.canonical_product_id ? <Link href={`/admin/listing-master?product_id=${encodeURIComponent(product.canonical_product_id)}`} className="owner-button primary">Мастер листинга</Link> : null}
          {product.canonical_product_id ? <Link href={`/admin/seo-storefront-preview?product_id=${encodeURIComponent(product.canonical_product_id)}`} className="owner-button">SEO-предпросмотр</Link> : null}
          {storefrontAvailable ? <Link href={storefrontHref} className="owner-button">Витрина <ArrowUpRight size={13} /></Link> : null}
        </div>
      </div>

      <nav className="owner-subnav" aria-label="Разделы товара" style={{ marginBottom: '20px' }}>
        <a href="#overview">Обзор</a>
        <a href="#facts">Факты</a>
        <a href="#content-search">Контент и поиск</a>
        <a href="#media">Медиа</a>
        <a href="#pricing">Цены и варианты</a>
        <a href="#history">История</a>
      </nav>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <div className="col-span-12 lg:col-span-5 space-y-5">
          <Panel id="media" title="Медиа" icon={ImageIcon}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-[rgba(216,214,211,.10)] bg-black/25">
              {product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {media.slice(0, 8).map((item, index) => <div key={`${item.url || item.image_url}-${index}`} className="relative aspect-square rounded-lg overflow-hidden bg-black/25 border border-[rgba(216,214,211,.10)]">{item.url || item.image_url ? <img src={item.url || item.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>)}
            </div>
            {!media.length ? <div className="mt-3 text-[13px] text-[var(--bone-dim)]">Медиа недоступно в текущем контракте товара. Проверь очередь медиа или данные витрины.</div> : null}
          </Panel>

          <Panel id="facts" title="Факты товара" icon={Tags}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Info label="Тип / категория" value={categoryLabel(product)} />
              <Info label="Контекст" value={worldLabel(product)} />
              <Info label="Материал" value={product.material || 'Нужно проверить'} />
              <Info label="Цвет" value={colorLabel(product)} />
            </div>
            <div className="mt-3 owner-card-meta" style={{ marginBottom: 0 }}>
              <span>Подтверждённых компонентов: {componentTruth.includedComponents.length}</span>
              <span>Вариантов источника: {componentTruth.sourceVariations.length}</span>
              <span>Строк цен компонентов: {componentTruth.optionPriceRows.length}</span>
            </div>
          </Panel>

          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span>
                <strong>Технические данные товара</strong>
                <small>ID, slug и исходные значения — только когда нужны</small>
              </span>
              <Tags size={15} className="text-[var(--gold-warm)]" />
            </summary>
            <div className="owner-disclosure-body space-y-3 text-[13px] text-[var(--bone-dim)]">
              <Info label="Канонический ID товара" value={product.canonical_product_id} />
              <Info label="ID листинга Etsy" value={product.matched_etsy_listing_id} />
              <Info label="Адрес страницы" value={product.product_slug} />
              <Info label="Материал" value={product.material} />
              <Info label="Исходный цвет" value={product.color} />
            </div>
          </details>
        </div>

        <div className="col-span-12 lg:col-span-7 space-y-5">
          <Panel id="overview" title="Блокеры запуска" icon={ShieldAlert}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Blocker label="Название" active={labelReview} />
              <Blocker label="Цена" active={priceReview} />
              <Blocker label="Компоненты" active={componentBlocked} detail={`${componentTruth.includedComponents.length} подтверждено · ${componentTruth.sourceVariations.length} вариантов источника · ${componentTruth.optionPriceRows.length} строк цен`} />
              <Blocker label="Медиа" active={mediaReview} />
            </div>
            {componentEvidence.length ? <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '14px' }}>
              <summary>
                <span>
                  <strong>Данные и доказательства состава</strong>
                  <small>{componentEvidence.length} записей требуют разбора</small>
                </span>
                <span className="owner-status is-warning">Нужно проверить</span>
              </summary>
              <div className="owner-disclosure-body">
                <div className="flex flex-wrap gap-1.5">{componentEvidence.map((item, index) => <Chip key={`${componentEvidenceLabel(item)}-${index}`} tone="danger">{componentEvidenceLabel(item)}</Chip>)}</div>
                {product.canonical_product_id ? <Link href={`/admin/review/components?product_id=${encodeURIComponent(product.canonical_product_id)}`} className="owner-button mt-4">Открыть проверку фактов товара</Link> : null}
              </div>
            </details> : null}
          </Panel>

          <AdminReviewActionsClient productSlug={slugValue} canonicalProductId={product.canonical_product_id} sourceRoute={adminHref} initialBlockers={{ label: labelReview, price: priceReview, component: componentBlocked, media: mediaReview }} />

          <Panel id="content-search" title="Контент и поиск" icon={Tags}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Info label="Контентное задание" value={contentBriefLabel(brief?.compiler_status)} />
              <Info label="Основной ключевой запрос" value={textValue(brief?.primary_keyword, 'Ещё не выбран')} />
              <Info label="Контроль качества" value={cqaLabel(cqa?.cqa_shadow_state)} />
              <Info label="SEO-страница" value={indexationLabel(seoPage?.indexation_intent || brief?.indexation_intent)} />
            </div>
            <div className="mt-3 owner-card-meta" style={{ marginBottom: 0 }}>
              <span>Основных групп запросов: {Number(seoPage?.primary_ownership_count || brief?.primary_ownership_count || 0)}</span>
              <span>Назначений запросов: {Number(seoPage?.ownership_count || brief?.ownership_count || 0)}</span>
              <span>Активных правил бизнеса: {Number(brief?.business_truth_count || 0)}</span>
            </div>
            <div className="owner-actions">
              {product.canonical_product_id ? <Link href={`/admin/content-briefs?q=${encodeURIComponent(product.canonical_product_id)}`} className="owner-button">Контентное задание</Link> : null}
              <Link href="/admin/content-qa" className="owner-button">Контроль качества</Link>
              {seoPage?.url_path ? <Link href={`/admin/seo-portfolio?q=${encodeURIComponent(String(seoPage.url_path))}`} className="owner-button">SEO-страница</Link> : null}
            </div>
          </Panel>

          <Panel id="pricing" title="Цены" icon={WalletCards}>
            <div className="grid sm:grid-cols-3 gap-3">
              <Metric label="Мин. цена" value={formatPrice(product.min_price, product.currency || 'EUR')} />
              <Metric label="Макс. цена" value={formatPrice(product.max_price, product.currency || 'EUR')} />
              <Metric label="Статус цены" value={product.price_confidence_status === 'verified' ? 'Подтверждена' : product.price_confidence_status === 'unverified' ? 'Нужно проверить' : product.price_confidence_status || 'Не определено'} />
            </div>
          </Panel>

          <Panel title="Опции товара" icon={Boxes}>
            <div className="rounded-xl border border-[rgba(216,214,211,.10)] overflow-hidden">
              <div className="grid grid-cols-[1.3fr_.7fr_.8fr_.8fr] gap-3 px-4 py-3 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">
                <div>Вариант</div><div>Цена</div><div>Компонент</div><div>Статусы</div>
              </div>
              <div className="divide-y divide-[rgba(216,214,211,.08)]">
                {configs.map((config, index) => <div key={`${optionLabel(config, index)}-${index}`} className="grid grid-cols-[1.3fr_.7fr_.8fr_.8fr] gap-3 px-4 py-3 text-[13px] items-center">
                  <div><div className="text-bone">{optionLabel(config, index)}</div><div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">{config.configuration_id || config.sellable_configuration_id || 'Нет ID'}</div></div>
                  <div className="font-price text-gold-grad text-[20px]">{formatPrice(optionPrice(config), product.currency || 'EUR')}</div>
                  <div>{config.component_code ? <span title={String(config.component_code)}><Chip>Назначен</Chip></span> : <Chip tone="danger">Нет</Chip>}</div>
                  <div className="flex flex-wrap gap-1.5">{config.is_full_set ? <Chip tone="warning">Полный комплект</Chip> : null}{config.is_bundle ? <Chip tone="warning">Комплект</Chip> : null}{config.needs_label_review ? <Chip tone="warning">Название</Chip> : null}</div>
                </div>)}
                {!configs.length ? <div className="p-4 text-[13px] text-[var(--bone-dim)]">Опции недоступны в текущем контракте товара. Для полного разбора нужны данные Product Builder.</div> : null}
              </div>
            </div>
          </Panel>

          <Panel id="history" title="История" icon={Boxes}>
            {history.length ? (
              <div className="owner-list">
                {history.map((event) => (
                  <article className="owner-list-row" key={String(event.review_event_id)}>
                    <div className="owner-list-row-main">
                      <div className="owner-card-meta">
                        <span>{eventStatusLabel(event.event_status)}</span>
                        <span>{dateTimeLabel(event.created_at)}</span>
                      </div>
                      <h3>{historyEventLabel(event.event_type)}</h3>
                      <p>{textValue(event.admin_note, 'Без дополнительной заметки.')}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="owner-empty">Для этого товара пока нет сохранённых рабочих событий. История появится после реальных проверок и изменений.</div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  </main>;
}
