import Link from 'next/link';
import { GitBranch, SearchCheck } from 'lucide-react';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { OwnerProposalReviewClient } from '@/components/admin/OwnerProposalReviewClient';
import { getOwnerActionConfigStatus } from '@/lib/ownerActionAuth';
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

  if (candidateResult.error) return { candidates: [], proposals: [], error: candidateResult.error.message };
  if (proposalResult.error) return { candidates: [], proposals: [], error: proposalResult.error.message };

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
  if (key === 'FRESH' || key === 'CURRENT') return 'Данные актуальны';
  if (key === 'AGING') return 'Данные постепенно устаревают';
  if (key === 'STALE') return 'Данные устарели';
  if (key === 'MISSING') return 'Метрик нет';
  return 'Свежесть не определена';
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

function toneClass(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'APPLIED' || key === 'APPROVED') return 'is-success';
  if (key === 'REJECTED' || key === 'CANCELLED') return 'is-danger';
  return 'is-warning';
}

export default async function AdminClusterProposalsPage() {
  const { candidates, proposals, error } = await getData();
  const ownerActions = getOwnerActionConfigStatus();
  const reviewRows = proposals.filter((row) => row.proposal_status === 'REVIEW');
  const approved = proposals.filter((row) => row.proposal_status === 'APPROVED').length;
  const applied = proposals.filter((row) => row.proposal_status === 'APPLIED').length;
  const topCandidates = [...candidates]
    .sort((a, b) => Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0))
    .slice(0, 16);

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow"><span className="owner-eyebrow-mark" aria-hidden="true" />Рост · смысловая структура</div>
            <h1>Группы запросов</h1>
            <p>Одобренные ключевые запросы объединяются только когда их поисковый смысл действительно совпадает. Предложение ИИ остаётся предложением до человеческой проверки и отдельного применения.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/growth" className="owner-button">Назад к росту</Link>
            <Link href="/admin/seo-keyword-review" className="owner-button">Проверка ключей</Link>
          </div>
        </header>

        <section className="owner-queue-strip" aria-label="Состояние группировки" style={{ marginBottom: '20px' }}>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><SearchCheck size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Готовы к группировке</strong><small>ключи уже проверены человеком</small></span>
            <b>{candidates.length}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><GitBranch size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Ждут проверки</strong><small>предложения групп</small></span>
            <b>{reviewRows.length}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><GitBranch size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Одобрено</strong><small>ещё не применено</small></span>
            <b>{approved}</b>
          </div>
          <Link href="/admin/seo-clusters" className="owner-queue-item">
            <span className="owner-queue-icon" aria-hidden="true"><GitBranch size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Применено</strong><small>канонические группы</small></span>
            <b>{applied}</b>
          </Link>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        <div className="owner-card is-info" style={{ marginBottom: '18px' }}>
          <div className="owner-status is-info">Правило безопасности</div>
          <p className="owner-card-copy">Совпадения по стилю, событию, оси или семейству товара недостаточно. Если семантическая близость не доказана, безопаснее оставить запросы раздельно, чем создать слишком широкую группу.</p>
        </div>

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-attention" aria-hidden="true"><GitBranch size={17} strokeWidth={1.7} /></span>
              <div><h2>Предложения ждут проверки</h2><div className="owner-section-kicker">Это ещё не канонические группы</div></div>
            </div>
          </div>

          {reviewRows.length ? (
            <div className="owner-list">
              {reviewRows.map((row) => (
                <article className="owner-list-row" key={row.proposal_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className="owner-status is-warning">{proposalStatusLabel(row.proposal_status)}</span>
                      <span>{intentLabel(row.normalized_intent)}</span>
                      <span>{row.proposed_member_count ?? 0} запросов</span>
                    </div>
                    <h3>{asText(row.cluster_label, 'Предлагаемая группа')}</h3>
                    <p>{asText(row.rationale, 'Обоснование ещё не зафиксировано.')}</p>
                  </div>
                  <div className="owner-list-row-side">
                    <span className="owner-section-kicker">{asText(row.review_note, 'проверка не завершена')}</span>
                    <OwnerProposalReviewClient
                      proposalKind="QUERY_CLUSTER"
                      proposalId={row.proposal_id}
                      expectedStatus={String(row.proposal_status || 'REVIEW')}
                      title={asText(row.cluster_label, 'Предлагаемая группа')}
                      summary={asText(row.rationale, 'Обоснование ещё не зафиксировано.')}
                      enabled={ownerActions.ready}
                      blockers={ownerActions.blockers}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Предложений, которые ждут проверки, сейчас нет.</div>
          )}
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-info" aria-hidden="true"><SearchCheck size={17} strokeWidth={1.7} /></span>
              <div><h2>Следующие кандидаты</h2><div className="owner-section-kicker">До 16 проверенных ключей с наибольшим сохранённым спросом — для ориентации, не автоматической группировки</div></div>
            </div>
          </div>

          {topCandidates.length ? (
            <div className="owner-list">
              {topCandidates.map((row) => (
                <article className="owner-list-row" key={row.cleanup_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span>{pageLevelLabel(row.suggested_page_level)}</span>
                      <span>{intentLabel(row.ai_intent)}</span>
                      <span>{freshnessLabel(row.metric_freshness_status)}</span>
                    </div>
                    <h3>{asText(row.approved_keyword, row.keyword_norm || 'Ключевой запрос')}</h3>
                    <p>{asText(row.keyword_axis)} · {asText(row.keyword_pattern)}</p>
                  </div>
                  <div className="owner-list-row-side">
                    <strong>{row.avg_monthly_searches != null ? new Intl.NumberFormat('ru-RU').format(Number(row.avg_monthly_searches)) : '—'}</strong>
                    <span className="owner-section-kicker">сохранённый спрос / мес.</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Проверенных ключей для новой группировки пока нет.</div>
          )}
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Полная очередь и история предложений</strong><small>Все кандидаты, статусы и review notes</small></span>
              <span className="owner-section-kicker">{candidates.length + proposals.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap" style={{ marginBottom: '18px' }}>
                <table>
                  <thead><tr><th>Ключевой запрос</th><th>Признаки</th><th>Уровень</th><th>Интент</th><th>Метрики</th></tr></thead>
                  <tbody>
                    {candidates.length ? candidates.map((row) => (
                      <tr key={row.cleanup_id}>
                        <td><strong>{asText(row.approved_keyword, row.keyword_norm || '—')}</strong></td>
                        <td>{asText(row.keyword_axis)}<div className="muted">{asText(row.keyword_pattern)}</div></td>
                        <td>{pageLevelLabel(row.suggested_page_level)}</td>
                        <td>{intentLabel(row.ai_intent)}</td>
                        <td>{row.avg_monthly_searches ?? '—'}<div className="muted">{freshnessLabel(row.metric_freshness_status)}</div></td>
                      </tr>
                    )) : <tr><td colSpan={5}>Кандидатов нет.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Предложение</th><th>Интент</th><th>Ключей</th><th>Статус</th><th>Обоснование</th><th>Проверка</th></tr></thead>
                  <tbody>
                    {proposals.length ? proposals.map((row) => (
                      <tr key={row.proposal_id}>
                        <td><strong title={asText(row.proposal_code)}>{asText(row.cluster_label, row.proposal_code || '—')}</strong></td>
                        <td>{intentLabel(row.normalized_intent)}<div className="muted">{intentLabel(row.intent_type)}</div></td>
                        <td>{row.proposed_member_count ?? 0}</td>
                        <td><span className={`owner-status ${toneClass(row.proposal_status)}`}>{proposalStatusLabel(row.proposal_status)}</span></td>
                        <td>{asText(row.rationale)}</td>
                        <td>{asText(row.review_note)}{row.applied_query_cluster_id ? <div className="owner-card-meta"><span>группа применена</span></div> : null}</td>
                      </tr>
                    )) : <tr><td colSpan={6}>Предложений пока нет.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
