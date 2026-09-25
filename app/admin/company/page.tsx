import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Layers3,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { OwnerSignalDrawerClient } from '@/components/admin/OwnerSignalDrawerClient';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { presentOwnerAttention, presentSignal, presentWorkItem, formatDueTime, formatRelativeTime } from '@/lib/owner-ui/presenters';
import { admissionLabel, priorityLabel, roleLabel, scopeLabel } from '@/lib/owner-ui/terminology';
import { presentCommerceExecutionApprovals } from '@/lib/owner-ui/commerceApprovals';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

type TodayData = {
  attention: Row[];
  commerceApprovals: Row[];
  signals: Row[];
  work: Row[];
  workTotal: number;
  opportunities: Row[];
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
      commerceApprovals: [],
      signals: [],
      work: [],
      workTotal: 0,
      opportunities: [],
      readiness: [],
      operations: { productFacts: 0, keywordReview: 0, cqaActionable: 0, cqaAutomatic: 0 },
      error: getMissingAdminDataEnvMessage(),
    };
  }

  const [
    attentionResult,
    signalResult,
    workResult,
    opportunityResult,
    readinessResult,
    productFactsResult,
    keywordReviewResult,
    cqaActionableResult,
    cqaAutomaticResult,
    commerceApprovalsResult,
  ] = await Promise.all([
    supabase
      .from('feya_commerce_v_owner_attention_safe_v2')
      .select('*')
      .in('attention_status', ['OPEN', 'ACKNOWLEDGED'])
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('feya_commerce_v_growth_signal_candidates_safe_v2')
      .select('signal_fingerprint,signal_code,title,summary,next_action,priority,accountable_domain,signal_state,case_admission_recommendation,materiality_score,evidence_json,generated_at')
      .order('priority', { ascending: true })
      .order('materiality_score', { ascending: false })
      .limit(12),
    supabase
      .from('feya_commerce_v_owner_work_safe_v1')
      .select('*', { count: 'exact' })
      .not('case_status', 'in', '(CLOSED,MERGED)')
      .order('priority', { ascending: true })
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('feya_commerce_v_growth_opportunities_safe_v1')
      .select('opportunity_id,title,opportunity_type,priority,opportunity_status,commercial_expiry_at,due_at,expiry_state,owner_role')
      .in('opportunity_status', ['OPEN', 'ACTIONING'])
      .or('expiry_state.is.null,expiry_state.neq.EXPIRED')
      .order('commercial_expiry_at', { ascending: true, nullsFirst: false })
      .limit(3),
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
    supabase
      .from('feya_growth_execution_requests_v1')
      .select('execution_request_id,action_code,request_status,request_payload_json,created_at,updated_at')
      .eq('request_status', 'APPROVAL_REQUIRED')
      .in('action_code', [
        'ADOPT_SOURCE_PRICE_BASELINE',
        'REPAIR_RELEASE_CONFIGURATION_BINDINGS',
        'REPAIR_MANUAL_CONFIGURATION_BINDINGS',
        'ADOPT_MANUAL_PRICE_LANE_GOVERNANCE',
      ])
      .order('created_at', { ascending: true }),
  ]);

  const firstError =
    attentionResult.error ||
    signalResult.error ||
    workResult.error ||
    opportunityResult.error ||
    readinessResult.error ||
    productFactsResult.error ||
    keywordReviewResult.error ||
    cqaActionableResult.error ||
    cqaAutomaticResult.error ||
    commerceApprovalsResult.error;
  if (firstError) {
    return {
      attention: [],
      commerceApprovals: [],
      signals: [],
      work: [],
      workTotal: 0,
      opportunities: [],
      readiness: [],
      operations: { productFacts: 0, keywordReview: 0, cqaActionable: 0, cqaAutomatic: 0 },
      error: firstError.message,
    };
  }

  return {
    attention: (attentionResult.data || []) as Row[],
    commerceApprovals: (commerceApprovalsResult.data || []) as Row[],
    signals: (signalResult.data || []) as Row[],
    work: (workResult.data || []) as Row[],
    workTotal: workResult.count || 0,
    opportunities: (opportunityResult.data || []) as Row[],
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

function pluralRu(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export default async function AdminHomePage() {
  const { attention, commerceApprovals, signals, work, workTotal, opportunities, readiness, operations, error } = await getTodayData();

  const attentionVM = attention.map((row) => ({ ...presentOwnerAttention(row), href: `/admin/company/owner-attention/${String(row.attention_id)}` }));
  const commerceAttentionVM = presentCommerceExecutionApprovals(commerceApprovals);
  const ownerDecisionItems = [...attentionVM, ...commerceAttentionVM];
  const attentionCodes = new Set(attentionVM.map((item) => item.sourceCode).filter(Boolean));

  const signalItems = signals
    .filter((row) => {
      const code = String(row.signal_code || '');
      const recommendation = String(row.case_admission_recommendation || '');
      return !attentionCodes.has(code) && recommendation !== 'OWNER_DECISION_REQUIRED' && recommendation !== 'DEFER_UNTIL_ACTIVE_OBJECTIVE';
    })
    .slice(0, 4)
    .map((row) => ({ row, vm: presentSignal(row) }));

  const workVM = work.map(presentWorkItem);
  const blockedScopes = readiness.filter((row) => String(row.scope_status || '').toUpperCase() === 'BLOCKED');
  const totalBlockers = readiness.reduce((sum, row) => sum + Number(row.blocking_count || 0), 0);
  const operationalQueueTotal = operations.productFacts + operations.keywordReview + operations.cqaActionable;
  const decisionWord = pluralRu(ownerDecisionItems.length, 'решение', 'решения', 'решений');
  const decisionVerb = ownerDecisionItems.length === 1 ? 'ждёт' : 'ждут';

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head owner-today-head">
          <div>
            <div className="owner-eyebrow"><span className="owner-eyebrow-mark" aria-hidden="true" />Центр управления</div>
            <h1>Сегодня</h1>
            <p>
              Что требует вашего решения, что команда уже делает и какие ограничения мешают следующему шагу.
            </p>
          </div>
          <div className="owner-today-date"><CalendarDays size={15} strokeWidth={1.7} aria-hidden="true" />{russianDate()}</div>
        </header>

        {error ? <OwnerDataError error={error} /> : null}

        {!error ? (
          <section className="owner-command-brief" aria-label="Сводка на сегодня">
            <div className="owner-command-brief-main">
              <div className={`owner-command-state${ownerDecisionItems.length ? ' is-attention' : ''}`}>
                <span className="owner-command-state-dot" aria-hidden="true" />
                {ownerDecisionItems.length ? 'Нужно ваше внимание' : 'Работа идёт'}
              </div>
              <h2>
                {ownerDecisionItems.length
                  ? `${ownerDecisionItems.length} ${decisionWord} ${decisionVerb} вас`
                  : 'Вашего решения сейчас не требуется'}
              </h2>
              <p>
                {ownerDecisionItems.length
                  ? 'Сначала разберите эти решения: они являются реальными точками human authority и могут удерживать следующий безопасный шаг.'
                  : totalBlockers
                    ? 'Команда продолжает подготовку к запуску. Ограничения ниже связаны с ещё не подключёнными данными и launch-gates, а не с аварией.'
                    : 'Основные рабочие потоки продолжаются без блокирующего участия владельца.'}
              </p>
            </div>
            <div className="owner-command-brief-metrics" aria-label="Ключевые состояния">
              <Link href="/admin/company/owner-attention">
                <span>Решения</span>
                <strong>{ownerDecisionItems.length}</strong>
                <small>{ownerDecisionItems.length ? 'нужно рассмотреть' : 'ничего не ждёт'}</small>
              </Link>
              <Link href="/admin/company/work#operational-queues">
                <span>Рабочие очереди</span>
                <strong>{operationalQueueTotal}</strong>
                <small>требуют обработки</small>
              </Link>
              <Link href="/admin/company/system">
                <span>Ограничения</span>
                <strong>{blockedScopes.length}</strong>
                <small>зон подготовки</small>
              </Link>
            </div>
          </section>
        ) : null}

        <section className="owner-section">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-attention" aria-hidden="true"><CircleAlert size={17} strokeWidth={1.7} /></span>
              <div>
                <h2>Нужно ваше решение</h2>
                <div className="owner-section-kicker">Только реальные точки, где без владельца нельзя продолжить безопасно</div>
              </div>
            </div>
            <Link href="/admin/company/owner-attention" className="owner-button">Показать всё</Link>
          </div>

          {ownerDecisionItems.length ? (
            <div className="owner-grid two">
              {ownerDecisionItems.slice(0, 3).map((item) => (
                <article className={`owner-card owner-decision-card ${toneClass(item.tone)}`} key={item.id}>
                  <div className="owner-card-meta">
                    <span className={`owner-status ${toneClass(item.tone)}`}>{item.priorityLabel}</span>
                    <span>{item.typeLabel}</span>
                    <span>{item.statusLabel}</span>
                  </div>
                  <h3 className="owner-card-title">{item.title}</h3>
                  <p className="owner-card-copy"><strong>Почему сейчас:</strong> {item.whyNow}</p>
                  <p className="owner-card-copy"><strong>Что нужно:</strong> {item.requiredAction}</p>
                  <div className="owner-card-meta" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <span>{item.dueAt ? `Срок: ${formatDueTime(item.dueAt)}` : 'Жёсткого срока нет'}</span>
                  </div>
                  <div className="owner-actions">
                    <Link href={item.href} className="owner-button primary owner-button-arrow">Рассмотреть <ArrowRight size={13} strokeWidth={1.8} aria-hidden="true" /></Link>
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
            <div className="owner-section-heading">
              <span className="owner-section-icon is-info" aria-hidden="true"><Activity size={17} strokeWidth={1.7} /></span>
              <div>
                <h2>Что существенно изменилось</h2>
                <div className="owner-section-kicker">Материальные сигналы без дублирования ваших решений и технического шума</div>
              </div>
            </div>
            <Link href="/admin/company/signals" className="owner-button">Все сигналы</Link>
          </div>

          {signalItems.length ? (
            <div className="owner-list owner-feed-list">
              {signalItems.map(({ row, vm }) => (
                <article className="owner-list-row" key={vm.id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className={`owner-status ${toneClass(vm.tone)}`}>{vm.priorityLabel}</span>
                      <span>{vm.ownerLabel}</span>
                      <span>{vm.statusLabel}</span>
                    </div>
                    <h3>{vm.title}</h3>
                    <p>{vm.summary}</p>
                  </div>
                  <div className="owner-list-row-side">
                    <OwnerSignalDrawerClient
                      vm={vm}
                      routing={admissionLabel(row.case_admission_recommendation)}
                      recommendation={String(row.case_admission_recommendation || '')}
                      evidence={(row.evidence_json || {}) as Record<string, unknown>}
                      generatedAt={row.generated_at ? String(row.generated_at) : null}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Новых значимых сигналов вне ваших текущих решений нет.</div>
          )}
        </section>

        {opportunities.length ? (
          <section className="owner-section">
            <div className="owner-section-head">
              <div className="owner-section-heading">
                <span className="owner-section-icon is-opportunity" aria-hidden="true"><Sparkles size={17} strokeWidth={1.7} /></span>
                <div>
                  <h2>Возможности</h2>
                  <div className="owner-section-kicker">Только реальные, ещё актуальные возможности из Growth OS</div>
                </div>
              </div>
              <Link href="/admin/opportunities" className="owner-button">Все возможности</Link>
            </div>
            <div className="owner-list">
              {opportunities.map((row) => (
                <Link href="/admin/opportunities" className="owner-list-row" key={String(row.opportunity_id)}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className="owner-status is-info">{priorityLabel(row.priority)}</span>
                      <span>{String(row.opportunity_status || '') === 'ACTIONING' ? 'В работе' : 'Открыта'}</span>
                      <span>{roleLabel(row.owner_role)}</span>
                    </div>
                    <h3>{String(row.title || 'Возможность роста')}</h3>
                    <p>
                      {row.commercial_expiry_at
                        ? `Окно актуальности до ${new Date(String(row.commercial_expiry_at)).toLocaleDateString('ru-RU')}`
                        : 'Жёсткое коммерческое окно не задано.'}
                    </p>
                  </div>
                  <div className="owner-list-row-side"><span className="owner-button">Исследовать</span></div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="owner-section">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-work" aria-hidden="true"><Workflow size={17} strokeWidth={1.7} /></span>
              <div>
                <h2>В работе</h2>
                <div className="owner-section-kicker">Реальные очереди товарной системы и SEO, плюс отдельные задачи роста</div>
              </div>
            </div>
            <Link href="/admin/company/work" className="owner-button">Открыть работу</Link>
          </div>

          <div className="owner-queue-strip">
            <Link href="/admin/seo-keyword-review" className="owner-queue-item">
              <span className="owner-queue-icon" aria-hidden="true"><Layers3 size={15} strokeWidth={1.7} /></span>
              <span className="owner-queue-copy"><strong>Проверка ключей</strong><small>смысл и маршрут</small></span>
              <b>{operations.keywordReview}</b>
            </Link>
            <Link href="/admin/product-facts-review" className="owner-queue-item">
              <span className="owner-queue-icon" aria-hidden="true"><ShieldCheck size={15} strokeWidth={1.7} /></span>
              <span className="owner-queue-copy"><strong>Факты товаров</strong><small>истина до SEO</small></span>
              <b>{operations.productFacts}</b>
            </Link>
            <Link href="/admin/content-qa" className="owner-queue-item">
              <span className="owner-queue-icon" aria-hidden="true"><Activity size={15} strokeWidth={1.7} /></span>
              <span className="owner-queue-copy"><strong>Контент QA</strong><small>проверка и правки</small></span>
              <b>{operations.cqaActionable}</b>
            </Link>
            <Link href="/admin/company/work#work-list" className="owner-queue-item">
              <span className="owner-queue-icon" aria-hidden="true"><Workflow size={15} strokeWidth={1.7} /></span>
              <span className="owner-queue-copy"><strong>Задачи роста</strong><small>durable workflow</small></span>
              <b>{workTotal}</b>
            </Link>
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
            <div className="owner-section-heading">
              <span className="owner-section-icon is-system" aria-hidden="true"><ShieldCheck size={17} strokeWidth={1.7} /></span>
              <div>
                <h2>Состояние системы</h2>
                <div className="owner-section-kicker">Надёжность и launch-gates без общего искусственного балла</div>
              </div>
            </div>
            <Link href="/admin/company/system" className="owner-button">Открыть систему</Link>
          </div>

          <div className={`owner-system-ribbon${blockedScopes.length ? ' is-limited' : ' is-healthy'}`}>
            <div className="owner-system-ribbon-main">
              <span className="owner-system-ribbon-icon" aria-hidden="true"><ShieldCheck size={18} strokeWidth={1.7} /></span>
              <div>
                <strong>{blockedScopes.length ? 'Система работает в режиме подготовки' : 'Критичных ограничений нет'}</strong>
                <p>
                  {blockedScopes.length
                    ? `${blockedScopes.length} из ${readiness.length} зон имеют launch-ограничения · ${totalBlockers} условий всего.`
                    : 'Основные зоны не сообщают о блокирующих условиях.'}
                </p>
              </div>
            </div>
            <div className="owner-system-ribbon-scopes">
              {readiness.map((row) => (
                <span key={String(row.readiness_scope)}>
                  {scopeLabel(row.readiness_scope)} <b>{Number(row.blocking_count || 0)}</b>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span>
                <strong>Для сведения</strong>
                <small>Фоновая работа и низкоприоритетные состояния, которые не требуют вашего решения</small>
              </span>
              <span className="owner-section-kicker">{operations.cqaAutomatic} автоматических проверок</span>
            </summary>
            <div className="owner-disclosure-body">
              <p className="owner-card-copy">
                {operations.cqaAutomatic
                  ? `${operations.cqaAutomatic} контентных черновиков проходят автоматические предварительные проверки. Они появятся выше только если найдут блокировку или потребуют решения.`
                  : 'Фоновых проверок, которые нужно отдельно показывать, сейчас нет.'}
              </p>
              <div className="owner-actions">
                <Link href="/admin/company/work#operational-queues" className="owner-button">Открыть рабочие очереди</Link>
              </div>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
