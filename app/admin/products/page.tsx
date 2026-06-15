// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, Boxes, CheckCircle2, ImageIcon, Search, Tags, WalletCards } from 'lucide-react';
import { AdminProductsFilterClient } from '@/components/AdminProductsFilterClient';
import { getProductEvents, getProductFlags, getProductReadiness, toAdminProductTableRow, type AdminReviewEvent } from '@/lib/admin-readiness';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient, getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_V4_CARD_SELECT, STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

const ADMIN_PRODUCTS_LIMIT = 250;

async function getProducts(): Promise<{ rows: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V4)
    .select(STOREFRONT_V4_CARD_SELECT)
    .limit(ADMIN_PRODUCTS_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as StorefrontProduct[] };
}

async function getReviewEvents(): Promise<AdminReviewEvent[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('feya_commerce_v_admin_review_events_v1')
    .select('review_event_id,event_type,event_status,product_slug,canonical_product_id,created_at')
    .limit(1000);

  if (error) return [];
  return (data || []) as AdminReviewEvent[];
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
  const [{ rows, error }, reviewEvents] = await Promise.all([getProducts(), getReviewEvents()]);
  const readinessRows = rows.map((product) => {
    const events = getProductEvents(product, reviewEvents);
    return { product, readiness: getProductReadiness(product, events) };
  });
  const tableRows = readinessRows.map(({ product, readiness }) => toAdminProductTableRow(product, readiness));
  const totals = rows.reduce((acc, product) => {
    const flags = getProductFlags(product);
    const readiness = getProductReadiness(product, getProductEvents(product, reviewEvents));
    acc.configs += flags.configs.length;
    acc.label += flags.labelReview ? 1 : 0;
    acc.price += flags.priceReview ? 1 : 0;
    acc.components += flags.missingComponent;
    acc.media += flags.mediaReview ? 1 : 0;
    acc.ready += readiness.label === 'Ready for Storefront' ? 1 : 0;
    acc.blocked += readiness.label === 'Blocked' ? 1 : 0;
    return acc;
  }, { configs: 0, label: 0, price: 0, components: 0, media: 0, ready: 0, blocked: 0 });

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.12),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · Контроль товаров</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Товары</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Интерактивная таблица v4-каталога: готовность товара, цена, компоненты, медиа и события проверки.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="btn-ghost">Панель управления <ArrowUpRight size={13} /></Link>
          <Link href="/shop" className="btn-ghost">Витрина <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)] mb-7">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <Metric icon={Search} label="Товары" value={rows.length} note="Загружены из безопасного v4-контракта." />
        <Metric icon={Boxes} label="Опции" value={totals.configs} note="Публичные продаваемые варианты." />
        <Metric icon={Tags} label="Названия" value={totals.label} note="Требуют проверки названий." />
        <Metric icon={WalletCards} label="Цены" value={totals.price} note="Цены с неподтверждённым статусом." />
        <Metric icon={ImageIcon} label="Медиа" value={totals.media} note="Нет второго/hover/gallery сигнала." />
        <Metric icon={CheckCircle2} label="Готово" value={totals.ready} note={`Заблокировано: ${totals.blocked}`} />
      </div>

      <AdminProductsFilterClient rows={tableRows} />
    </section>
  </main>;
}
