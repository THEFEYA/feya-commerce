import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ContentQaShadowRow } from '@/lib/types';
import { statusLabel } from '@/lib/owner-ui/terminology';

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

export default async function AdminContentQaPage() {
  const { rows, error } = await getQueue();

  const independentReady = countState(rows, 'READY_FOR_INDEPENDENT_CQA');
  const humanAndCqa = countState(rows, 'READY_FOR_HUMAN_AND_CQA_REVIEW');
  const similarity = countState(rows, 'APPROVED_NEEDS_SIMILARITY_CHECK');
  const componentClaims =
    countState(rows, 'APPROVED_NEEDS_COMPONENT_CLAIM_CHECK') +
    countState(rows, 'CQA_RECORDED_NEEDS_COMPONENT_CLAIM_CHECK');
  const prechecks = countState(rows, 'NEEDS_PRECHECKS');
  const blocked = countState(rows, 'BLOCKED_BY_VALIDATION') + countState(rows, 'REVISION_REQUIRED');

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Товары</Link>
            <Link href="/admin/product-facts-review">Факты о товарах</Link>
            <Link href="/admin/seo-portfolio">SEO-страницы</Link>
            <Link href="/admin/seo-clusters">Группы запросов</Link>
            <Link href="/admin/content-qa">Контроль качества</Link>
            <Link href="/admin/system-readiness">Готовность системы</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Контроль качества · безопасный режим · только просмотр</div>
          <h1>Контроль качества контента</h1>
          <p>
            Одобрение человеком не считается независимой проверкой качества. Экран классифицирует существующие SEO-черновики по детерминированным проверкам и не переписывает исторические статусы.
          </p>
        </section>

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
              {[...rows].sort((a, b) => {
                const rank = (state: unknown) => {
                  const key = String(state || '');
                  if (key === 'BLOCKED_BY_VALIDATION' || key === 'REVISION_REQUIRED') return 0;
                  if (key === 'READY_FOR_HUMAN_AND_CQA_REVIEW') return 1;
                  if (key === 'READY_FOR_INDEPENDENT_CQA') return 2;
                  return 3;
                };
                return rank(a.cqa_shadow_state) - rank(b.cqa_shadow_state);
              }).map((row) => (
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
    </main>
  );
}
