// @ts-nocheck
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import Link from 'next/link';
import { ArrowUpRight, BadgePercent, Calculator, CircleDollarSign, ShieldCheck, WalletCards } from 'lucide-react';
import { AdminQueueQuickReviewClient } from '@/components/AdminQueueQuickReviewClient';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4, formatPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontConfiguration, StorefrontProduct } from '@/lib/types';
import { classifyConfigurationQuoteReadiness } from '@/lib/commerceQuoteReadiness';
import { classifyProductPriceAdoption, type PriceAdoptionEvidence } from '@/lib/commercePriceAdoption';
import sourceJson from '@/docs/search/closed-review-source-manifest-20260924.json';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PRICE_REVIEW_LIMIT = 500;
const QUOTE_PRICE_PAGE = 1000;
const RELEASE_PRODUCT_IDS = new Set(
  Array.isArray((sourceJson as any)?.entries)
    ? (sourceJson as any).entries.map((entry: any) => String(entry?.identity?.canonical_product_id || '')).filter(Boolean)
    : []
);

type QuotePriceRow = {
  configuration_price_id: string;
  canonical_product_id: string;
  sellable_configuration_id: string | null;
  source_amount: number | string | null;
  public_price_amount: number | string | null;
  manual_override_amount: number | string | null;
  source_currency: string | null;
  confidence: number | string | null;
  price_status: string | null;
  review_status: string | null;
  fallback_flag: boolean | null;
};

type QuoteConfigRow = {
  sellable_configuration_id: string;
  canonical_product_id: string;
  configuration_name: string | null;
  review_status: string | null;
  is_public_candidate: boolean | null;
  is_sampler: boolean | null;
};

type QuoteReadinessRow = {
  price: QuotePriceRow;
  config: QuoteConfigRow | null;
  ready: boolean;
  reason_codes: string[];
};

const QUOTE_REASON_LABELS: Record<string,string> = {
  QUOTE_IDENTITY_INVALID: 'Неверный ID',
  SELLABLE_CONFIGURATION_MISSING: 'Нет sellable configuration',
  CONFIGURATION_NOT_APPROVED: 'Конфигурация не подтверждена',
  CONFIGURATION_NOT_PUBLIC: 'Не public candidate',
  SAMPLER_NOT_ORDERABLE: 'Sampler / не продаётся',
  PRICE_REVIEW_NOT_APPROVED: 'Цена не подтверждена',
  PRICE_STATUS_NOT_EXACT: 'Цена не exact',
  FALLBACK_PRICE_FORBIDDEN: 'Fallback price',
  PUBLIC_PRICE_INVALID: 'Нет exact public price',
  CURRENCY_INVALID: 'Валюта не подтверждена',
};

function parseConfigurations(value: unknown): StorefrontConfiguration[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as StorefrontConfiguration[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as StorefrontConfiguration[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

function money(value: number | null | undefined, currency = 'EUR') {
  return value == null ? '—' : formatPrice(value, currency);
}

function configPrice(config: StorefrontConfiguration) {
  return config.display_price_amount ?? config.sale_price_amount ?? config.price_amount ?? config.price ?? config.amount ?? config.min_price ?? null;
}

function labelText(config: StorefrontConfiguration) {
  return config.public_label || config.configuration_label || config.configuration_name || config.option_value || config.title || config.label || 'Option';
}

function needsPriceReview(product: StorefrontProduct) {
  const configs = parseConfigurations(product.configurations);
  return Boolean(
    product.needs_price_review ||
    product.price_confidence_status === 'unverified' ||
    product.has_unverified_discount ||
    configs.some((config) => config.price_confidence_status === 'unverified' || config.has_fallback_price || configPrice(config) == null)
  );
}

async function loadProducts(): Promise<{ rows: StorefrontProduct[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(PRICE_REVIEW_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: ((data || []) as StorefrontProduct[]).filter((row) => RELEASE_PRODUCT_IDS.has(String(row.canonical_product_id))) };
}

async function loadQuoteReadiness(): Promise<{ rows: QuoteReadinessRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const priceSelect = 'configuration_price_id,canonical_product_id,sellable_configuration_id,source_amount,public_price_amount,manual_override_amount,source_currency,confidence,price_status,review_status,fallback_flag';
  const configSelect = 'sellable_configuration_id,canonical_product_id,configuration_name,review_status,is_public_candidate,is_sampler';

  const [firstPrices, secondPrices, configs] = await Promise.all([
    supabase.from('feya_commerce_configuration_prices').select(priceSelect).order('configuration_price_id').range(0, QUOTE_PRICE_PAGE - 1),
    supabase.from('feya_commerce_configuration_prices').select(priceSelect).order('configuration_price_id').range(QUOTE_PRICE_PAGE, QUOTE_PRICE_PAGE * 2 - 1),
    supabase.from('feya_commerce_sellable_configurations').select(configSelect).order('sellable_configuration_id').limit(1000),
  ]);

  const error = firstPrices.error || secondPrices.error || configs.error;
  if (error) return { rows: [], error: error.message };

  const configById = new Map((configs.data || []).map((row: any) => [String(row.sellable_configuration_id), row as QuoteConfigRow]));
  const seen = new Set<string>();
  const prices = [...(firstPrices.data || []), ...(secondPrices.data || [])]
    .filter((row: any) => {
      const id = String(row.configuration_price_id || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    }) as QuotePriceRow[];

  const rows = prices.filter((price) => RELEASE_PRODUCT_IDS.has(String(price.canonical_product_id))).map((price) => {
    const config = price.sellable_configuration_id ? configById.get(price.sellable_configuration_id) || null : null;
    const result = classifyConfigurationQuoteReadiness({
      configuration_price_id: price.configuration_price_id,
      canonical_product_id: price.canonical_product_id,
      sellable_configuration_id: price.sellable_configuration_id,
      configuration_review_status: config?.review_status ?? null,
      configuration_is_public_candidate: config?.is_public_candidate ?? null,
      configuration_is_sampler: config?.is_sampler ?? null,
      price_status: price.price_status,
      price_review_status: price.review_status,
      fallback_flag: price.fallback_flag,
      public_price_amount: price.public_price_amount,
      source_currency: price.source_currency,
    });
    return { price, config, ready: result.ready, reason_codes: result.reason_codes };
  });
  return { rows };
}

function Chip({ children, tone = 'neutral' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.30)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.07)]'
      : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${className}`}>{children}</span>;
}

function Metric({ label, value, note, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div>
    <div className="font-price text-gold-grad text-[38px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export default async function AdminPriceReviewPage() {
  const [{ rows, error }, quoteReadiness] = await Promise.all([loadProducts(), loadQuoteReadiness()]);
  const combinedError = error || quoteReadiness.error;
  const reviewRows = rows
    .filter(needsPriceReview)
    .slice(0, 160);

  const productById = new Map(rows.map((product) => [String(product.canonical_product_id), product]));
  const quoteReadyRows = quoteReadiness.rows.filter((row) => row.ready);
  const quoteBlockedRows = quoteReadiness.rows.filter((row) => !row.ready);
  const quoteReadyProducts = new Set(quoteReadyRows.map((row) => row.price.canonical_product_id));
  const quoteBlockedProducts = new Set(quoteBlockedRows.map((row) => row.price.canonical_product_id));

  const strictByProduct = new Map<string, QuoteReadinessRow[]>();
  for (const row of quoteReadiness.rows) {
    const list = strictByProduct.get(row.price.canonical_product_id) || [];
    list.push(row);
    strictByProduct.set(row.price.canonical_product_id, list);
  }
  const strictQueue = [...strictByProduct.entries()]
    .map(([productId, configRows]) => ({
      productId,
      product: productById.get(productId) || null,
      configRows,
      readyCount: configRows.filter((row) => row.ready).length,
      blockedCount: configRows.filter((row) => !row.ready).length,
      reasons: [...new Set(configRows.flatMap((row) => row.reason_codes))],
    }))
    .filter((item) => item.blockedCount > 0)
    .sort((a,b) => b.blockedCount - a.blockedCount || a.productId.localeCompare(b.productId))
    .slice(0, 120);

  const adoptionByProduct = [...strictByProduct.entries()].map(([productId, configRows]) => {
    const evidence: PriceAdoptionEvidence[] = configRows.map(({price,config}) => ({
      canonical_product_id: price.canonical_product_id,
      configuration_price_id: price.configuration_price_id,
      sellable_configuration_id: price.sellable_configuration_id,
      source_amount: price.source_amount,
      public_price_amount: price.public_price_amount,
      manual_override_amount: price.manual_override_amount,
      source_currency: price.source_currency,
      confidence: price.confidence,
      fallback_flag: price.fallback_flag,
      price_status: price.price_status,
      price_review_status: price.review_status,
      configuration_review_status: config?.review_status ?? null,
      configuration_is_public_candidate: config?.is_public_candidate ?? null,
      configuration_is_sampler: config?.is_sampler ?? null,
    }));
    return { productId, result: classifyProductPriceAdoption(evidence) };
  });
  const cleanBaselineProducts = adoptionByProduct.filter((x) => x.result.state === 'clean_source_baseline').length;
  const manualOverrideProducts = adoptionByProduct.filter((x) => x.result.state === 'manual_override_review').length;
  const alreadyReadyProducts = adoptionByProduct.filter((x) => x.result.state === 'already_ready').length;
  const adoptionHoldProducts = adoptionByProduct.filter((x) => x.result.state === 'hold').length;

  const unverifiedProducts = rows.filter((product) => product.price_confidence_status === 'unverified' || product.needs_price_review).length;
  const fallbackConfigs = rows.reduce((sum, product) => sum + parseConfigurations(product.configurations).filter((config) => config.has_fallback_price).length, 0);
  const missingConfigPrices = rows.reduce((sum, product) => sum + parseConfigurations(product.configurations).filter((config) => configPrice(config) == null).length, 0);
  const unverifiedDiscounts = rows.filter((product) => product.has_unverified_discount).length;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Admin Review · Prices</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Price review</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Очередь проверки цен перед запуском payment, feeds и SEO. Здесь видно unverified confidence, fallback prices, missing configuration prices и full set vs component sum.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-ghost">Admin cockpit <ArrowUpRight size={13} /></Link>
          <Link href="/admin/products" className="btn-ghost">Products <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {combinedError ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{combinedError}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Metric icon={ShieldCheck} label="Quote-ready products" value={quoteReadyProducts.size} note="Товары, у которых есть хотя бы одна конфигурация, прошедшая строгий server-quote gate." />
        <Metric icon={CircleDollarSign} label="Quote-ready configs" value={quoteReadyRows.length} note="Подтверждённая конфигурация + approved exact price + non-fallback + валидная валюта." />
        <Metric icon={WalletCards} label="Blocked products" value={quoteBlockedProducts.size} note="Товары с конфигурациями, которые пока нельзя превращать в authoritative quote." />
        <Metric icon={Calculator} label="Blocked configs" value={quoteBlockedRows.length} note="Каждая строка остаётся HOLD до устранения всех blocker reason codes." />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Metric icon={WalletCards} label="Unverified UI" value={unverifiedProducts} note="Legacy storefront confidence flags; не равны authoritative quote readiness." />
        <Metric icon={CircleDollarSign} label="Fallback configs" value={fallbackConfigs} note="Configurations using fallback price logic." />
        <Metric icon={Calculator} label="Missing prices" value={missingConfigPrices} note="Configurations without a detected price." />
        <Metric icon={BadgePercent} label="Discount flags" value={unverifiedDiscounts} note="Products with unverified discount state." />
      </div>

      <section className="rounded-2xl border border-[rgba(212,178,106,.20)] bg-[rgba(212,178,106,.035)] p-5 mb-8">
        <div className="eyebrow-gold mb-2">Baseline adoption candidates</div>
        <h2 className="font-tall text-bone leading-none text-[32px]">Не вводить цены заново</h2>
        <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">
          Отдельная проверка различает товары, где public price в точности совпадает с исходной ценой и имеет высокую уверенность,
          ручные owner overrides и необъяснимые расхождения. Это только evidence queue: она не подтверждает цены автоматически.
        </p>
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric icon={ShieldCheck} label="Clean source" value={cleanBaselineProducts} note="Можно собрать в точный owner-review batch без повторного ввода сумм." />
          <Metric icon={WalletCards} label="Manual overrides" value={manualOverrideProducts} note="Показывать отдельно: owner/manual price evidence нельзя смешивать с source carry-forward." />
          <Metric icon={CircleDollarSign} label="Already ready" value={alreadyReadyProducts} note="Все строки товара уже проходят текущий governance gate." />
          <Metric icon={Calculator} label="Other hold" value={adoptionHoldProducts} note="Необъяснимые или структурные расхождения; автоматический перенос запрещён." />
        </div>
      </section>

      <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 mb-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow-gold mb-2">Authoritative quote readiness</div>
            <h2 className="font-tall text-bone leading-none text-[32px]">Что реально блокирует цену заказа</h2>
            <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">
              Эта очередь читает исходные configuration/price rows и применяет тот же fail-closed gate, который будет стоять перед server quote.
              Display price, fallback и просто заполненная сумма не считаются подтверждённой ценой заказа.
            </p>
          </div>
          <div className="text-[11px] text-[var(--smoke)]">{quoteReadiness.rows.length} launch-release price rows checked</div>
        </div>

        <div className="mt-5 space-y-3">
          {strictQueue.slice(0, 40).map((item) => {
            const product = item.product;
            const href = product ? `/admin/products/${productSlug(product)}` : '/admin/products';
            return <article key={item.productId} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <Link href={href} className="text-bone text-[15px] leading-snug hover:text-[var(--gold-warm)] transition-colors">
                    {product ? productTitle(product) : item.productId}
                  </Link>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">
                    {item.readyCount} ready · {item.blockedCount} blocked configuration rows
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.reasons.slice(0, 8).map((reason) => <Chip key={reason} tone="danger">{QUOTE_REASON_LABELS[reason] || reason}</Chip>)}
                  </div>
                </div>
                <Link href={href} className="btn-ghost px-4 py-2 text-[10px]">Исправить <ArrowUpRight size={12} /></Link>
              </div>
            </article>;
          })}
          {!strictQueue.length && !quoteReadiness.error ? <div className="text-[13px] text-[var(--bone-dim)]">Все загруженные конфигурации прошли strict quote gate.</div> : null}
        </div>
      </section>

      <div className="space-y-4">
        {reviewRows.map((product) => {
          const currency = product.currency || 'EUR';
          const configs = parseConfigurations(product.configurations);
          const flaggedConfigs = configs.filter((config) => config.price_confidence_status === 'unverified' || config.has_fallback_price || configPrice(config) == null).slice(0, 6);
          const fullSetPrice = product.full_set_display_price_amount;
          const componentSum = product.component_sum_display_price_amount;
          const savings = product.full_set_savings_amount;
          const adminHref = `/admin/products/${productSlug(product)}`;
          return <article key={product.canonical_product_id} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
            <div className="grid grid-cols-[76px_1fr_auto] gap-4 items-start">
              <div className="relative h-24 w-[76px] rounded-lg overflow-hidden bg-black/30 border border-[rgba(216,214,211,.10)]">
                {product.primary_image_url ? <img src={product.primary_image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
              </div>
              <div>
                <Link href={adminHref} className="text-bone text-[17px] leading-snug hover:text-[var(--gold-warm)] transition-colors">{productTitle(product)}</Link>
                <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{worldLabel(product)} · {product.category_label || product.product_type || 'Product'} · {product.canonical_color_label || product.color || 'Color'}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip tone="warning">{product.price_confidence_status || 'unknown price'}</Chip>
                  {product.needs_price_review ? <Chip tone="danger">Needs price review</Chip> : null}
                  {product.has_unverified_discount ? <Chip tone="danger">Unverified discount</Chip> : null}
                </div>
                <AdminQueueQuickReviewClient productSlug={productSlug(product)} canonicalProductId={product.canonical_product_id} sourceRoute="/admin/review/prices" approvedEventType="price_review_approved" subjectType="price" approvedLabel="Mark price reviewed" />
              </div>
              <Link href={adminHref} className="btn-ghost px-4 py-3 text-[10px]">Review <ArrowUpRight size={12} /></Link>
            </div>

            <div className="mt-5 grid md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Full set</div>
                <div className="font-price text-bone text-[22px] leading-none">{money(fullSetPrice, currency)}</div>
              </div>
              <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Component sum</div>
                <div className="font-price text-bone text-[22px] leading-none">{money(componentSum, currency)}</div>
              </div>
              <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Savings</div>
                <div className="font-price text-gold-grad text-[22px] leading-none">{money(savings, currency)}</div>
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {flaggedConfigs.map((config, index) => <div key={config.configuration_id || `${product.canonical_product_id}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
                <div className="eyebrow-dim mb-2">Configuration price</div>
                <div className="text-bone text-[14px] leading-snug">{labelText(config)}</div>
                <div className="mt-2 font-price text-gold-grad text-[21px] leading-none">{money(configPrice(config), config.currency || currency)}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {config.price_confidence_status === 'unverified' ? <Chip tone="warning">Unverified</Chip> : null}
                  {config.has_fallback_price ? <Chip tone="danger">Fallback price</Chip> : null}
                  {configPrice(config) == null ? <Chip tone="danger">Missing price</Chip> : null}
                </div>
              </div>)}
              {!flaggedConfigs.length ? <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4 text-[13px] text-[var(--bone-dim)]">Product-level price flag only. No flagged configuration rows in current payload.</div> : null}
            </div>
          </article>;
        })}

        {!reviewRows.length ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-6 text-[13px] text-[var(--bone-dim)]">No price review rows returned from storefront contract.</div> : null}
      </div>
    </section>
  </main>;
}
