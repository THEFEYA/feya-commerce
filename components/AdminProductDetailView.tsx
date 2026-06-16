// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Boxes, ImageIcon, ShieldAlert, Tags, WalletCards } from 'lucide-react';
import { AdminReviewActionsClient } from '@/components/AdminReviewActionsClient';
import { getProductFlags } from '@/lib/admin-readiness';
import { asMediaGallery, categoryLabel, colorLabel, formatPrice, optionLabel, optionPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

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

export function AdminProductDetailView({ product }: { product: StorefrontProduct }) {
  const flags = getProductFlags(product);
  const configs = flags.configs;
  const media = asMediaGallery(product);
  const missingComponents = flags.missingComponent;
  const labelReview = flags.labelReview;
  const priceReview = flags.priceReview;
  const mediaReview = flags.mediaReview;
  const slugValue = productSlug(product);
  const storefrontAvailable = product.storefront_candidate_flag !== false && slugValue !== product.canonical_product_id;
  const storefrontHref = `/shop/${slugValue}`;
  const adminHref = `/admin/products/${slugValue}`;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div className="max-w-5xl">
          <div className="eyebrow-gold mb-3">Админка · Карточка товара</div>
          <h1 className="font-tall text-bone leading-[1.02] max-w-5xl" style={{ fontSize: 'clamp(30px,3.4vw,50px)' }}>{productTitle(product)}</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Внутренняя карточка контроля товара. Данные могут приходить из storefront, builder detail или catalog fallback; действия ниже сохраняются как проверочные события и не меняют товар напрямую.</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Chip>{worldLabel(product)}</Chip>
            <Chip>{categoryLabel(product)}</Chip>
            <Chip>{colorLabel(product)}</Chip>
            {!storefrontAvailable ? <Chip tone="warning">Catalog fallback</Chip> : null}
            {labelReview ? <Chip tone="warning">Проверить название</Chip> : null}
            {priceReview ? <Chip tone="warning">Проверить цену</Chip> : null}
            {missingComponents ? <Chip tone="danger">Нет компонентов: {missingComponents}</Chip> : null}
            {mediaReview ? <Chip tone="danger">Проверить медиа</Chip> : null}
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/products" className="btn-ghost">Товары</Link>
          {storefrontAvailable ? <Link href={storefrontHref} className="btn-ghost">Витрина <ArrowUpRight size={13} /></Link> : null}
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
            {!media.length ? <div className="mt-3 text-[13px] text-[var(--bone-dim)]">Медиа недоступно в текущем detail contract. Проверь media queue или storefront enrichment.</div> : null}
          </Panel>

          <Panel title="Идентичность товара" icon={Tags}>
            <div className="space-y-3 text-[13px] text-[var(--bone-dim)]">
              <Info label="Canonical product ID" value={product.canonical_product_id} />
              <Info label="Etsy listing ID" value={product.matched_etsy_listing_id} />
              <Info label="Slug" value={product.product_slug} />
              <Info label="Материал" value={product.material} />
              <Info label="Сырой цвет" value={product.color} />
            </div>
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-7 space-y-5">
          <Panel title="Блокеры запуска" icon={ShieldAlert}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Blocker label="Название" active={labelReview} />
              <Blocker label="Цена" active={priceReview} />
              <Blocker label="Компоненты" active={missingComponents > 0} detail={String(missingComponents)} />
              <Blocker label="Медиа" active={mediaReview} />
            </div>
          </Panel>

          <AdminReviewActionsClient productSlug={slugValue} canonicalProductId={product.canonical_product_id} sourceRoute={adminHref} initialBlockers={{ label: labelReview, price: priceReview, component: missingComponents > 0, media: mediaReview }} />

          <Panel title="Цены" icon={WalletCards}>
            <div className="grid sm:grid-cols-3 gap-3">
              <Metric label="Мин. цена" value={formatPrice(product.min_price, product.currency || 'EUR')} />
              <Metric label="Макс. цена" value={formatPrice(product.max_price, product.currency || 'EUR')} />
              <Metric label="Статус цены" value={product.price_confidence_status || 'unknown'} />
            </div>
          </Panel>

          <Panel title="Опции товара" icon={Boxes}>
            <div className="rounded-xl border border-[rgba(216,214,211,.10)] overflow-hidden">
              <div className="grid grid-cols-[1.3fr_.7fr_.8fr_.8fr] gap-3 px-4 py-3 border-b border-[rgba(216,214,211,.10)] text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">
                <div>Публичная опция</div><div>Цена</div><div>Компонент</div><div>Флаги</div>
              </div>
              <div className="divide-y divide-[rgba(216,214,211,.08)]">
                {configs.map((config, index) => <div key={`${optionLabel(config, index)}-${index}`} className="grid grid-cols-[1.3fr_.7fr_.8fr_.8fr] gap-3 px-4 py-3 text-[13px] items-center">
                  <div><div className="text-bone">{optionLabel(config, index)}</div><div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">{config.configuration_id || config.sellable_configuration_id || 'Нет ID'}</div></div>
                  <div className="font-price text-gold-grad text-[20px]">{formatPrice(optionPrice(config), product.currency || 'EUR')}</div>
                  <div>{config.component_code ? <Chip>{config.component_code}</Chip> : <Chip tone="danger">Нет</Chip>}</div>
                  <div className="flex flex-wrap gap-1.5">{config.is_full_set ? <Chip tone="warning">Полный комплект</Chip> : null}{config.is_bundle ? <Chip tone="warning">Комплект</Chip> : null}{config.needs_label_review ? <Chip tone="warning">Название</Chip> : null}</div>
                </div>)}
                {!configs.length ? <div className="p-4 text-[13px] text-[var(--bone-dim)]">Опции недоступны в текущем detail contract. Для полного разбора нужен builder detail row или отдельная lightweight detail view.</div> : null}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  </main>;
}
