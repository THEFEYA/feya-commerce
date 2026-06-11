import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { ReviewQueueSummary } from '@/lib/types';

async function getReviewQueues(): Promise<{ rows: ReviewQueueSummary[]; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return { rows: [], error: getMissingSupabaseEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_step8_review_queues_summary')
    .select('*');

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data || []) as ReviewQueueSummary[] };
}

function getTitle(row: ReviewQueueSummary) {
  return String(row.queue_name || row.queue_code || row.status || row.review_queue || 'Review queue');
}

function getCount(row: ReviewQueueSummary) {
  const value = row.item_count ?? row.count ?? row.row_count ?? row.total ?? 0;
  return typeof value === 'number' ? value : Number(value || 0);
}

export default async function AdminReviewPage() {
  const { rows, error } = await getReviewQueues();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <a href="/admin" className="brand-mark">TheFEYA Admin</a>
          <div className="nav-links">
            <a href="/admin/products">Products</a>
            <a href="/shop">Shop</a>
          </div>
        </nav>

        <section className="section-head">
          <div>
            <h2>Очереди проверки</h2>
            <p className="muted">Read-only dashboard из safe Supabase review view.</p>
          </div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <section className="grid admin-grid">
          {rows.map((row, index) => (
            <div className="card metric" key={`${getTitle(row)}-${index}`}>
              <strong>{getCount(row)}</strong>
              <span>{getTitle(row)}</span>
            </div>
          ))}
        </section>

        {!error && rows.length === 0 ? <div className="notice">Очереди пока не загружены.</div> : null}
      </div>
    </main>
  );
}
