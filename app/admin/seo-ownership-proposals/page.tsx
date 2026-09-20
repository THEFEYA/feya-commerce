import Link from 'next/link';
import { FileSearch, GitBranch, ShieldCheck } from 'lucide-react';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { OwnerProposalReviewClient } from '@/components/admin/OwnerProposalReviewClient';
import { OwnerProposalApplyClient } from '@/components/admin/OwnerProposalApplyClient';
import { getOwnerActionConfigStatus } from '@/lib/ownerActionAuth';
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
    READY_FOR_OWNERSHIP_PROPOSAL: 'Нужна основная страница',
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

function toneClass(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'APPLIED' || key === 'APPROVED' || key === 'OWNERSHIP_EXISTS') return 'is-success';
  if (key === 'REJECTED' || key === 'CANCELLED') return 'is-danger';
  return 'is-warning';
}

export default async function AdminOwnershipProposalsPage() {
  const { clusters, proposals, error } = await getData();
  const ownerActions = getOwnerActionConfigStatus();

  const readyRows = clusters.filter((row) => row.ownership_candidate_status === 'READY_FOR_OWNERSHIP_PROPOSAL');
  const reviewRows = proposals.filter((row) => row.proposal_status === 'REVIEW');
  const approvedRows = proposals.filter((row) => row.proposal_status === 'APPROVED');
  const approved = approvedRows.length;
  const applied = proposals.filter((row) => row.proposal_status === 'APPLIED').length;

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow"><span className="owner-eyebrow-mark" aria-hidden="true" />Рост · ответственность страниц</div>
            <h1>Страница ↔ запрос</h1>
            <p>Одобренная группа запросов должна иметь одну понятную основную страницу. Назначение ответственности и допуск к индексации остаются двумя разными решениями.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/growth" className="owner-button">Назад к росту</Link>
            <Link href="/admin/seo-portfolio" className="owner-button">SEO-страницы</Link>
          </div>
        </header>

        <section className="owner-queue-strip" aria-label="Состояние ответственности страниц" style={{ marginBottom: '20px' }}>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><GitBranch size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Одобренных групп</strong><small>проверены для ownership</small></span>
            <b>{clusters.length}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><FileSearch size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Нужна страница</strong><small>ещё нет primary owner</small></span>
            <b>{readyRows.length}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><ShieldCheck size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Ждут проверки</strong><small>ownership proposals</small></span>
            <b>{reviewRows.length}</b>
          </div>
          <Link href="/admin/seo-portfolio" className="owner-queue-item">
            <span className="owner-queue-icon" aria-hidden="true"><ShieldCheck size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Применено</strong><small>канонических назначений</small></span>
            <b>{applied}</b>
          </Link>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        <div className="owner-card is-info" style={{ marginBottom: '18px' }}>
          <div className="owner-status is-info">Защита от каннибализации</div>
          <p className="owner-card-copy">Лексическое совпадение используется только для поиска кандидата. Если подходящей страницы нет, FEYA должна вернуть «страница не найдена», а не насильно назначить слишком широкий запрос на случайный товар.</p>
        </div>

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-attention" aria-hidden="true"><FileSearch size={17} strokeWidth={1.7} /></span>
              <div><h2>Группы без основной страницы</h2><div className="owner-section-kicker">Следующее решение — определить, существует ли подходящая страница вообще</div></div>
            </div>
          </div>

          {readyRows.length ? (
            <div className="owner-list">
              {readyRows.map((row) => (
                <article className="owner-list-row" key={row.query_cluster_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className="owner-status is-warning">{ownershipStatusLabel(row.ownership_candidate_status)}</span>
                      <span>{asText(row.normalized_intent)}</span>
                      <span>{row.member_count ?? 0} запросов</span>
                    </div>
                    <h3>{asText(row.cluster_label, row.cluster_code || 'Группа запросов')}</h3>
                    <p>Текущих основных страниц: {row.primary_owner_count ?? 0}. Назначение не должно выполняться до проверки intent и page fit.</p>
                  </div>
                  <div className="owner-list-row-side">
                    <Link href="/admin/seo-portfolio" className="owner-button">Посмотреть страницы</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Все доступные группы либо уже имеют ownership, либо ещё не дошли до этого этапа.</div>
          )}
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-info" aria-hidden="true"><ShieldCheck size={17} strokeWidth={1.7} /></span>
              <div><h2>Предложения ждут проверки</h2><div className="owner-section-kicker">Предложение страницы ещё не является каноническим ownership</div></div>
            </div>
          </div>

          {reviewRows.length ? (
            <div className="owner-list">
              {reviewRows.map((row) => (
                <article className="owner-list-row" key={row.proposal_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className="owner-status is-warning">{ownershipStatusLabel(row.proposal_status)}</span>
                      <span>{ownershipStatusLabel(row.ownership_role)}</span>
                      <span>{asText(row.normalized_intent)}</span>
                    </div>
                    <h3>{asText(row.cluster_label, row.cluster_code || 'Группа запросов')}</h3>
                    <p><strong>Предлагаемая страница:</strong> {asText(row.card_title, row.url_path || '—')} · {asText(row.url_path)}</p>
                    <p>{asText(row.rationale, 'Обоснование ещё не зафиксировано.')}</p>
                  </div>
                  <div className="owner-list-row-side">
                    <span className="owner-section-kicker">{asText(row.review_note, 'проверка не завершена')}</span>
                    <OwnerProposalReviewClient
                      proposalKind="PAGE_OWNERSHIP"
                      proposalId={row.proposal_id}
                      expectedStatus={String(row.proposal_status || 'REVIEW')}
                      title={asText(row.cluster_label, row.cluster_code || 'Группа запросов')}
                      summary={`Предлагаемая страница: ${asText(row.card_title, row.url_path || '—')} · ${asText(row.url_path)}. ${asText(row.rationale, '')}`}
                      enabled={ownerActions.ready}
                      blockers={ownerActions.blockers}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Предложений ownership, ожидающих проверки, сейчас нет.</div>
          )}
        </section>

        {approvedRows.length ? (
          <section className="owner-section">
            <div className="owner-section-head">
              <div className="owner-section-heading">
                <span className="owner-section-icon is-system" aria-hidden="true"><ShieldCheck size={17} strokeWidth={1.7} /></span>
                <div><h2>Одобрено, ждёт канонического применения</h2><div className="owner-section-kicker">Review уже завершён; apply создаст intended ownership, но не изменит индексацию</div></div>
              </div>
            </div>
            <div className="owner-list">
              {approvedRows.map((row) => (
                <article className="owner-list-row" key={row.proposal_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className="owner-status is-success">Одобрено человеком</span>
                      <span>{ownershipStatusLabel(row.ownership_role)}</span>
                    </div>
                    <h3>{asText(row.cluster_label, row.cluster_code || 'Группа запросов')}</h3>
                    <p>Страница: {asText(row.card_title, row.url_path || '—')} · {asText(row.url_path)}</p>
                  </div>
                  <div className="owner-list-row-side">
                    <OwnerProposalApplyClient
                      proposalKind="PAGE_OWNERSHIP"
                      proposalId={row.proposal_id}
                      title={asText(row.cluster_label, row.cluster_code || 'Ownership')}
                      consequence="Будет создано каноническое intended page/query ownership. Indexation intent и публикация контента этим не меняются."
                      enabled={ownerActions.ready}
                      blockers={ownerActions.blockers}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Полная карта ownership</strong><small>Все группы, предложения, обоснования и review state</small></span>
              <span className="owner-section-kicker">{clusters.length + proposals.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap" style={{ marginBottom: '18px' }}>
                <table>
                  <thead><tr><th>Группа запросов</th><th>Интент</th><th>Ключей</th><th>Primary pages</th><th>Статус</th></tr></thead>
                  <tbody>
                    {clusters.length ? clusters.map((row) => (
                      <tr key={row.query_cluster_id}>
                        <td><strong title={asText(row.cluster_code)}>{asText(row.cluster_label, row.cluster_code || '—')}</strong></td>
                        <td>{asText(row.normalized_intent)}<div className="muted">{asText(row.intent_type)}</div></td>
                        <td>{row.member_count ?? 0}</td>
                        <td>{row.primary_owner_count ?? 0}</td>
                        <td><span className={`owner-status ${toneClass(row.ownership_candidate_status)}`}>{ownershipStatusLabel(row.ownership_candidate_status)}</span></td>
                      </tr>
                    )) : <tr><td colSpan={5}>Одобренных групп запросов пока нет.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Группа</th><th>Страница</th><th>Роль</th><th>Статус</th><th>Обоснование</th><th>Проверка</th></tr></thead>
                  <tbody>
                    {proposals.length ? proposals.map((row) => (
                      <tr key={row.proposal_id}>
                        <td><strong title={asText(row.cluster_code)}>{asText(row.cluster_label, row.cluster_code || '—')}</strong><div className="muted">{asText(row.normalized_intent)}</div></td>
                        <td><strong>{asText(row.card_title, row.url_path || '—')}</strong><div className="muted">{asText(row.url_path)}</div></td>
                        <td>{ownershipStatusLabel(row.ownership_role)}</td>
                        <td><span className={`owner-status ${toneClass(row.proposal_status)}`}>{ownershipStatusLabel(row.proposal_status)}</span></td>
                        <td>{asText(row.rationale)}</td>
                        <td>{asText(row.review_note)}{row.applied_page_query_ownership_id ? <div className="owner-card-meta"><span>назначение применено</span></div> : null}</td>
                      </tr>
                    )) : <tr><td colSpan={6}>Предложений ownership пока нет.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </section>

        {approved ? (
          <div className="owner-card is-success" style={{ marginTop: '20px' }}>
            <div className="owner-status is-success">Одобрено, ещё не применено: {approved}</div>
            <p className="owner-card-copy">Одобрение ownership и фактическое применение — разные состояния. После появления protected actions применение должно идти через контролируемый execution path.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
