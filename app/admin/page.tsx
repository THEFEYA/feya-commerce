// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Boxes, CheckCircle2, ClipboardCheck, ImageIcon, Layers3, PackageSearch, Tags, WalletCards } from 'lucide-react';
import { AdminReadinessOverviewClient } from '@/components/AdminReadinessOverviewClient';
import { getProductEvents, getProductFlags, getProductReadiness, type AdminReviewEvent } from '@/lib/admin-readiness';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, productSlug, productTitle } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

const ADMIN_MODULES = [
  { href: '/admin/products', label: 'Каталог товаров', note: 'товары, готовность, варианты и медиа', icon: PackageSearch },
  { href: '/admin/review/labels', label: 'Проверка названий', note: 'публичные названия и исходные подписи', icon: Tags },
  { href: '/admin/review/prices', label: 'Проверка цен', note: 'точность, публичная цена и скидка', icon: WalletCards },
  { href: '/admin/review/components', label: 'Состав и компоненты', note: 'компоненты, комплекты и полный набор', icon: Boxes },
  { href: '/admin/media', label: 'Проверка медиа', note: 'главное фото, вторая фотография и галерея', icon: ImageIcon },
  { href: '/admin/seo', label: 'SEO-готовность', note: 'заголовки, URL, связи и фиды', icon: Layers3 },
];

async function loadProducts() {
  const supabase = getAdminReadClient();
  if (!supabase) return { products: [], error: getMissingAdminDataEnvMessage() };

  const result = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(250);

  if (result.error) return { products: [], error: result.error.message };
  return { products: result.data || [], error: null };
}

async function loadReviewEvents(): Promise<AdminReviewEvent[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('feya_commerce_v_admin_review_events_v1')
    .select('review_event_id,event_type,event_status,product_slug,canonical_product_id,created_at')
    .limit(1000);

  if (error) return [];
  return (data || []) as AdminReviewEvent[];
}

function summarize(products: StorefrontProduct[], reviewEvents: AdminReviewEvent[]) {
  const readinessCounts = new Map<string, number>();
  let configurations = 0;
  let missingComponent = 0;
  let labelReview = 0;
  let mediaNeedsReview = 0;
  let unverifiedPrice = 0;

  for (const product of products) {
    const flags = getProductFlags(product);
    const readiness = getProductReadiness(product, getProductEvents(product, reviewEvents));
    readinessCounts.set(readiness.label, (readinessCounts.get(readiness.label) || 0) + 1);
    configurations += flags.configs.length;
    missingComponent += flags.missingComponent;
    labelReview += flags.labelReview ? 1 : 0;
    mediaNeedsReview += flags.mediaReview ? 1 : 0;
    unverifiedPrice += flags.priceReview ? 1 : 0;
  }

  const ready = readinessCounts.get('Ready for Storefront') || 0;
  const blocked = readinessCounts.get('Blocked') || 0;
  const draft = readinessCounts.get('Draft') || 0;
  const needsReview = Math.max(0, products.length - ready - blocked - draft);

  return {
    products: products.length,
    configurations,
    labelReview,
    missingComponent,
    unverifiedPrice,
    mediaNeedsReview,
    ready,
    blocked,
    draft,
    needsReview,
    readinessCounts,
  };
}

function StatCard({ label, value, note, tone = 'default' }) {
  const toneClass = tone === 'warning'
    ? 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]'
    : tone === 'danger'
      ? 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]'
      : tone === 'success'
        ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]'
        : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${toneClass} p-5 min-h-[145px]`}>
    <div className="eyebrow-dim mb-4">{label}</div>
    <div className="font-price text-gold-grad text-[42px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

function QueueRow({ label, count, note, href, icon: Icon }) {
  return <Link href={href} className="group grid grid-cols-[36px_1fr_auto] gap-4 items-center rounded-2xl border border-[rgba(216,214,211,.11)] bg-[rgba(255,255,255,.025)] p-4 hover:border-[rgba(212,178,106,.45)] hover:bg-[rgba(212,178,106,.05)] transition-all">
    <div className="h-9 w-9 rounded-full border border-[rgba(216,214,211,.14)] bg-black/25 flex items-center justify-center text-[var(--gold-warm)]"><Icon size={16} /></div>
    <div>
      <div className="text-bone text-[15px] leading-tight">{label}</div>
      <div className="mt-1 text-[12px] text-[var(--bone-dim)]">{note}</div>
    </div>
    <div className="flex items-center gap-3">
      <span className="font-price text-[24px] text-gold-grad">{count}</span>
      <ArrowUpRight size={14} className="text-[var(--bone-dim)] group-hover:text-white" />
    </div>
  </Link>;
}

function StatusPill({ children, tone = 'neutral' }) {
  const cls = tone === 'success'
    ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
    : tone === 'danger'
      ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
      : tone === 'warning'
        ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
        : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`rounded-full border px-2 py-1 text-[9px] uppercase tracking-[.16em] ${cls}`}>{children}</span>;
}

export default async function AdminPage() {
  const [{ products, error }, reviewEvents] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const stats = summarize(products, reviewEvents);
  const priorityProducts = products
    .map((product) => ({ product, readiness: getProductReadiness(product, getProductEvents(product, reviewEvents)) }))
    .filter(({ readiness }) => readiness.label !== 'Ready for Storefront')
    .slice(0, 8);

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.14),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">FEYA · Внутренняя админка</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(46px,7vw,96px)' }}>Панель контроля</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Внутренняя панель качества каталога: v4-контракт, единая логика готовности, проверочные события, названия, цены, компоненты, медиа, SEO-готовность и черновики заказов.</p>
        </div>
        <Link href="/shop" className="btn-ghost self-start lg:self-auto">Витрина <ArrowUpRight size={13} /></Link>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <AdminReadinessOverviewClient products={stats.products} labelReview={stats.labelReview} priceReview={stats.unverifiedPrice} componentIssues={stats.missingComponent} mediaReview={stats.mediaNeedsReview} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Готово" value={stats.ready} tone="success" note="Закрыто через общую логику готовности." />
        <StatCard label="Нужна проверка" value={stats.needsReview} tone="warning" note="Открыт этап названия, цены, компонентов, медиа или SEO." />
        <StatCard label="Черновики" value={stats.draft} note="Пока нет проверочных событий." />
        <StatCard label="Заблокировано" value={stats.blocked} tone="danger" note="Есть событие “нужны исправления”." />
        <StatCard label="Товары v4" value={stats.products} note="Срез storefront-контракта для админки." />
      </div>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <aside className="col-span-12 lg:col-span-4 space-y-4">
          <div className="eyebrow-gold mb-1">Очереди проверки</div>
          <QueueRow href="/admin/review/labels" icon={Tags} label="Проверка названий" count={stats.labelReview} note="Публичные названия без сырого служебного текста." />
          <QueueRow href="/admin/review/prices" icon={WalletCards} label="Проверка цен" count={stats.unverifiedPrice} note="Публичная цена, точность и готовность к запуску." />
          <QueueRow href="/admin/review/components" icon={Boxes} label="Проверка компонентов" count={stats.missingComponent} note="Состав товара, семейство компонентов и комплекты." />
          <QueueRow href="/admin/media" icon={ImageIcon} label="Проверка медиа" count={stats.mediaNeedsReview} note="Вторая фотография, глубина галереи и готовность изображений." />
          <QueueRow href="/admin/products" icon={CheckCircle2} label="Готово для витрины" count={stats.ready} note="Товары, прошедшие текущие проверки готовности." />
        </aside>

        <section className="col-span-12 lg:col-span-8 space-y-6">
          <div>
            <div className="eyebrow-gold mb-4">Рабочие разделы</div>
            <div className="grid md:grid-cols-2 gap-4">
              {ADMIN_MODULES.map(({ href, label, note, icon: Icon }) => <Link key={href} href={href} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 hover:border-[rgba(212,178,106,.45)] hover:bg-[rgba(212,178,106,.05)] transition-all">
                <div className="h-10 w-10 rounded-full border border-[rgba(216,214,211,.14)] bg-black/25 flex items-center justify-center text-[var(--gold-warm)] mb-4"><Icon size={17} /></div>
                <div className="text-bone text-[16px]">{label}</div>
                <div className="mt-2 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
              </Link>)}
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="eyebrow-gold mb-2">Товары, которые стоит проверить первыми</div>
                <div className="text-[12px] text-[var(--bone-dim)]">Первые товары, которые ещё не готовы для витрины. Нажатие открывает внутреннюю карточку товара.</div>
              </div>
              <ClipboardCheck size={18} className="text-[var(--gold-warm)]" />
            </div>
            <div className="space-y-2">
              {priorityProducts.map(({ product, readiness }) => <Link key={product.canonical_product_id} href={`/admin/products/${productSlug(product)}`} className="grid grid-cols-[44px_1fr_auto] gap-3 items-center rounded-xl border border-[rgba(216,214,211,.09)] bg-black/15 p-3 hover:border-[rgba(212,178,106,.36)] transition-all">
                <div className="relative h-12 w-11 rounded-md overflow-hidden bg-black/30">{product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
                <div>
                  <div className="text-bone text-[13px] leading-snug line-clamp-1">{productTitle(product)}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">{product.category_label || product.product_type || 'Товар'} · {product.canonical_color_label || product.color || 'Цвет не указан'}</div>
                </div>
                <StatusPill tone={readiness.tone}>{readiness.label}</StatusPill>
              </Link>)}
              {!priorityProducts.length ? <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 text-[13px] text-[var(--bone-dim)]">Нет товаров, требующих приоритетной проверки.</div> : null}
            </div>
          </div>
        </section>
      </div>
    </section>
  </main>;
}
