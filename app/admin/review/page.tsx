import Link from 'next/link';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { ReviewQueueSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const REVIEW_QUEUE_SUMMARY_SELECT = [
  'queue_code',
  'status',
  'review_queue',
  'queue_name',
  'item_count',
  'count',
  'row_count',
  'total',
].join(',');

const REVIEW_COPY: Record<string, { title: string; priority: 'high' | 'medium' | 'low'; description: string; nextStep: string }> = {
  needs_price: {
    title: 'Needs price',
    priority: 'high',
    description: 'Products that cannot safely enter storefront logic until price data is resolved.',
    nextStep: 'Review source price rows and configuration prices.',
  },
  missing_media: {
    title: 'Missing media',
    priority: 'high',
    description: 'Products without enough image data for a reliable public product card or PDP.',
    nextStep: 'Check media drafts and source images before publishing.',
  },
  fallback_price_review_rows: {
    title: 'Fallback price review',
    priority: 'medium',
    description: 'Rows using visible/fallback pricing instead of stronger option-level price evidence.',
    nextStep: 'Confirm whether fallback prices are acceptable or need correction.',
  },
  storefront_excluded: {
    title: 'Storefront excluded',
    priority: 'medium',
    description: 'Products kept out of public storefront candidates by readiness or safety rules.',
    nextStep: 'Audit exclusion reasons before expanding public catalog.',
  },
  sampler_excluded_rows: {
    title: 'Sampler excluded',
    priority: 'low',
    description: 'Sampler/probnik rows intentionally excluded from public price ranges.',
    nextStep: 'Audit only. This is expected behavior, not a launch blocker.',
  },
};

async function getReviewQueues(): Promise<{ rows: ReviewQueueSummary[]; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return { rows: [], error: getMissingSupabaseEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_step8_review_queues_summary')
    .select(REVIEW_QUEUE_SUMMARY_SELECT);

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data || []) as ReviewQueueSummary[] };
}

function getCode(row: ReviewQueueSummary) {
  return String(row.queue_code || row.status || row.review_queue || row.queue_name || 'review_queue');
}

function getTitle(row: ReviewQueueSummary) {
  const code = getCode(row);
  return REVIEW_COPY[code]?.title || String(row.queue_name || code);
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
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Products</Link>
            <Link href="/shop">Shop</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Read-only admin gate</div>
          <p>
            Эти очереди показывают, что мешает расширять каталог и что нужно проверить перед Product Builder и визуальной полировкой.
          </p>
        </section>

        <section className="section-head">
          <div>
            <h2>Очереди проверки</h2>
            <p className="muted">Read-only dashboard из safe Supabase review view.</p>
          </div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <section className="grid review-grid">
          {rows.map((row, index) => {
            const code = getCode(row);
            const copy = REVIEW_COPY[code];
            const priority = copy?.priority || 'medium';

            return (
              <div className={`card review-card priority-${priority}`} key={`${code}-${index}`}>
                <span className={`status-pill ${priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'ok'}`}>
                  {priority} priority
                </span>
                <strong>{getCount(row)}</strong>
                <h3>{getTitle(row)}</h3>
                <p>{copy?.description || 'Review queue returned from Supabase.'}</p>
                <span>{copy?.nextStep || 'Review in the next admin phase.'}</span>
              </div>
            );
          })}
        </section>

        {!error && rows.length === 0 ? <div className="notice">Очереди пока не загружены.</div> : null}
      </div>
    </main>
  );
}
