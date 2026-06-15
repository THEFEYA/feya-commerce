// @ts-nocheck
import Link from 'next/link';
import { AdminSeoChangeSetCreateClient } from '@/components/AdminSeoChangeSetCreateClient';
import { getMissingSupabaseEnvMessage, getSupabaseServiceClient } from '@/lib/supabase';
import { STOREFRONT_VIEW_V4 } from '@/lib/storefront';
import { buildSeoApplyPreviews, summarizeSeoApplyPreviews } from '@/lib/seo-apply-preview';
import type { AdminReviewEvent } from '@/lib/admin-readiness';
import type { StorefrontProduct } from '@/lib/types';

export const revalidate = 300;

const LIMIT = 50;
const PRODUCT_SELECT = [
  'canonical_product_id',
  'product_slug',
  'card_title',
  'h1',
  'seo_title',
  'meta_description',
  'product_type',
  'material',
  'color',
  'primary_image_url',
  'primary_image_alt',
].join(',');

async function loadProducts() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };
  const { data, error } = await supabase.from(STOREFRONT_VIEW_V4).select(PRODUCT_SELECT).limit(LIMIT);
  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[], error: null };
}

async function loadReviewEvents(): Promise<AdminReviewEvent[]> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from('feya_commerce_v_admin_review_events_v1').select('review_event_id,event_type,event_status,product_slug,canonical_product_id,created_at').limit(1000);
  if (error) return [];
  return (data || []) as AdminReviewEvent[];
}

export default async function SeoApplyPreviewPage() {
  const [{ products, error }, events] = await Promise.all([loadProducts(), loadReviewEvents()]);
  const previews = buildSeoApplyPreviews(products, events);
  const summary = summarizeSeoApplyPreviews(previews);
  const visiblePreviews = previews.slice(0, LIMIT);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
      <section className="container-feya pb-16 pt-10">
        <div className="mb-7 border-b border-[rgba(216,214,211,.12)] pb-7">
          <div className="eyebrow-gold mb-3">Админка · SEO Apply</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>SEO Apply</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Внутренний предпросмотр SEO-изменений. На этой странице теперь видны и pending rows, чтобы можно было создать change set.</p>
          <div className="mt-5 flex gap-3">
            <Link href="/admin/seo-change-sets" className="btn-ghost">Change Sets</Link>
            <Link href="/admin/seo-export" className="btn-ghost">SEO Export</Link>
            <Link href="/admin/seo-approval" className="btn-ghost">SEO Approval</Link>
          </div>
        </div>

        {error ? <div className="mb-7 rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--bone-dim)]">{error}</div> : null}

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-3">Предпросмотр</div><div className="font-price text-gold-grad text-[40px] leading-none">{summary.total || 0}</div></div>
          <div className="rounded-2xl border border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)] p-5"><div className="eyebrow-dim mb-3">Готово</div><div className="font-price text-gold-grad text-[40px] leading-none">{summary['Ready for Change Set'] || 0}</div></div>
          <div className="rounded-2xl border border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)] p-5"><div className="eyebrow-dim mb-3">Заблокировано</div><div className="font-price text-gold-grad text-[40px] leading-none">{summary.Blocked || 0}</div></div>
          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-3">Поля с изменениями</div><div className="font-price text-gold-grad text-[40px] leading-none">{summary.changedFields || 0}</div></div>
        </div>

        <div className="space-y-4">
          {visiblePreviews.map((preview) => (
            <article key={preview.productSlug} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full border border-[rgba(212,178,106,.30)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">{preview.status}</span>
                    <span className="inline-flex rounded-full border border-[rgba(212,178,106,.30)] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">score {preview.score}</span>
                  </div>
                  <Link href={`/admin/seo-lab/${preview.productSlug}`} className="text-bone text-[18px] leading-snug hover:text-[var(--gold-warm)]">{preview.title}</Link>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">/{preview.productSlug}</div>
                </div>
                <Link href={`/admin/products/${preview.productSlug}`} className="btn-ghost px-4 py-2 text-[10px]">Товар</Link>
              </div>

              {preview.blockers.length ? <div className="mt-4 rounded-xl border border-[rgba(196,64,88,.30)] bg-[rgba(160,32,56,.08)] p-3 text-[12px] leading-relaxed text-[var(--bone-dim)]">{preview.blockers.join(' ')}</div> : null}

              <div className="mt-5 space-y-2">
                {preview.fields.map((field) => (
                  <div key={field.field} className="grid gap-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3 lg:grid-cols-[170px_1fr_1fr_88px]">
                    <div className="eyebrow-dim">{field.field}</div>
                    <div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">{field.currentValue || '—'}</div>
                    <div className="text-[12px] leading-relaxed text-bone">{field.proposedValue || '—'}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">{field.changed ? 'change' : 'same'}</div>
                  </div>
                ))}
              </div>

              <AdminSeoChangeSetCreateClient productSlug={preview.productSlug} fields={preview.fields} />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
