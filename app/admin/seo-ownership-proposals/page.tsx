import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { PageOwnershipCandidateClusterRow, PageOwnershipProposalRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<{
  clusters: PageOwnershipCandidateClusterRow[];
  proposals: PageOwnershipProposalRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { clusters: [], proposals: [], error: getMissingAdminDataEnvMessage() };

  const [clusterResult, proposalResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_page_query_ownership_candidate_clusters_v1')
      .select('*')
      .order('cluster_code', { ascending: true })
      .limit(500),
    supabase
      .from('feya_commerce_v_page_ownership_proposals_safe_v1')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (clusterResult.error) return { clusters: [], proposals: [], error: clusterResult.error.message };
  if (proposalResult.error) return { clusters: [], proposals: [], error: proposalResult.error.message };

  return {
    clusters: (clusterResult.data || []) as PageOwnershipCandidateClusterRow[],
    proposals: (proposalResult.data || []) as PageOwnershipProposalRow[],
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function ownershipStatusLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    READY_FOR_OWNERSHIP_PROPOSAL: 'Готово к назначению страницы',
    OWNERSHIP_EXISTS: 'Ответственность уже назначена',
    REVIEW: 'Ждёт проверки',
    APPROVED: 'Одобрено',
    APPLIED: 'Применено',
    REJECTED: 'Отклонено',
    CANCELLED: 'Отменено',
    PRIMARY: 'Основная',
  };
  return labels[key] || asText(value);
}

function statusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized === 'APPLIED' || normalized === 'APPROVED' || normalized === 'OWNERSHIP_EXISTS') return 'ok';
  if (normalized === 'REJECTED' || normalized === 'CANCELLED') return 'danger';
  return 'warning';
}

export default async function AdminOwnershipProposalsPage() {
  const { clusters, proposals, error } = await getData();

  const ready = clusters.filter((row) => row.ownership_candidate_status === 'READY_FOR_OWNERSHIP_PROPOSAL').length;
  const review = proposals.filter((row) => row.proposal_status === 'REVIEW').length;
  const approved = proposals.filter((row) => row.proposal_status === 'APPROVED').length;
  const applied = proposals.filter((row) => row.proposal_status === 'APPLIED').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/seo-cluster-proposals">Предложения групп</Link>
            <Link href="/admin/seo-ownership-proposals">Ответственность страниц</Link>
            <Link href="/admin/seo-portfolio">SEO-страницы</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Ответственность страниц за запросы · только просмотр</div>
          <h1>Ответственность страниц за запросы</h1>
          <p>
            Одобрение группы запросов и назначение основной страницы — разные решения. Ответственность становится канонической только после проверки человеком и сама по себе не разрешает индексацию.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{clusters.length}</strong><span>Одобренных групп проверено</span></div>
          <div className="card metric"><strong>{ready}</strong><span>Нужна основная страница</span></div>
          <div className="card metric"><strong>{review}</strong><span>Предложений ждут проверки</span></div>
          <div className="card metric"><strong>{approved}</strong><span>Одобрено, ещё не применено</span></div>
          <div className="card metric"><strong>{applied}</strong><span>Назначений применено</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Лексическая оценка используется только для поиска кандидатов. Система может вернуть «подходящей страницы нет», вместо того чтобы насильно назначать товарную страницу владельцем слишком широкого запроса.
        </div>

        <section className="section-head">
          <div>
            <h2>Состояние ответственности групп</h2>
            <p className="muted">Только одобренные группы запросов могут перейти к выбору основной страницы.</p>
          </div>
        </section>

        <div className="table-wrap" style={{ marginBottom: '30px' }}>
          <table>
            <thead>
              <tr>
                <th>Группа запросов</th>
                <th>Интент</th>
                <th>Ключей</th>
                <th>Основных страниц</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {clusters.length ? clusters.map((row) => (
                <tr key={row.query_cluster_id}>
                  <td>
                    <strong title={asText(row.cluster_code)}>{asText(row.cluster_label, row.cluster_code || '—')}</strong>
                  </td>
                  <td>
                    {asText(row.normalized_intent)}
                    <div className="muted">{asText(row.intent_type)}</div>
                  </td>
                  <td>{row.member_count ?? 0}</td>
                  <td>{row.primary_owner_count ?? 0}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.ownership_candidate_status)}`}>
                      {ownershipStatusLabel(row.ownership_candidate_status)}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5}>Одобренных групп запросов пока нет.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <section className="section-head">
          <div>
            <h2>История предложений ответственности</h2>
            <p className="muted">Назначение страницы фиксирует поисковое намерение; допуск к индексации остаётся отдельным этапом.</p>
          </div>
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Группа запросов</th>
                <th>Страница</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Обоснование</th>
                <th>Проверка</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length ? proposals.map((row) => (
                <tr key={row.proposal_id}>
                  <td>
                    <strong title={asText(row.cluster_code)}>{asText(row.cluster_label, row.cluster_code || '—')}</strong>
                    <div className="muted">{asText(row.normalized_intent)}</div>
                  </td>
                  <td>
                    <strong>{asText(row.card_title, row.url_path || '—')}</strong>
                    <div className="muted">{asText(row.url_path)}</div>
                  </td>
                  <td>{ownershipStatusLabel(row.ownership_role)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.proposal_status)}`}>
                      {ownershipStatusLabel(row.proposal_status)}
                    </span>
                  </td>
                  <td>{asText(row.rationale)}</td>
                  <td>
                    {asText(row.review_note)}
                    {row.applied_page_query_ownership_id ? (
                      <div className="badge-row"><span className="badge">назначение применено</span></div>
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}>Предложений ответственности страниц пока нет.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
