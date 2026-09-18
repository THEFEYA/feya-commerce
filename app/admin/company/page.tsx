import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { presentOwnerAttention, presentSignal, presentWorkItem, formatRelativeTime } from '@/lib/owner-ui/presenters';
import { scopeLabel, statusLabel, ownerToneForStatus } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

type TodayData = {
  attention: Row[];
  signals: Row[];
  work: Row[];
  readiness: Row[];
  operations: {
    productFacts: number;
    keywordReview: number;
    cqaActionable: number;
    cqaAutomatic: number;
  };
  error?: string;
};

async function getTodayData(): Promise<TodayData> {
  const supabase = getAdminReadClient();
  if (!supabase) {
    return {
      attention: [],
      signals: [],
      work: [],
      readiness: [],
      operations: { productFacts: 0, keywordReview: 0, cqaActionable: 0, cqaAutomatic: 0 },
      error: getMissingAdminDataEnvMessage(),
    };
  }

  const [
    attentionResult,
    signalResult,
    workResult,
    readinessResult,
    productFactsResult,
    keywordReviewResult,
    cqaActionableResult,
    cqaAutomaticResult,
  ] = await Promise.all([
    supabase
      .from('feya_commerce_v_owner_attention_safe_v2')
      .select('*')
      .in('attention_status', ['OPEN', 'ACKNOWLEDGED'])
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('feya_commerce_v_growth_signal_candidates_safe_v2')
      .select('signal_fingerprint,signal_code,title,summary,next_action,priority,accountable_domain,signal_state,case_admission_recommendation,materiality_score')
      .order('priority', { ascending: true })
      .order('materiality_score', { ascending: false })
      .limit(12),
    supabase
      .from('feya_commerce_v_owner_work_safe_v1')
      .select('*')
      .not('case_status', 'in', '(CLOSED,MERGED)')
      .order('priority', { ascending: true })
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('feya_commerce_v_launch_readiness_summary_safe_v2')
      .select('*')
      .order('readiness_scope', { ascending: true }),
    supabase
      .from('feya_commerce_v_product_fact_review_queue_safe_v1')
      .select('fact_review_id', { count: 'exact', head: true })
      .eq('review_status', 'pending'),
    supabase
      .from('feya_commerce_v_keyword_cleanup_review_status_safe_v1')
      .select('cleanup_id', { count: 'exact', head: true })
      .eq('review_status', 'pending'),
    supabase
      .from('feya_commerce_v_content_qa_shadow_status_safe_v1')
      .select('draft_id', { count: 'exact', head: true })
      .in('cqa_shadow_state', ['READY_FOR_HUMAN_AND_CQA_REVIEW', 'READY_FOR_INDEPENDENT_CQA', 'REVISION_REQUIRED', 'BLOCKED_BY_VALIDATION']),
    supabase
      .from('feya_commerce_v_content_qa_shadow_status_safe_v1')
      .select('draft_id', { count: 'exact', head: true })
      .in('cqa_shadow_state', ['APPROVED_NEEDS_SIMILARITY_CHECK', 'NEEDS_PRECHECKS', 'APPROVED_NEEDS_COMPONENT_CLAIM_CHECK']),
  ]);

  const firstError =
    attentionResult.error ||
    signalResult.error ||
    workResult.error ||
    readinessResult.error ||
    productFactsResult.error ||
    keywordReviewResult.error ||
    cqaActionableResult.error ||
    cqaAutomaticResult.error;
  if (firstError) {
    return {
      attention: [],
      signals: [],
      work: [],
      readiness: [],
      operations: { productFacts: 0, keywordReview: 0, cqaActionable: 0, cqaAutomatic: 0 },
      error: firstError.message,
    };
  }

  return {
    attention: (attentionResult.data || []) as Row[],
    signals: (signalResult.data || []) as Row[],
    work: (workResult.data || []) as Row[],
    readiness: (readinessResult.data || []) as Row[],
    operations: {
      productFacts: productFactsResult.count || 0,
      keywordReview: keywordReviewResult.count || 0,
      cqaActionable: cqaActionableResult.count || 0,
      cqaAutomatic: cqaAutomaticResult.count || 0,
    },
  };
}

function toneClass(tone: string) {
  return tone === 'danger'
    ? 'is-danger'
    : tone === 'warning'
      ? 'is-warning'
      : tone === 'success'
        ? 'is-success'
        : tone === 'info'
          ? 'is-info'
          : '';
}

function russianDate() {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

export default async function AdminHomePage() {
  const { attention, signals, work, readiness, operations, error } = await getTodayData();

  const attentionVM = attention.map(presentOwnerAttention);
  const attentionCodes = new Set(attentionVM.map((item) => item.sourceCode).filter(Boolean));

  const signalVM = signals
    .filter((row) => {
      const code = String(row.signal_code || '');
      const recommendation = String(row.case_admission_recommendation || '');
      return !attentionCodes.has(code) && recommendation !== 'OWNER_DECISION_REQUIRED' && recommendation !== 'DEFER_UNTIL_ACTIVE_OBJECTIVE';
    })
    .slice(0, 4)
    .map(presentSignal);

  const workVM = work.map(presentWorkItem);
  const operationalQueueCount = operations.productFacts + operations.keywordReview + operations.cqaActionable;
  const blockedScopes = readiness.filter((row) => String(row.scope_status || '').toUpperCase() === 'BLOCKED');
  const totalBlockers = readiness.reduce((sum, row) => sum + Number(row.blocking_count || 0), 0);

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Центр управления</div>
            <h1>Сегодня</h1>
            <p>
              Короткая сводка только по тому, что действительно требует внимания, уже выполняется или мешает двигаться дальше.
            </p>
          </div>
          <div className="owner-page-meta">{russianDate()}</div>
        </header>

        {error ? (
          <div className="owner-card is-danger">
            <div className="owner-status is-danger">Ошибка данных</div>
            <h2 className="owner-card-title" style={{ marginTop: '10px' }}>Не удалось собрать сводку</h2>
            <p className="owner-card-copy">{error}</p>
          </div>
        ) : null}

        <section className="owner-section">
          <div className="owner-section-head">
            <div>
              <h2>Нужно ваше решение</h2>
              <div className="owner-section-kicker">Только то, что действительно требует владельца</div>
            </div>
            <Link href="/admin/company/owner-attention" className="owner-button">Показать всё</Link>
          </div>

          {attentionVM.length ? (
            <div className="owner-grid two">
              {attentionVM.slice(0, 3).map((item) => (
                <article className={`owner-card ${toneClass(item.tone)}`} key={item.id}>
                  <div className="owner-card-meta">
                    <span className={`owner-status ${toneClass(item.tone)}`}>{item.priorityLabel}</span>
                    <span>{item.typeLabel}</span>
                    <span>{item.statusLabel}</span>
                  </div>
                  <h3 className="owner-card-title">{item.title}</h3>
                  <p className="owner-card-copy"><strong>Почему сейчас:</strong> {item.whyNow}</p>
                  <p className="owner-card-copy"><strong>Что нужно:</strong> {item.requiredAction}</p>
                  <div className="owner-actions">
                    <Link href={`/admin/company/owner-attention/${item.id}`} className="owner-button primary">Рассмотреть</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Сейчас нет решений, которые требуют вашего участия.</div>
          )}
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <div>
              <h2>Что важно сейчас</h2>
              <div className="owner-section-kicker">Материальные сигналы без дублирования ваших решений</div>
            </div>
            <Link href="/admin/company/signals" className="owner-button">Все сигналы</Link>
          </div>

          {signalVM.length ? (
            <div className="owner-list">
              {signalVM.map((item) => (
                <article className="owner-list-row" key={item.id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className={`owner-status ${toneClass(item.tone)}`}>{item.priorityLabel}</span>
                      <span>{item.ownerLabel}</span>
                      <span>{item.statusLabel}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                  </div>
                  <div className="owner-list-row-side">
                    <Link href="/admin/company/signals" className="owner-button">Проверить</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Новых значимых сигналов вне ваших текущих решений нет.</div>
          )}
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <div>
              <h2>В работе</h2>
              <div className="owner-section-kicker">Реальные очереди товарной системы и SEO, плюс отдельные задачи роста</div>
            </div>
            <Link href="/admin/company/work" className="owner-button">Открыть работу</Link>
          </div>

          <div className="owner-summary-strip">
            <div className="owner-summary-cell">
              <strong>{operationalQueueCount}</strong>
              <span>Элементов в рабочих очередях</span>
            </div>
            <div className="owner-summary-cell">
              <strong>{operations.productFacts}</strong>
              <span>Товаров ждут проверки фактов</span>
            </div>
            <div className="owner-summary-cell">
              <strong>{operations.cqaActionable}</strong>
              <span>Контентных проверок / исправлений</span>
            </div>
            <div className="owner-summary-cell">
              <strong>{workVM.length}</strong>
              <span>Активных задач роста</span>
            </div>
          </div>

          {workVM.length ? (
            <div className="owner-list" style={{ marginTop: '10px' }}>
              {workVM.slice(0, 3).map((item) => (
                <article className="owner-list-row" key={item.id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className={`owner-status ${toneClass(item.tone)}`}>{item.statusLabel}</span>
                      <span>{item.ownerLabel}</span>
                      <span>{item.priorityLabel}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.purpose}</p>
                  </div>
                  <div className="owner-list-row-side">
                    <span className="owner-section-kicker">{formatRelativeTime(item.updatedAt)}</span>
                    <Link href="/admin/company/work" className="owner-button">Открыть</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty" style={{ marginTop: '10px' }}>
              Отдельных задач роста сейчас нет. При этом товарная система и SEO продолжают реальную работу: {operations.keywordReview} ключевых запросов в очереди проверки, {operations.cqaAutomatic} контентных черновиков проходят автоматические проверки.
            </div>
          )}
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <div>
              <h2>Состояние системы</h2>
              <div className="owner-section-kicker">Четыре независимые зоны готовности без общего искусственного балла</div>
            </div>
            <Link href="/admin/company/system" className="owner-button">Открыть систему</Link>
          </div>

          <div className={`owner-card ${blockedScopes.length ? 'is-warning' : 'is-success'}`}>
            <div className={`owner-status ${blockedScopes.length ? 'is-warning' : 'is-success'}`}>
              {blockedScopes.length ? 'Подготовка к запуску' : 'Критичных ограничений нет'}
            </div>
            <h3 className="owner-card-title" style={{ marginTop: '10px' }}>
              {blockedScopes.length
                ? `${blockedScopes.length} из ${readiness.length} зон пока имеют блокирующие условия`
                : 'Основные зоны системы готовы'}
            </h3>
            <p className="owner-card-copy">
              {blockedScopes.length
                ? `Всего блокирующих условий: ${totalBlockers}. Это ожидаемое состояние до подключения домена, поисковых данных, реального commerce и измерения результатов.`
                : 'Система не сообщает об активных блокирующих условиях.'}
            </p>
            <div className="owner-card-meta" style={{ marginTop: '12px', marginBottom: 0 }}>
              {readiness.map((row) => (
                <span key={String(row.readiness_scope)}>
                  {scopeLabel(row.readiness_scope)} · {Number(row.blocking_count || 0)}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
