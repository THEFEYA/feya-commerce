import Link from 'next/link';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { AdminCatalogRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PHASE_B_ADMIN_PRODUCTS_LIMIT = 350;

async function getProducts(): Promise<{ rows: AdminCatalogRow[]; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return { rows: [], error: getMissingSupabaseEnvMessage() };
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
  return asText(row.card_title || row.draft_site_title || row.h1 || row.source_title || row.raw_title, 'Untitled product');
}

function getReadiness(row: AdminCatalogRow) {
  return asText(row.readiness_status || row.readiness_label || row.status, 'unknown');
}

function getPublishStatus(row: AdminCatalogRow) {
  if (row.do_not_publish_flag) return 'blocked';
  return asText(row.publish_status || row.storefront_status || row.publication_status, 'draft');
}

function getNextAction(row: AdminCatalogRow) {
  if (row.do_not_publish_flag) return 'Do not publish until reviewed';
  return asText(row.next_action || row.notes || row.review_reason || row.blocker_reason, 'Review in Product Builder later');
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
            <Link href="/admin/review">Review</Link>
            <Link href="/shop">Shop</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Product overview gate</div>
          <p>
            Read-only product catalog overview. This screen prepares the future Product Builder by showing readiness, publication status and next action without allowing edits yet.
          </p>
        </section>

        <section className="section-head">
          <div>
            <h2>Product drafts</h2>
            <p className="muted">Read-only overview from the admin catalog view.</p>
          </div>
          <p className="muted">{rows.length} loaded</p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric">
            <strong>{rows.length}</strong>
            <span>Total product drafts loaded</span>
          </div>
          <div className="card metric">
            <strong>{visibleCount}</strong>
            <span>Not blocked in this view</span>
          </div>
          <div className="card metric">
            <strong>{blockedCount}</strong>
            <span>Do-not-publish flags</span>
          </div>
          <div className="card metric">
            <strong>{needsReviewCount}</strong>
            <span>Need readiness review</span>
          </div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Etsy ID</th>
                <th>Readiness</th>
                <th>Publish</th>
                <th>Next action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const readiness = getReadiness(row);
                const publishStatus = getPublishStatus(row);

                return (
                  <tr key={row.canonical_product_id}>
                    <td>{getTitle(row)}</td>
                    <td>{asText(row.matched_etsy_listing_id || row.etsy_listing_id)}</td>
                    <td>
                      <span className={`status-pill ${getStatusClass(readiness)}`}>{readiness}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusClass(publishStatus)}`}>{publishStatus}</span>
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
