import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { AdminCatalogRow } from '@/lib/types';

async function getProducts(): Promise<{ rows: AdminCatalogRow[]; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return { rows: [], error: getMissingSupabaseEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_step6_product_catalog_overview')
    .select('*')
    .limit(100);

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data || []) as AdminCatalogRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

export default async function AdminProductsPage() {
  const { rows, error } = await getProducts();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <a href="/admin" className="brand-mark">TheFEYA Admin</a>
          <div className="nav-links">
            <a href="/admin/review">Review</a>
            <a href="/shop">Shop</a>
          </div>
        </nav>

        <section className="section-head">
          <div>
            <h2>Product drafts</h2>
            <p className="muted">Read-only overview from the admin catalog view.</p>
          </div>
          <p className="muted">{rows.length} loaded</p>
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
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.canonical_product_id}>
                  <td>{asText(row.card_title || row.draft_site_title || row.h1)}</td>
                  <td>{asText(row.matched_etsy_listing_id || row.etsy_listing_id)}</td>
                  <td>{asText(row.readiness_status || row.readiness_label || row.status)}</td>
                  <td>{asText(row.publish_status)}</td>
                  <td>{row.do_not_publish_flag ? 'Do not publish' : asText(row.next_action || row.notes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
