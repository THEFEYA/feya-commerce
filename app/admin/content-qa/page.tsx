import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ContentQaShadowRow } from '@/lib/types';
import { statusLabel } from '@/lib/owner-ui/terminology';
import { OwnerSavedViewsClient } from '@/components/admin/OwnerSavedViewsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CQA_QUEUE_LIMIT = 300;

async function getQueue(): Promise<{ rows: ContentQaShadowRow[]; error?: string }> {
  const supabase = getAdminReadClient();

  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_content_qa_shadow_status_safe_v1')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(CQA_QUEUE_LIMIT);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as ContentQaShadowRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized.includes('READY') || normalized === 'CQA_RECORDED' || normalized === 'PASS') return 'ok';
  if (normalized.includes('BLOCK') || normalized.includes('REJECT') || normalized.includes('REVISION')) return 'danger';
  return 'warning';
}

function countState(rows: ContentQaShadowRow[], state: string) {
  return rows.filter((row) => row.cqa_shadow_state === state).length;
}

export default async function AdminContentQaPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; page?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await getQueue();
  const q = String(params.q || '').trim().toLowerCase();
  const stateFilter = String(params.state || 'actionable');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 75;

  const independentReady = countState(rows, 'READY_FOR_INDEPENDENT_CQA');
  const humanAndCqa = countState(rows, 'READY_FOR_HUMAN_AND_CQA_REVIEW');
  const similarity = countState(rows, 'APPROVED_NEEDS_SIMILARITY_CHECK');
  const componentClaims =
    countState(rows, 'APPROVED_NEEDS_COMPONENT_CLAIM_CHECK') +
    countState(rows, 'CQA_RECORDED_NEEDS_COMPONENT_CLAIM_CHECK');
  const prechecks = countState(rows, 'NEEDS_PRECHECKS');
  const blocked = countState(rows, 'BLOCKED_BY_VALIDATION') + countState(rows, 'REVISION_REQUIRED');

  const actionableStates = new Set([
    'BLOCKED_BY_VALIDATION',
    'REVISION_REQUIRED',
    'READY_FOR_HUMAN_AND_CQA_REVIEW',
    'READY_FOR_INDEPENDENT_CQA',
  ]);

  const filteredRows = rows.filter((row) => {
    const haystack = [row.card_title, row.product_slug, row.canonical_product_id]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    const matchesQuery = !q || haystack.includes(q);
    const state = String(row.cqa_shadow_state || '');
    const matchesState =
      stateFilter === 'all'
        ? true
        : stateFilter === 'actionable'
          ? actionableStates.has(state)
          : state === stateFilter;
    return matchesQuery && matchesState;
  }).sort((a, b) => {
    const rank = (state: unknown) => {
      const key = String(state || '');
      if (key === 'BLOCKED_BY_VALIDATION' || key === 'REVISION_REQUIRED') return 0;
      if (key === 'READY_FOR_HUMAN_AND_CQA_REVIEW') return 1;
      if (key === 'READY_FOR_INDEPENDENT_CQA') return 2;
      return 3;
    };
    return rank(a.cqa_shadow_state) - rank(b.cqa_shadow_state);
  });

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (stateFilter !== 'actionable') next.set('state', stateFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/content-qa?${query}` : '/admin/content-qa';
  };

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Работа · контроль качества</div>
            <h1>Контроль качества контента</h1>
            <p>Одобрение человеком и независимая CQA — разные этапы. Здесь видно, что требует исправления, что готово к независимой проверке и что всё ещё проходит автоматические проверки.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/work#operational-queues" className="owner-button">Назад к работе</Link>
            <Link href="/admin/company/results" className="owner-button">Результаты</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{blocked}</strong><span>Требуют исправления / заблокированы</span></div>
          <div className="owner-summary-cell"><strong>{independentReady}</strong><span>Готовы к независимой проверке</span></div>
          <div className="owner-summary-cell"><strong>{humanAndCqa}</strong><span>Готовы к проверке человеком + CQA</span></div>
          <div className="owner-summary-cell"><strong>{similarity + componentClaims + prechecks}</strong><span>На автоматических и промежуточных проверках</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Для исторических черновиков независимая проверка качества ещё не запускалась. Канонический статус остаётся «не проверено», пока отдельная проверка действительно не выполнена и не записана.
        </div>

        <form action="/admin/content-qa" className="owner-card" style={{ marginBottom: '14px' }}>
          <div className="grid gap-3 md:grid-cols-[1fr_260px_auto] md:items-end">
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск товара</div>
              <input name="q" defaultValue={q} className="field" placeholder="название, slug или ID" />
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Состояние</div>
              <select name="state" defaultValue={stateFilter} className="field">
                <option value="actionable">Требует внимания</option>
                <option value="BLOCKED_BY_VALIDATION">Заблокировано валидатором</option>
                <option value="REVISION_REQUIRED">Требуются исправления</option>
                <option value="READY_FOR_HUMAN_AND_CQA_REVIEW">Человек + CQA</option>
                <option value="READY_FOR_INDEPENDENT_CQA">Независимая CQA</option>
                <option value="NEEDS_PRECHECKS">Предварительные проверки</option>
                <option value="APPROVED_NEEDS_SIMILARITY_CHECK">Проверка сходства</option>
                <option value="APPROVED_NEEDS_COMPONENT_CLAIM_CHECK">Проверка состава</option>
                <option value="all">Все состояния</option>
              </select>
            </label>
            <button type="submit" className="owner-button primary">Применить</button>
          </div>
          <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
            <span>Показано: {visibleRows.length}</span>
            <span>После фильтра: {filteredRows.length}</span>
            <Link href="/admin/content-qa">Сбросить</Link>
          </div>
          <OwnerSavedViewsClient scope="content-qa" />
        </form>

        <section className="owner-section" style={{ marginTop: '18px' }}>
          <div className="owner-section-head">
            <div><h2>Очередь проверки</h2><div className="owner-section-kicker">Сначала блокировки и обязательные исправления, затем готовые к CQA черновики</div></div>
          </div>
          <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Проверка человеком</th>
                <th>Валидация</th>
                <th>Сходство</th>
                <th>ALT изображений</th>
                <th>Заявления о составе</th>
                <th>Независимая проверка</th>
                <th>Текущее состояние</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.draft_id}>
                  <td>
                    <Link href={`/admin/products/${row.canonical_product_id}`}>
                      {asText(row.card_title, row.product_slug || row.canonical_product_id)}
                    </Link>
                    <div className="muted">{asText(row.draft_status)}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.human_review_status)}`}>
                      {statusLabel(row.human_review_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.validation_status)}`}>
                      {statusLabel(row.validation_status)}
                    </span>
                    {(row.approval_blocker_count || 0) > 0 || (row.product_truth_blocker_count || 0) > 0 ? (
                      <div className="muted">
                        блокировок: {(row.approval_blocker_count || 0) + (row.product_truth_blocker_count || 0)}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.similarity_status)}`}>
                      {statusLabel(row.similarity_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.image_alt_truth_status)}`}>
                      {statusLabel(row.image_alt_truth_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.component_claim_truth_status)}`}>
                      {statusLabel(row.component_claim_truth_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.cqa_status)}`}>
                      {statusLabel(row.cqa_status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.cqa_shadow_state)}`}>
                      {statusLabel(row.cqa_shadow_state)}
                    </span>
                    <div className="muted">метрики: {asText(row.metrics_status)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

          </div>
        </section>

        {filteredRows.length > pageSize ? (
          <div className="flex items-center justify-between gap-3" style={{ marginTop: '14px' }}>
            <div className="owner-section-kicker">Страница {page} из {pageCount}</div>
            <div className="owner-actions" style={{ marginTop: 0 }}>
              {page > 1 ? <Link href={pageHref(page - 1)} className="owner-button">Назад</Link> : <span className="owner-button" style={{ opacity: .4 }}>Назад</span>}
              {page < pageCount ? <Link href={pageHref(page + 1)} className="owner-button">Дальше</Link> : <span className="owner-button" style={{ opacity: .4 }}>Дальше</span>}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
