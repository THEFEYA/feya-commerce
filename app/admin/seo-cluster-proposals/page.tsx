import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { QueryClusterProposalCandidateRow, QueryClusterProposalRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<{
  candidates: QueryClusterProposalCandidateRow[];
  proposals: QueryClusterProposalRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { candidates: [], proposals: [], error: getMissingAdminDataEnvMessage() };

  const [candidateResult, proposalResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_query_cluster_proposal_queue_safe_v1')
      .select('*')
      .order('approved_at', { ascending: true })
      .order('cleanup_id', { ascending: true })
      .limit(500),
    supabase
      .from('feya_commerce_v_query_cluster_proposals_safe_v1')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (candidateResult.error) {
    return { candidates: [], proposals: [], error: candidateResult.error.message };
  }
  if (proposalResult.error) {
    return { candidates: [], proposals: [], error: proposalResult.error.message };
  }

  return {
    candidates: (candidateResult.data || []) as QueryClusterProposalCandidateRow[],
    proposals: (proposalResult.data || []) as QueryClusterProposalRow[],
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function pageLevelLabel(value: unknown) {
  const key = asText(value, '').toLowerCase();
  const labels: Record<string, string> = {
    product: 'Товар',
    collection: 'Категория / коллекция',
    landing: 'Посадочная страница',
    faq: 'FAQ / информационная',
    homepage: 'Главная',
  };
  return labels[key] || asText(value);
}

function intentLabel(value: unknown) {
  const key = asText(value, '').toLowerCase();
  const labels: Record<string, string> = {
    commercial: 'Коммерческий',
    transactional: 'Покупательский',
    informational: 'Информационный',
    navigational: 'Навигационный',
    mixed: 'Смешанный',
  };
  return labels[key] || asText(value);
}

function freshnessLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    FRESH: 'Данные актуальны',
    CURRENT: 'Данные актуальны',
    AGING: 'Данные постепенно устаревают',
    STALE: 'Данные устарели',
    UNKNOWN: 'Свежесть не определена',
    MISSING: 'Метрик нет',
  };
  return labels[key] || asText(value);
}

function proposalStatusLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    REVIEW: 'Ждёт проверки',
    APPROVED: 'Одобрено',
    APPLIED: 'Применено',
    REJECTED: 'Отклонено',
    CANCELLED: 'Отменено',
  };
  return labels[key] || asText(value);
}

function statusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized === 'APPLIED' || normalized === 'APPROVED') return 'ok';
  if (normalized === 'REJECTED' || normalized === 'CANCELLED') return 'danger';
  return 'warning';
}

export default async function AdminClusterProposalsPage() {
  const { candidates, proposals, error } = await getData();

  const review = proposals.filter((row) => row.proposal_status === 'REVIEW').length;
  const approved = proposals.filter((row) => row.proposal_status === 'APPROVED').length;
  const applied = proposals.filter((row) => row.proposal_status === 'APPLIED').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/seo-keyword-review">Проверка ключей</Link>
            <Link href="/admin/seo-clusters">Очередь группировки</Link>
            <Link href="/admin/seo-cluster-proposals">Предложения групп</Link>
            <Link href="/admin/seo-portfolio">SEO-страницы</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Смысловые группы запросов · только просмотр</div>
          <h1>Предложения групп запросов</h1>
          <p>
            В эту очередь попадают только ключи, уже одобренные человеком после очистки. Предложение ИИ не становится канонической группой, пока человек его не проверит и явно не применит.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{candidates.length}</strong><span>Ключей готовы к предложению группы</span></div>
          <div className="owner-summary-cell"><strong>{review}</strong><span>Предложений ждут проверки</span></div>
          <div className="owner-summary-cell"><strong>{approved}</strong><span>Одобрено, но ещё не применено</span></div>
          <div className="owner-summary-cell"><strong>{applied}</strong><span>Канонических групп применено</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Совпадения по оси, стилю, событию или семейству товара недостаточно, чтобы объединять запросы. Если смысловая близость не доказана, безопаснее оставить отдельную группу, чем создать слишком широкую.
        </div>

        <section className="section-head">
          <div>
            <h2>Очередь одобренных ключей</h2>
            <p className="muted">Одобренные человеком ключи, которые ещё не вошли в каноническую группу и не заняты активным предложением.</p>
          </div>
        </section>

        <div className="table-wrap" style={{ marginBottom: '30px' }}>
          <table>
            <thead>
              <tr>
                <th>Ключевой запрос</th>
                <th>Смысловые признаки</th>
                <th>Предлагаемый уровень</th>
                <th>Интент</th>
                <th>Метрики</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length ? candidates.map((row) => (
                <tr key={row.cleanup_id}>
                  <td><strong>{asText(row.approved_keyword, row.keyword_norm || '—')}</strong></td>
                  <td>
                    {asText(row.keyword_axis)}
                    <div className="muted">{asText(row.keyword_pattern)}</div>
                  </td>
                  <td>{pageLevelLabel(row.suggested_page_level)}</td>
                  <td>{intentLabel(row.ai_intent)}</td>
                  <td>
                    {row.avg_monthly_searches != null ? row.avg_monthly_searches : '—'}
                    <div className="muted">{freshnessLabel(row.metric_freshness_status)}</div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5}>Пока нет одобренных человеком ключей, готовых к новой группировке.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <section className="section-head">
          <div>
            <h2>История предложений</h2>
            <p className="muted">Статус предложения и статус канонической группы — разные вещи.</p>
          </div>
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Предложение</th>
                <th>Интент</th>
                <th>Ключей в группе</th>
                <th>Статус</th>
                <th>Обоснование</th>
                <th>Проверка</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length ? proposals.map((row) => (
                <tr key={row.proposal_id}>
                  <td>
                    <strong title={asText(row.proposal_code)}>{asText(row.cluster_label, row.proposal_code || '—')}</strong>
                  </td>
                  <td>
                    {intentLabel(row.normalized_intent)}
                    <div className="muted">{intentLabel(row.intent_type)}</div>
                  </td>
                  <td>{row.proposed_member_count ?? 0}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.proposal_status)}`}>
                      {proposalStatusLabel(row.proposal_status)}
                    </span>
                  </td>
                  <td>{asText(row.rationale)}</td>
                  <td>
                    {asText(row.review_note)}
                    {row.applied_query_cluster_id ? (
                      <div className="badge-row"><span className="badge">группа применена</span></div>
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6}>Предложений групп запросов пока нет.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
