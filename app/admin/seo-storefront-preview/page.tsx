// @ts-nocheck
import Link from 'next/link';
import FirstRealDraftClient from '@/app/admin/seo-engine/first-real-draft/FirstRealDraftClient';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ROW_LIMIT = 1000;
const ROW_SELECT = 'product_slug,card_title,current_seo_title,current_meta_description,current_h1,current_primary_image_alt,applied_seo_title,applied_meta_description,applied_h1,applied_primary_image_alt';

type Row = {
  product_slug: string;
  card_title: string | null;
  current_seo_title: string | null;
  current_meta_description: string | null;
  current_h1: string | null;
  current_primary_image_alt: string | null;
  applied_seo_title: string | null;
  applied_meta_description: string | null;
  applied_h1: string | null;
  applied_primary_image_alt: string | null;
};

async function loadRows() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { rows: [] as Row[], error: 'Нет серверного доступа к базе для админки.' };
  const { data, error } = await supabase
    .from('feya_commerce_v_admin_storefront_seo_preview_v1')
    .select(ROW_SELECT)
    .limit(ROW_LIMIT);
  if (error) return { rows: [] as Row[], error: error.message };
  return { rows: (data || []) as Row[], error: null };
}

function Pair({ label, current, approved }) {
  return <div className="min-w-0 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
    <div className="eyebrow-dim mb-2">{label}</div>
    <div className="grid min-w-0 gap-2 lg:grid-cols-2">
      <div className="min-w-0 break-words text-[12px] text-[var(--bone-dim)]">Сейчас: {current || '—'}</div>
      <div className="min-w-0 break-words text-[12px] text-bone">Одобрено: {approved || '—'}</div>
    </div>
  </div>;
}

export default async function SeoStorefrontPreviewPage({ searchParams }) {
  const params = await Promise.resolve(searchParams || {});
  const initialProductId = typeof params.product_id === 'string' ? params.product_id.trim() : '';
  const autoGenerate = params.generate === '1' && Boolean(initialProductId);
  const loadSavedDraft = params.saved === '1' && Boolean(initialProductId);
  const resaveSavedDraft = params.resave === '1' && loadSavedDraft;
  const recoverFailedDraft = params.recover === '1' && Boolean(initialProductId);
  // The catalog-wide current/applied audit is optional. It must not run on the
  // critical single-product generation path: the underlying view scans the
  // whole catalog and can exceed Postgres statement_timeout even while this
  // section is collapsed.
  const showCatalogComparison = params.comparison === '1';
  const { rows, error } = showCatalogComparison
    ? await loadRows()
    : { rows: [] as Row[], error: null };
  const withTitle = rows.filter((row) => row.applied_seo_title).length;
  const withMeta = rows.filter((row) => row.applied_meta_description).length;

  return <main className="owner-page min-w-0 overflow-x-hidden">
    <div className="owner-page-inner min-w-0">
      <header className="owner-page-head">
        <div className="min-w-0">
          <div className="owner-eyebrow">SEO · генерация и предпросмотр</div>
          <h1>SEO-предпросмотр</h1>
          <p>Генерируем SEO-пакет для выбранного товара и проверяем его в структуре карточки до сохранения, применения или публикации.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href={initialProductId ? `/admin/listing-master?product_id=${encodeURIComponent(initialProductId)}` : '/admin/listing-master'} className="owner-button primary">1. Фокус и ключи</Link>
          <Link href="/admin/seo-approval" className="owner-button">Проверка SEO</Link>
          <Link href="/admin/seo-applied-values" className="owner-button">SEO-значения</Link>
        </div>
      </header>

      <FirstRealDraftClient
        initialProductId={initialProductId}
        autoGenerate={autoGenerate}
        loadSavedDraft={loadSavedDraft}
        resaveSavedDraft={resaveSavedDraft}
        recoverFailedDraft={recoverFailedDraft}
      />

      <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '28px' }}>
        <summary>
          <span><strong>Каталожное сравнение</strong><small>Текущие / одобренные SEO-значения всех товаров</small></span>
          <span className="owner-section-kicker">Диагностика каталога</span>
        </summary>
        <div className="owner-disclosure-body min-w-0">
          {!showCatalogComparison ? <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-black/20 p-5">
            <p className="text-[12px] leading-relaxed text-[var(--bone-dim)]">
              Сравнение всех товаров не загружается во время генерации одного SEO Pack. Это отдельная диагностическая проверка каталога.
            </p>
            <Link
              href={`/admin/seo-storefront-preview?${new URLSearchParams({
                ...(initialProductId ? { product_id: initialProductId } : {}),
                comparison: '1',
              }).toString()}`}
              className="btn-ghost mt-4 inline-flex px-4 py-2 text-[10px]"
            >
              Загрузить сравнение отдельно
            </Link>
          </div> : null}
          {error ? <div className="mb-6 min-w-0 break-words rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-5 text-[var(--bone-dim)]">{error}</div> : null}
          {showCatalogComparison ? <><div className="mb-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-black/20 p-4"><div className="eyebrow-dim mb-2">Строки</div><div className="text-[28px] text-bone">{rows.length}</div></div>
            <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-black/20 p-4"><div className="eyebrow-dim mb-2">Заголовки</div><div className="text-[28px] text-bone">{withTitle}</div></div>
            <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-black/20 p-4"><div className="eyebrow-dim mb-2">Meta</div><div className="text-[28px] text-bone">{withMeta}</div></div>
          </div>
          <div className="min-w-0 space-y-4">
            {rows.length ? rows.slice(0, 100).map((row) => <article key={row.product_slug} className="min-w-0 rounded-2xl border border-[rgba(216,214,211,.12)] bg-black/20 p-4 sm:p-5">
              <div className="mb-4 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <Link href={`/admin/products/${row.product_slug}`} className="block break-words text-[18px] leading-snug text-bone hover:text-[var(--gold-warm)]">{row.card_title || row.product_slug}</Link>
                  <div className="mt-2 break-all text-[10px] uppercase tracking-[0.14em] text-[var(--smoke)]">/{row.product_slug}</div>
                </div>
                <Link href={`/admin/seo-lab/${row.product_slug}`} className="btn-ghost shrink-0 px-4 py-2 text-[10px]">SEO-лаборатория</Link>
              </div>
              <div className="min-w-0 space-y-2">
                <Pair label="SEO-заголовок" current={row.current_seo_title} approved={row.applied_seo_title} />
                <Pair label="Meta description" current={row.current_meta_description} approved={row.applied_meta_description} />
                <Pair label="H1" current={row.current_h1} approved={row.applied_h1} />
                <Pair label="ALT главного изображения" current={row.current_primary_image_alt} approved={row.applied_primary_image_alt} />
              </div>
            </article>) : <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-black/20 p-6 text-[13px] text-[var(--bone-dim)]">Строк для предпросмотра пока нет.</div>}
          </div></> : null}
        </div>
      </details>
    </div>
  </main>;
}
