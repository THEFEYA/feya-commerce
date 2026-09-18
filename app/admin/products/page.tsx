import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { AdminCatalogRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PHASE_B_ADMIN_PRODUCTS_LIMIT = 350;

async function getProducts(): Promise<{ rows: AdminCatalogRow[]; error?: string }> {
  const supabase = getAdminReadClient();

  if (!supabase) {
    return { rows: [], error: getMissingAdminDataEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_step6_product_catalog_overview')
    .select('*')
    .limit(PHASE_B_ADMIN_PRODUCTS_LIMIT);

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data || []) as AdminCatalogRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function getTitle(row: AdminCatalogRow) {
  return asText(row.card_title || row.draft_site_title || row.h1 || row.source_title || row.raw_title, 'Без названия');
}

function readinessLabel(value: string) {
  const key = value.toLowerCase();
  if (key === 'ready_candidate') return 'Кандидат готов';
  if (key === 'ready' || key === 'approved') return 'Готово';
  if (key.includes('need')) return 'Нужно проверить';
  if (key.includes('block')) return 'Заблокировано';
  if (key === 'unknown') return 'Не определено';
  return value;
}

function publishLabel(value: string) {
  const key = value.toLowerCase();
  if (key === 'draft') return 'Черновик';
  if (key === 'blocked') return 'Публикация заблокирована';
  if (key === 'published') return 'Опубликовано';
  if (key === 'ready') return 'Готово к публикации';
  return value;
}

function getReadiness(row: AdminCatalogRow) {
  return asText(row.readiness_status || row.readiness_label || row.status, 'unknown');
}

function getPublishStatus(row: AdminCatalogRow) {
  if (row.do_not_publish_flag) return 'blocked';
  return asText(row.publish_status || row.storefront_status || row.publication_status, 'draft');
}

function getNextAction(row: AdminCatalogRow) {
  if (row.do_not_publish_flag) return 'Не публиковать до проверки';
  return asText(row.next_action || row.notes || row.review_reason || row.blocker_reason, 'Проверить в Product Builder');
}

function getStatusClass(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes('ready') || normalized.includes('approved') || normalized.includes('ok')) {
    return 'ok';
  }

  if (normalized.includes('block') || normalized.includes('missing') || normalized.includes('error') || normalized.includes('need')) {
    return 'danger';
  }

  return 'warning';
}

export default async function AdminProductsPage() {
  const { rows, error } = await getProducts();
  const blockedCount = rows.filter((row) => row.do_not_publish_flag).length;
  const visibleCount = rows.length - blockedCount;
  const needsReviewCount = rows.filter((row) => getStatusClass(getReadiness(row)) !== 'ok').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/review">Проверка</Link>
            <Link href="/admin/product-facts-review">Факты о товарах</Link>
            <Link href="/admin/seo-keywords">SEO и ключевые слова</Link>
            <Link href="/shop">Магазин</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Каталог товаров · только просмотр</div>
          <p>
            Каталог показывает текущую готовность, статус публикации и следующий шаг. Названия товаров и SEO-запросы сохраняются в оригинальном языке.
          </p>
        </section>

        <section className="section-head">
          <div>
            <h2>Товары</h2>
            <p className="muted">Каталог рабочих карточек товаров.</p>
          </div>
          <p className="muted">Загружено: {rows.length}</p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric">
            <strong>{rows.length}</strong>
            <span>Всего товаров</span>
          </div>
          <div className="card metric">
            <strong>{visibleCount}</strong>
            <span>Без блокировки</span>
          </div>
          <div className="card metric">
            <strong>{blockedCount}</strong>
            <span>Запрещено публиковать</span>
          </div>
          <div className="card metric">
            <strong>{needsReviewCount}</strong>
            <span>Нужно проверить готовность</span>
          </div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Etsy ID</th>
                <th>Готовность</th>
                <th>Публикация</th>
                <th>Следующий шаг</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const readiness = getReadiness(row);
                const publishStatus = getPublishStatus(row);

                return (
                  <tr key={row.canonical_product_id}>
                    <td><Link href={`/admin/products/${row.canonical_product_id}`}>{getTitle(row)}</Link></td>
                    <td>{asText(row.matched_etsy_listing_id || row.etsy_listing_id)}</td>
                    <td>
                      <span className={`status-pill ${getStatusClass(readiness)}`}>{readinessLabel(readiness)}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusClass(publishStatus)}`}>{publishLabel(publishStatus)}</span>
                    </td>
                    <td>{getNextAction(row)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
