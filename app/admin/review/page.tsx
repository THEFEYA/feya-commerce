import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ReviewQueueSummary } from '@/lib/types';

const REVIEW_COPY: Record<string, { title: string; priority: 'high' | 'medium' | 'low'; description: string; nextStep: string }> = {
  needs_price: {
    title: 'Нужно проверить цену',
    priority: 'high',
    description: 'Товары, которые нельзя безопасно публиковать, пока цена не подтверждена.',
    nextStep: 'Проверить исходные цены и цены вариантов.',
  },
  missing_media: {
    title: 'Не хватает медиа',
    priority: 'high',
    description: 'Товары, для которых недостаточно изображений для полноценной карточки и страницы товара.',
    nextStep: 'Проверить изображения и медиа перед публикацией.',
  },
  fallback_price_review_rows: {
    title: 'Проверить резервную цену',
    priority: 'medium',
    description: 'Товары, где используется резервная цена вместо подтверждённой цены конкретного варианта.',
    nextStep: 'Подтвердить резервную цену или исправить её.',
  },
  storefront_excluded: {
    title: 'Исключено из магазина',
    priority: 'medium',
    description: 'Товары, которые пока исключены из публичного магазина из-за готовности или ограничений.',
    nextStep: 'Проверить причины исключения перед публикацией.',
  },
  sampler_excluded_rows: {
    title: 'Пробник исключён',
    priority: 'low',
    description: 'Пробники намеренно не участвуют в публичном диапазоне цен.',
    nextStep: 'Только контроль. Это ожидаемое поведение, а не блокировка запуска.',
  },
};

async function getReviewQueues(): Promise<{ rows: ReviewQueueSummary[]; error?: string }> {
  const supabase = getAdminReadClient();

  if (!supabase) {
    return { rows: [], error: getMissingAdminDataEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_step8_review_queues_summary')
    .select('*');

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
            <Link href="/admin/seo-keywords">SEO и ключевые слова</Link>
            <Link href="/shop">Магазин</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Очереди проверки · только просмотр</div>
          <p>
            Эти очереди показывают, что мешает расширять каталог и что нужно проверить перед Product Builder и визуальной полировкой.
          </p>
        </section>

        <section className="section-head">
          <div>
            <h2>Очереди проверки</h2>
            <p className="muted">Показывает только безопасные данные из текущих очередей проверки.</p>
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
                  {priority === 'high' ? 'Высокий приоритет' : priority === 'medium' ? 'Средний приоритет' : 'Низкий приоритет'}
                </span>
                <strong>{getCount(row)}</strong>
                <h3>{getTitle(row)}</h3>
                <p>{copy?.description || 'Очередь проверки из Supabase.'}</p>
                <span>{copy?.nextStep || 'Проверить на следующем этапе работы.'}</span>
              </div>
            );
          })}
        </section>

        {!error && rows.length === 0 ? <div className="notice">Очереди пока не загружены.</div> : null}
      </div>
    </main>
  );
}
