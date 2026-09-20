import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { IndexabilityProposalRow, PageIndexabilityReadinessRow } from '@/lib/types';
import { OwnerSavedViewsClient } from '@/components/admin/OwnerSavedViewsClient';
import { OwnerProposalReviewClient } from '@/components/admin/OwnerProposalReviewClient';
import { OwnerProposalApplyClient } from '@/components/admin/OwnerProposalApplyClient';
import { getOwnerActionConfigStatus } from '@/lib/ownerActionAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<{
  readiness: PageIndexabilityReadinessRow[];
  proposals: IndexabilityProposalRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { readiness: [], proposals: [], error: getMissingAdminDataEnvMessage() };

  const [readinessResult, proposalResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_page_indexability_readiness_v1')
      .select('*')
      .order('indexability_readiness_status', { ascending: true })
      .order('url_path', { ascending: true })
      .limit(500),
    supabase
      .from('feya_commerce_v_indexability_proposals_safe_v1')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (readinessResult.error) return { readiness: [], proposals: [], error: readinessResult.error.message };
  if (proposalResult.error) return { readiness: [], proposals: [], error: proposalResult.error.message };

  return {
    readiness: (readinessResult.data || []) as PageIndexabilityReadinessRow[],
    proposals: (proposalResult.data || []) as IndexabilityProposalRow[],
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function pageTypeLabel(value: unknown) {
  const key = asText(value, '').toLowerCase();
  const labels: Record<string, string> = {
    product: 'товарная страница',
    collection: 'категория / коллекция',
    landing: 'посадочная страница',
    editorial: 'редакционная страница',
  };
  return labels[key] || asText(value);
}

function indexabilityLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    READY_FOR_INDEXABILITY_REVIEW: 'Готово к проверке индексации',
    NEEDS_PRIMARY_OWNERSHIP: 'Нужна основная группа запросов',
    NEEDS_PUBLISH_READY_CONTENT: 'Нужен готовый к публикации контент',
    NOT_ELIGIBLE: 'Не допускается к индексации',
    INDEXABLE: 'Можно индексировать',
    NOINDEX: 'Не индексировать',
    REVIEW: 'Ждёт проверки',
    APPROVED: 'Одобрено',
    APPLIED: 'Применено',
    REJECTED: 'Отклонено',
  };
  return labels[key] || asText(value);
}

function statusClass(value: unknown) {
  const normalized = asText(value, '').toUpperCase();
  if (normalized === 'READY_FOR_INDEXABILITY_REVIEW' || normalized === 'APPLIED' || normalized === 'INDEXABLE') return 'ok';
  if (normalized === 'NOT_ELIGIBLE' || normalized === 'REJECTED' || normalized === 'NOINDEX') return 'danger';
  return 'warning';
}

export default async function AdminIndexabilityPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; page?: string }> }) {
  const params = await searchParams;
  const { readiness, proposals, error } = await getData();
  const ownerActions = getOwnerActionConfigStatus();
  const q = String(params.q || '').trim().toLowerCase();
  const stateFilter = String(params.state || 'attention');
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  const pageSize = 75;

  const needsOwnership = readiness.filter((row) => row.indexability_readiness_status === 'NEEDS_PRIMARY_OWNERSHIP').length;
  const needsContent = readiness.filter((row) => row.indexability_readiness_status === 'NEEDS_PUBLISH_READY_CONTENT').length;
  const ready = readiness.filter((row) => row.indexability_readiness_status === 'READY_FOR_INDEXABILITY_REVIEW').length;
  const indexable = readiness.filter((row) => row.indexation_intent === 'indexable').length;
  const approvedRows = proposals.filter((row) => row.proposal_status === 'APPROVED');

  const attentionStates = new Set(['NEEDS_PRIMARY_OWNERSHIP', 'NEEDS_PUBLISH_READY_CONTENT', 'NOT_ELIGIBLE']);
  const filteredReadiness = readiness
    .filter((row) => {
      const haystack = [row.card_title, row.url_path, row.page_type]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      const matchesQuery = !q || haystack.includes(q);
      const state = String(row.indexability_readiness_status || '');
      const matchesState =
        stateFilter === 'all'
          ? true
          : stateFilter === 'attention'
            ? attentionStates.has(state)
            : state === stateFilter;
      return matchesQuery && matchesState;
    })
    .sort((a, b) => {
      const rank = (state: unknown) => {
        const key = String(state || '');
        if (key === 'NEEDS_PRIMARY_OWNERSHIP') return 0;
        if (key === 'NEEDS_PUBLISH_READY_CONTENT') return 1;
        if (key === 'NOT_ELIGIBLE') return 2;
        if (key === 'READY_FOR_INDEXABILITY_REVIEW') return 3;
        return 4;
      };
      return rank(a.indexability_readiness_status) - rank(b.indexability_readiness_status) || String(a.url_path || '').localeCompare(String(b.url_path || ''));
    });

  const pageCount = Math.max(1, Math.ceil(filteredReadiness.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const visibleReadiness = filteredReadiness.slice((page - 1) * pageSize, page * pageSize);

  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (stateFilter !== 'attention') next.set('state', stateFilter);
    if (nextPage > 1) next.set('page', String(nextPage));
    const query = next.toString();
    return query ? `/admin/seo-indexability?${query}` : '/admin/seo-indexability';
  };

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Рост · индексация</div>
            <h1>Допуск к индексации</h1>
            <p>Ответственность страницы за группу запросов сама по себе не разрешает индексацию. Сначала нужны основная группа запросов и готовый контент, затем отдельная проверка допуска.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/growth" className="owner-button">Назад к росту</Link>
            <Link href="/admin/seo-portfolio" className="owner-button">SEO-страницы</Link>
            <Link href="/admin/launch-readiness" className="owner-button">Запуск</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{needsOwnership}</strong><span>Нужна основная группа запросов</span></div>
          <div className="owner-summary-cell"><strong>{needsContent}</strong><span>Нужен готовый контент</span></div>
          <div className="owner-summary-cell"><strong>{ready}</strong><span>Готовы к ручной проверке индексации</span></div>
          <div className="owner-summary-cell"><strong>{indexable}</strong><span>Уже разрешено индексировать</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Автоматическое предложение индексации сейчас не запускается: ни одна страница ещё не прошла обязательные условия по ответственности за запросы и готовности контента.
        </div>

        <form action="/admin/seo-indexability" className="owner-card" style={{ marginBottom: '14px' }}>
          <div className="grid gap-3 md:grid-cols-[1fr_300px_auto] md:items-end">
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск страницы</div>
              <input name="q" defaultValue={q} className="field" placeholder="название или путь" />
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Готовность</div>
              <select name="state" defaultValue={stateFilter} className="field">
                <option value="attention">Требует внимания</option>
                <option value="NEEDS_PRIMARY_OWNERSHIP">Нужна основная группа запросов</option>
                <option value="NEEDS_PUBLISH_READY_CONTENT">Нужен готовый контент</option>
                <option value="READY_FOR_INDEXABILITY_REVIEW">Готово к проверке</option>
                <option value="NOT_ELIGIBLE">Не допускается</option>
                <option value="all">Все состояния</option>
              </select>
            </label>
            <button type="submit" className="owner-button primary">Применить</button>
          </div>
          <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
            <span>Всего страниц: {readiness.length}</span>
            <span>После фильтра: {filteredReadiness.length}</span>
            <span>Показано: {visibleReadiness.length}</span>
            <Link href="/admin/seo-indexability">Сбросить</Link>
          </div>
          <OwnerSavedViewsClient scope="seo-indexability" />
        </form>

        <section className="section-head">
          <div>
            <h2>Готовность</h2>
            <p className="muted">Страница остаётся кандидатом, пока отдельное решение по индексации не проверено и не применено.</p>
          </div>
        </section>

        <div className="table-wrap" style={{ marginBottom: '30px' }}>
          <table>
            <thead>
              <tr>
                <th>Страница</th>
                <th>Тип</th>
                <th>Ответственность</th>
                <th>Готовый контент</th>
                <th>Намерение</th>
                <th>Готовность</th>
              </tr>
            </thead>
            <tbody>
              {visibleReadiness.map((row) => (
                <tr key={row.seo_page_id}>
                  <td>
                    {row.canonical_product_id ? (
                      <Link href={`/admin/products/${row.canonical_product_id}`}>
                        {asText(row.card_title, row.url_path || '—')}
                      </Link>
                    ) : asText(row.url_path)}
                    <div className="muted">{asText(row.url_path)}</div>
                  </td>
                  <td>{pageTypeLabel(row.page_type)}</td>
                  <td>
                    {row.primary_ownership_count || 0} основных
                    <div className="muted">{row.ownership_count || 0} всего назначений</div>
                  </td>
                  <td>{row.ready_for_publish_count || 0}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.indexation_intent)}`}>
                      {indexabilityLabel(row.indexation_intent)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.indexability_readiness_status)}`}>
                      {indexabilityLabel(row.indexability_readiness_status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReadiness.length > pageSize ? (
          <div className="flex items-center justify-between gap-3" style={{ marginTop: '14px', marginBottom: '26px' }}>
            <div className="owner-section-kicker">Страница {page} из {pageCount}</div>
            <div className="owner-actions" style={{ marginTop: 0 }}>
              {page > 1 ? <Link href={pageHref(page - 1)} className="owner-button">Назад</Link> : <span className="owner-button" style={{ opacity: .4 }}>Назад</span>}
              {page < pageCount ? <Link href={pageHref(page + 1)} className="owner-button">Дальше</Link> : <span className="owner-button" style={{ opacity: .4 }}>Дальше</span>}
            </div>
          </div>
        ) : null}

        {approvedRows.length ? (
          <section className="owner-section">
            <div className="owner-section-head">
              <div><h2>Одобрено, ждёт применения</h2><div className="owner-section-kicker">Канонический indexation intent меняется отдельным защищённым действием</div></div>
            </div>
            <div className="owner-list">
              {approvedRows.map((row) => (
                <article className="owner-list-row" key={row.proposal_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta"><span className="owner-status is-success">Одобрено человеком</span><span>{indexabilityLabel(row.decision)}</span></div>
                    <h3>{asText(row.card_title, row.url_path || 'Страница')}</h3>
                    <p>{asText(row.url_path)} · {asText(row.rationale, 'Обоснование не указано.')}</p>
                  </div>
                  <div className="owner-list-row-side">
                    <OwnerProposalApplyClient
                      proposalKind="INDEXABILITY"
                      proposalId={row.proposal_id}
                      title={asText(row.card_title, row.url_path || 'Страница')}
                      consequence={`SEO Page Portfolio изменит indexation intent согласно решению «${indexabilityLabel(row.decision)}». Это не публикует контент и не запускает внешний deployment.`}
                      enabled={ownerActions.ready}
                      blockers={ownerActions.blockers}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '22px' }}>
          <summary>
            <span><strong>История предложений допуска</strong><small>Канонические изменения индексации требуют отдельной человеческой проверки</small></span>
            <span className="owner-section-kicker">{proposals.length}</span>
          </summary>
          <div className="owner-disclosure-body">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Страница</th>
                    <th>Решение</th>
                    <th>Статус</th>
                    <th>Обоснование</th>
                    <th>Проверка</th>
                    <th>Применённое намерение</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.length ? proposals.map((row) => (
                    <tr key={row.proposal_id}>
                      <td><strong>{asText(row.card_title, row.url_path || '—')}</strong><div className="muted">{asText(row.url_path)}</div></td>
                      <td>{indexabilityLabel(row.decision)}</td>
                      <td>{indexabilityLabel(row.proposal_status)}</td>
                      <td>{asText(row.rationale)}</td>
                      <td>{asText(row.review_note)}</td>
                      <td>{indexabilityLabel(row.applied_indexation_intent)}</td>
                      <td>
                        {row.proposal_status === 'REVIEW' ? (
                          <OwnerProposalReviewClient
                            proposalKind="INDEXABILITY"
                            proposalId={row.proposal_id}
                            expectedStatus={String(row.proposal_status || 'REVIEW')}
                            title={asText(row.card_title, row.url_path || 'Страница')}
                            summary={`Предлагаемое решение: ${indexabilityLabel(row.decision)}. ${asText(row.rationale, '')}`}
                            enabled={ownerActions.ready}
                            blockers={ownerActions.blockers}
                          />
                        ) : null}
                      </td>
                    </tr>
                  )) : <tr><td colSpan={7}>Предложений по индексации пока нет.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}
