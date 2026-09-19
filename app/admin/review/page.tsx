// @ts-nocheck
import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
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

const REVIEW_COPY: Record<string, { title: string; priority: 'high' | 'medium' | 'low'; description: string; nextStep: string; href?: string }> = {
  needs_price: {
    title: 'Нужно проверить цену',
    priority: 'high',
    description: 'Товары, которые нельзя безопасно выводить на витрину, пока цена не подтверждена.',
    nextStep: 'Проверить исходные цены и цены вариантов.',
    href: '/admin/review/prices',
  },
  missing_media: {
    title: 'Не хватает медиа',
    priority: 'high',
    description: 'Товары, для которых недостаточно изображений для полноценной карточки и страницы товара.',
    nextStep: 'Проверить изображения и медиа перед публикацией.',
    href: '/admin/media',
  },
  fallback_price_review_rows: {
    title: 'Проверить резервную цену',
    priority: 'medium',
    description: 'Товары, где используется резервная цена вместо подтверждённой цены конкретного варианта.',
    nextStep: 'Подтвердить резервную цену или исправить её.',
    href: '/admin/review/prices?issue=fallback',
  },
  storefront_excluded: {
    title: 'Исключено из витрины',
    priority: 'medium',
    description: 'Товары, которые пока исключены из публичной витрины из-за готовности или ограничений.',
    nextStep: 'Проверить причины исключения перед расширением публичного каталога.',
    href: '/admin/products',
  },
  sampler_excluded_rows: {
    title: 'Пробник исключён',
    priority: 'low',
    description: 'Пробники намеренно не участвуют в публичном диапазоне цен.',
    nextStep: 'Только контроль. Это ожидаемое поведение, а не блокировка запуска.',
    href: '/admin/products',
  },
};

async function getReviewQueues(): Promise<{ rows: ReviewQueueSummary[]; error?: string }> {
  const supabase = getAdminReadClient();

  if (!supabase) {
    return { rows: [], error: getMissingAdminDataEnvMessage() };
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
            <Link href="/admin/products">Товары</Link>
            <Link href="/shop">Магазин</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Товары · очереди проверки</div>
          <h1>Что нужно проверить</h1>
          <p>
            Сводка проблем, которые мешают безопасно расширять каталог. Нажмите на нужную очередь, чтобы перейти сразу к рабочей проверке.
          </p>
        </section>

        <section className="section-head">
          <div>
            <h2>Очереди проверки</h2>
            <p className="muted">Показывает безопасные очереди проверки из Supabase.</p>
          </div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <section className="grid review-grid">
          {rows.map((row, index) => {
            const code = getCode(row);
            const copy = REVIEW_COPY[code];
            const priority = copy?.priority || 'medium';

            const card = (
              <>
                <span className={`status-pill ${priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'ok'}`}>
                  {priority === 'high' ? 'Высокий приоритет' : priority === 'medium' ? 'Средний приоритет' : 'Низкий приоритет'}
                </span>
                <strong>{getCount(row)}</strong>
                <h3>{getTitle(row)}</h3>
                <p>{copy?.description || 'Очередь проверки из текущих данных.'}</p>
                <span>{copy?.nextStep || 'Проверить на следующем этапе работы.'}</span>
              </>
            );

            return copy?.href ? (
              <Link className={`card review-card priority-${priority}`} href={copy.href} key={`${code}-${index}`}>
                {card}
              </Link>
            ) : (
              <div className={`card review-card priority-${priority}`} key={`${code}-${index}`}>
                {card}
              </div>
            );
          })}
        </section>

        {!error && rows.length === 0 ? <div className="notice">Очереди пока не загружены.</div> : null}
      </div>
    </main>
  );
}
