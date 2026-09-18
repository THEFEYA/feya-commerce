// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Boxes, CheckCircle2, ImageIcon, Search, Tags, WalletCards } from 'lucide-react';
import { AdminProductsFilterClient } from '@/components/AdminProductsFilterClient';
import type { AdminProductTableRow, ReadinessTone, ReviewChip } from '@/lib/admin-readiness';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADMIN_PRODUCTS_VIEW = 'feya_commerce_v_step6_product_catalog_overview';
const STOREFRONT_ENRICHMENT_VIEW = 'feya_commerce_v_step7_storefront_products_api_v4';
const ADMIN_PRODUCTS_LIMIT = 500;

const ADMIN_PRODUCTS_SELECT = [
  'canonical_product_id',
  'source_shop_code',
  'primary_source_listing_id',
  'matched_etsy_listing_id',
  'source_url',
  'draft_site_title',
  'card_title',
  'product_type',
  'publish_status',
  'readiness_status',
  'do_not_publish_flag',
  'handmade_flag',
  'styled_imagery_flag',
  'configuration_count',
  'public_configuration_count',
  'price_row_count',
  'public_price_row_count',
  'public_min_price',
  'public_max_price',
  'has_fallback_price',
  'has_sampler_excluded_price',
  'missing_price_row_count',
  'media_count',
  'public_primary_media_count',
  'content_draft_count',
  'listing_match_count',
  'listing_match_review_count',
  'created_at',
  'updated_at'
].join(',');

const STOREFRONT_ENRICHMENT_SELECT = [
  'canonical_product_id',
  'product_slug',
  'primary_image_url',
  'primary_image_alt'
].join(',');

type AdminCatalogRow = {
  canonical_product_id: string;
  source_shop_code?: string | null;
  primary_source_listing_id?: string | null;
  matched_etsy_listing_id?: string | null;
  source_url?: string | null;
  draft_site_title?: string | null;
  card_title?: string | null;
  product_type?: string | null;
  publish_status?: string | null;
  readiness_status?: string | null;
  do_not_publish_flag?: boolean | null;
  handmade_flag?: boolean | null;
  styled_imagery_flag?: boolean | null;
  configuration_count?: number | null;
  public_configuration_count?: number | null;
  price_row_count?: number | null;
  public_price_row_count?: number | null;
  public_min_price?: number | null;
  public_max_price?: number | null;
  has_fallback_price?: boolean | null;
  has_sampler_excluded_price?: boolean | null;
  missing_price_row_count?: number | null;
  media_count?: number | null;
  public_primary_media_count?: number | null;
  content_draft_count?: number | null;
  listing_match_count?: number | null;
  listing_match_review_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProductEnrichment = {
  canonical_product_id: string;
  product_slug?: string | null;
  primary_image_url?: string | null;
  primary_image_alt?: string | null;
};

function toNumber(value: unknown) {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function numberOrZero(value: unknown) {
  return toNumber(value) ?? 0;
}

function formatMoney(value: unknown) {
  const numeric = toNumber(value);
  if (numeric == null) return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(numeric);
}

function formatPriceRange(row: AdminCatalogRow) {
  const min = toNumber(row.public_min_price);
  const max = toNumber(row.public_max_price);
  if (min == null && max == null) return 'No public price';
  if (min != null && max != null && min !== max) return `${formatMoney(min)}–${formatMoney(max)}`;
  return formatMoney(min ?? max) || 'No public price';
}

function buildSubtitle(row: AdminCatalogRow) {
  const parts = [
    row.source_shop_code || 'SHOP',
    row.matched_etsy_listing_id ? `Etsy ${row.matched_etsy_listing_id}` : row.primary_source_listing_id,
    row.product_type || 'Product'
  ].filter(Boolean);
  return parts.join(' · ');
}

function getReadiness(row: AdminCatalogRow): { label: AdminProductTableRow['readinessLabel']; tone: ReadinessTone } {
  if (row.do_not_publish_flag) return { label: 'Blocked', tone: 'danger' };
  if (numberOrZero(row.missing_price_row_count) > 0 || row.has_fallback_price || numberOrZero(row.public_price_row_count) === 0) {
    return { label: 'Needs Price Review', tone: 'warning' };
  }
  if (numberOrZero(row.public_primary_media_count) === 0) return { label: 'Needs Media QA', tone: 'warning' };
  if (numberOrZero(row.listing_match_review_count) > 0) return { label: 'Needs Label Review', tone: 'warning' };
  if (row.readiness_status === 'ready_candidate' || row.publish_status === 'published') return { label: 'Ready for Storefront', tone: 'success' };
  return { label: 'Draft', tone: 'neutral' };
}

function getReviewChips(row: AdminCatalogRow): ReviewChip[] {
  const chips: ReviewChip[] = [];
  if (numberOrZero(row.missing_price_row_count) > 0) chips.push({ label: 'Missing price', tone: 'warning' });
  if (row.has_fallback_price) chips.push({ label: 'Fallback price', tone: 'warning' });
  if (row.has_sampler_excluded_price) chips.push({ label: 'Sampler excluded', tone: 'warning' });
  if (numberOrZero(row.public_primary_media_count) === 0) chips.push({ label: 'Missing media', tone: 'danger' });
  if (numberOrZero(row.listing_match_review_count) > 0) chips.push({ label: 'Match review', tone: 'warning' });
  if (row.styled_imagery_flag) chips.push({ label: 'Styled imagery', tone: 'neutral' });
  if (!chips.length) chips.push({ label: 'OK', tone: 'neutral' });
  return chips;
}

function mapAdminProductRow(row: AdminCatalogRow, enrichment?: ProductEnrichment): AdminProductTableRow {
  const readiness = getReadiness(row);
  const publicConfigurations = numberOrZero(row.public_configuration_count);
  const totalConfigurations = numberOrZero(row.configuration_count);

  return {
    id: row.canonical_product_id,
    slug: enrichment?.product_slug || row.canonical_product_id,
    title: row.card_title || row.draft_site_title || row.matched_etsy_listing_id || row.canonical_product_id,
    imageUrl: enrichment?.primary_image_url || null,
    subtitle: buildSubtitle(row),
    price: formatPriceRange(row),
    confidence: row.has_fallback_price || numberOrZero(row.missing_price_row_count) > 0 ? 'Needs price review' : 'Public price',
    configCount: publicConfigurations,
    configNote: `${publicConfigurations} public / ${totalConfigurations} total`,
    readinessLabel: readiness.label,
    readinessTone: readiness.tone,
    reviewChips: getReviewChips(row),
  };
}

async function getProducts(): Promise<{ rows: AdminProductTableRow[]; sourceRows: AdminCatalogRow[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], sourceRows: [], error: getMissingSupabaseEnvMessage() };

  const [{ data: catalogRows, error: catalogError }, { data: enrichmentRows }] = await Promise.all([
    supabase
      .from(ADMIN_PRODUCTS_VIEW)
      .select(ADMIN_PRODUCTS_SELECT)
      .limit(ADMIN_PRODUCTS_LIMIT),
    supabase
      .from(STOREFRONT_ENRICHMENT_VIEW)
      .select(STOREFRONT_ENRICHMENT_SELECT)
      .limit(ADMIN_PRODUCTS_LIMIT)
  ]);

  if (catalogError) return { rows: [], sourceRows: [], error: catalogError.message };

  const enrichmentByProductId = new Map<string, ProductEnrichment>();
  (enrichmentRows || []).forEach((item: ProductEnrichment) => {
    if (item?.canonical_product_id) enrichmentByProductId.set(item.canonical_product_id, item);
  });

  const sourceRows = (catalogRows || []) as AdminCatalogRow[];
  return {
    sourceRows,
    rows: sourceRows.map((row) => mapAdminProductRow(row, enrichmentByProductId.get(row.canonical_product_id)))
  };
}

function Metric({ label, value, note, icon: Icon }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="eyebrow-dim">{label}</div>
      <Icon size={16} className="text-[var(--gold-warm)]" />
    </div>
    <div className="font-price text-gold-grad text-[38px] leading-none">{value}</div>
    <div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div>
  </div>;
}

export default async function AdminProductsPage() {
  const { rows, sourceRows, error } = await getProducts();

  const totals = sourceRows.reduce((acc, product) => {
    const readiness = getReadiness(product);
    acc.configs += numberOrZero(product.public_configuration_count);
    acc.label += numberOrZero(product.listing_match_review_count) > 0 ? 1 : 0;
    acc.price += numberOrZero(product.missing_price_row_count) > 0 || product.has_fallback_price || numberOrZero(product.public_price_row_count) === 0 ? 1 : 0;
    acc.media += numberOrZero(product.public_primary_media_count) === 0 ? 1 : 0;
    acc.ready += readiness.label === 'Ready for Storefront' ? 1 : 0;
    acc.blocked += readiness.label === 'Blocked' ? 1 : 0;
    return acc;
  }, { configs: 0, label: 0, price: 0, media: 0, ready: 0, blocked: 0 });

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · Контроль товаров</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Товары</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Интерактивная таблица полного admin-каталога: готовность товара, цена, компоненты, медиа и события проверки.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-ghost">Панель управления <ArrowUpRight size={13} /></Link>
          <Link href="/shop" className="btn-ghost">Витрина <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <Metric icon={Search} label="Товары" value={rows.length} note="Загружены из step6 admin catalog." />
        <Metric icon={Boxes} label="Опции" value={totals.configs} note="Публичные продаваемые варианты." />
        <Metric icon={Tags} label="Названия" value={totals.label} note="Требуют проверки названий." />
        <Metric icon={WalletCards} label="Цены" value={totals.price} note="Цены с неподтверждённым статусом." />
        <Metric icon={ImageIcon} label="Медиа" value={totals.media} note="Нет публичной primary media." />
        <Metric icon={CheckCircle2} label="Готово" value={totals.ready} note={`Заблокировано: ${totals.blocked}`} />
      </div>

      <AdminProductsFilterClient rows={rows} />
    </section>
  </main>;
}
