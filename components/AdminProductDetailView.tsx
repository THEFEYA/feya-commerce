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

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ size?: number }>; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
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

export function AdminProductDetailView({ product, componentTruth }: { product: StorefrontProduct; componentTruth: ComponentTruthDiagnostic }) {
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

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <div className="col-span-12 lg:col-span-5 space-y-5">
          <Panel title="Медиа" icon={ImageIcon}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-[rgba(216,214,211,.10)] bg-black/25">
              {product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {media.slice(0, 8).map((item, index) => <div key={`${item.url || item.image_url}-${index}`} className="relative aspect-square rounded-lg overflow-hidden bg-black/25 border border-[rgba(216,214,211,.10)]">{item.url || item.image_url ? <img src={item.url || item.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>)}
            </div>
            {!media.length ? <div className="mt-3 text-[13px] text-[var(--bone-dim)]">Медиа недоступно в текущем контракте товара. Проверь очередь медиа или данные витрины.</div> : null}
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
          <Panel title="Блокеры запуска" icon={ShieldAlert}>
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

          <Panel title="Цены" icon={WalletCards}>
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
        </div>
      </div>
    </div>
  </main>;
}
