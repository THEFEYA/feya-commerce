import Link from 'next/link';
import { ArrowRight, Bot, CheckCircle2, CircleAlert, Clock3, Layers3, PauseCircle, PlayCircle, ShieldCheck, Workflow } from 'lucide-react';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { presentOwnerAttention, presentRole, presentWorkItem, formatRelativeTime } from '@/lib/owner-ui/presenters';
import { OwnerWorkDrawerClient } from '@/components/admin/OwnerWorkDrawerClient';
import { OwnerRoleDrawerClient } from '@/components/admin/OwnerRoleDrawerClient';
import { OwnerSavedViewsClient } from '@/components/admin/OwnerSavedViewsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

async function getWorkData(): Promise<{
  work: Row[];
  attention: Row[];
  roles: Row[];
  operations: {
    productFacts: number;
    keywordReview: number;
    cqaHumanReview: number;
    cqaIndependent: number;
    cqaRevision: number;
    cqaBlocked: number;
    cqaAutomaticChecks: number;
  };
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) {
    return {
      work: [],
      attention: [],
      roles: [],
      operations: { productFacts: 0, keywordReview: 0, cqaHumanReview: 0, cqaIndependent: 0, cqaRevision: 0, cqaBlocked: 0, cqaAutomaticChecks: 0 },
      error: getMissingAdminDataEnvMessage(),
    };
  }

  const [
    workResult,
    attentionResult,
    rolesResult,
    productFactsResult,
    keywordReviewResult,
    cqaHumanResult,
    cqaIndependentResult,
    cqaRevisionResult,
    cqaBlockedResult,
    cqaAutomaticResult,
  ] = await Promise.all([
    supabase
      .from('feya_commerce_v_owner_work_safe_v1')
      .select('*')
      .order('priority', { ascending: true })
      .order('updated_at', { ascending: false }),
    supabase
      .from('feya_commerce_v_owner_attention_safe_v2')
      .select('*')
      .in('attention_status', ['OPEN', 'ACKNOWLEDGED'])
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('feya_commerce_v_role_activation_safe_v1')
      .select('*')
      .order('role_type', { ascending: true })
      .order('role_code', { ascending: true }),
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
      .eq('cqa_shadow_state', 'READY_FOR_HUMAN_AND_CQA_REVIEW'),
    supabase
      .from('feya_commerce_v_content_qa_shadow_status_safe_v1')
      .select('draft_id', { count: 'exact', head: true })
      .eq('cqa_shadow_state', 'READY_FOR_INDEPENDENT_CQA'),
    supabase
      .from('feya_commerce_v_content_qa_shadow_status_safe_v1')
      .select('draft_id', { count: 'exact', head: true })
      .eq('cqa_shadow_state', 'REVISION_REQUIRED'),
    supabase
      .from('feya_commerce_v_content_qa_shadow_status_safe_v1')
      .select('draft_id', { count: 'exact', head: true })
      .eq('cqa_shadow_state', 'BLOCKED_BY_VALIDATION'),
    supabase
      .from('feya_commerce_v_content_qa_shadow_status_safe_v1')
      .select('draft_id', { count: 'exact', head: true })
      .in('cqa_shadow_state', ['APPROVED_NEEDS_SIMILARITY_CHECK', 'NEEDS_PRECHECKS', 'APPROVED_NEEDS_COMPONENT_CLAIM_CHECK']),
  ]);

  const firstError =
    workResult.error ||
    attentionResult.error ||
    rolesResult.error ||
    productFactsResult.error ||
    keywordReviewResult.error ||
    cqaHumanResult.error ||
    cqaIndependentResult.error ||
    cqaRevisionResult.error ||
    cqaBlockedResult.error ||
    cqaAutomaticResult.error;
  if (firstError) {
    return {
      work: [],
      attention: [],
      roles: [],
      operations: { productFacts: 0, keywordReview: 0, cqaHumanReview: 0, cqaIndependent: 0, cqaRevision: 0, cqaBlocked: 0, cqaAutomaticChecks: 0 },
      error: firstError.message,
    };
  }

  return {
    work: (workResult.data || []) as Row[],
    attention: (attentionResult.data || []) as Row[],
    roles: (rolesResult.data || []) as Row[],
    operations: {
      productFacts: productFactsResult.count || 0,
      keywordReview: keywordReviewResult.count || 0,
      cqaHumanReview: cqaHumanResult.count || 0,
      cqaIndependent: cqaIndependentResult.count || 0,
      cqaRevision: cqaRevisionResult.count || 0,
      cqaBlocked: cqaBlockedResult.count || 0,
      cqaAutomaticChecks: cqaAutomaticResult.count || 0,
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

function groupLabel(status: string) {
  if (status === 'BLOCKED') return 'Заблокировано';
  if (status === 'RUNNING') return 'В работе';
  if (status === 'QUEUED') return 'В очереди';
  if (status.startsWith('WAITING')) return 'Ожидает';
  if (status === 'MEASURING') return 'Измеряем результат';
  if (status === 'LEARNING') return 'Формируем вывод';
  if (status === 'COMPLETED') return 'Работа завершена';
  if (status === 'CLOSED') return 'Закрыто';
  return 'Подготовлено';
}

const GROUP_ORDER = [
  'Заблокировано',
  'В работе',
  'В очереди',
  'Ожидает',
  'Измеряем результат',
  'Формируем вывод',
  'Работа завершена',
  'Подготовлено',
  'Закрыто',
];

export default async function AdminWorkPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; owner?: string }> }) {
  const params = await searchParams;
  const { work, attention, roles, operations, error } = await getWorkData();
  const q = String(params.q || '').trim().toLowerCase();
  const statusFilter = String(params.status || 'active');
  const ownerFilter = String(params.owner || 'all');
  const workVM = work.map(presentWorkItem);
  const activeWorkVM = workVM.filter((item) => !['COMPLETED', 'CLOSED'].includes(item.status));
  const attentionVM = attention.map(presentOwnerAttention);
  const roleVM = roles.map(presentRole);
  const roleRows = new Map(roles.map((row) => [String(row.role_code || '').trim().toUpperCase(), row]));
  const roleWork = new Map<string, { active: number; queued: number; waiting: number; latestTitle: string | null; latestAt: string | null }>();

  work.forEach((row, index) => {
    const item = workVM[index];
    const code = String(row.current_accountable_domain || '').trim().toUpperCase();
    if (!code || !item) return;

    const current = roleWork.get(code) || { active: 0, queued: 0, waiting: 0, latestTitle: null, latestAt: null };
    if (!['COMPLETED', 'CLOSED'].includes(item.status)) {
      current.active += 1;
      if (item.status === 'QUEUED') current.queued += 1;
      if (item.status.startsWith('WAITING') || item.status === 'BLOCKED') current.waiting += 1;
    }

    const itemAt = item.updatedAt || null;
    if (!current.latestAt || (itemAt && new Date(itemAt).getTime() > new Date(current.latestAt).getTime())) {
      current.latestAt = itemAt;
      current.latestTitle = item.title || null;
    }

    roleWork.set(code, current);
  });
  const operationalWork =
    operations.productFacts +
    operations.keywordReview +
    operations.cqaHumanReview +
    operations.cqaIndependent +
    operations.cqaRevision +
    operations.cqaBlocked;
  const cqaBars = [
    { label: 'Человек + проверка качества', value: operations.cqaHumanReview, tone: 'info' },
    { label: 'Независимая проверка', value: operations.cqaIndependent, tone: 'success' },
    { label: 'Нужны исправления', value: operations.cqaRevision, tone: 'warning' },
    { label: 'Заблокировано', value: operations.cqaBlocked, tone: 'danger' },
    { label: 'Автопроверки', value: operations.cqaAutomaticChecks, tone: 'neutral' },
  ];
  const cqaMax = Math.max(1, ...cqaBars.map((item) => item.value));
  const activeQueueTotal = operationalWork + activeWorkVM.length;
  const lifecycle = {
    running: workVM.filter((item) => item.status === 'RUNNING').length,
    queued: workVM.filter((item) => item.status === 'QUEUED').length,
    waiting: workVM.filter((item) => item.status.startsWith('WAITING')).length,
    blocked: workVM.filter((item) => item.status === 'BLOCKED').length,
    measuring: workVM.filter((item) => item.status === 'MEASURING' || item.status === 'LEARNING').length,
    completed: workVM.filter((item) => item.status === 'COMPLETED' || item.status === 'CLOSED').length,
  };

  const filteredWorkVM = workVM.filter((item) => {
    const haystack = [item.title, item.purpose, item.ownerLabel, item.statusLabel, item.blockedReason, item.waitReason]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    const matchesQuery = !q || haystack.includes(q);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !['COMPLETED', 'CLOSED'].includes(item.status)) ||
      item.status === statusFilter;
    const matchesOwner = ownerFilter === 'all' || item.ownerLabel === ownerFilter;
    return matchesQuery && matchesStatus && matchesOwner;
  });

  const grouped = new Map<string, typeof filteredWorkVM>();
  for (const item of filteredWorkVM) {
    const label = groupLabel(item.status);
    grouped.set(label, [...(grouped.get(label) || []), item]);
  }

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow"><span className="owner-eyebrow-mark" aria-hidden="true" />Выполнение</div>
            <h1>Работа</h1>
            <p>Что реально выполняется, чего ждёт система и где без владельца нельзя продолжить безопасно.</p>
          </div>
        </header>

        {!error ? (
          <section className="owner-command-brief owner-work-brief" aria-label="Сводка работы">
            <div className="owner-command-brief-main">
              <div className={`owner-command-state${attentionVM.length ? ' is-attention' : ''}`}>
                <span className="owner-command-state-dot" aria-hidden="true" />
                {attentionVM.length ? 'Есть работа, которая ждёт вас' : 'Работа идёт без вашего решения'}
              </div>
              <h2>{activeQueueTotal ? `${activeQueueTotal} элементов в рабочих очередях` : 'Активных очередей сейчас нет'}</h2>
              <p>
                {activeWorkVM.length
                  ? 'Отдельные задачи роста идут вместе с операционной работой.'
                  : 'Отдельных Growth Cases сейчас нет. Это не означает отсутствие работы: товарные, ключевые и контентные очереди учитываются отдельно.'}
              </p>
            </div>
            <div className="owner-command-brief-metrics" aria-label="Ключевые рабочие состояния">
              <a href="#owner-waiting"><span>Ждёт вас</span><strong>{attentionVM.length}</strong><small>решений владельца</small></a>
              <a href="#operational-queues"><span>Очереди</span><strong>{operationalWork}</strong><small>операционных элементов</small></a>
              <a href="#work-list"><span>Рост</span><strong>{activeWorkVM.length}</strong><small>активных задач</small></a>
            </div>
          </section>
        ) : null}

        <nav className="owner-subnav" aria-label="Разделы работы">
          <a href="#owner-waiting">Ждёт вас · {attentionVM.length}</a>
          <a href="#operational-queues">Операционные очереди · {operationalWork}</a>
          <a href="#work-list">Задачи роста · {activeWorkVM.length}</a>
          <a href="#team">Команда FEYA · {roleVM.length}</a>
        </nav>

        {workVM.length ? (
          <section className="owner-work-lifecycle" aria-label="Состояния задач роста">
            <div className="owner-work-lifecycle-label">
              <span>Жизненный цикл</span>
              <small>реальные состояния workflow, не процент выполнения</small>
            </div>
            <div className="owner-work-lifecycle-items">
              <a href="#work-list" className={lifecycle.running ? 'is-live' : ''}>
                <span className="owner-work-lifecycle-icon"><PlayCircle size={14} strokeWidth={1.8} /></span>
                <span><strong>{lifecycle.running}</strong><small>в работе</small></span>
              </a>
              <a href="#work-list" className={lifecycle.queued ? 'is-queued' : ''}>
                <span className="owner-work-lifecycle-icon"><Clock3 size={14} strokeWidth={1.8} /></span>
                <span><strong>{lifecycle.queued}</strong><small>в очереди</small></span>
              </a>
              <a href="#work-list" className={lifecycle.waiting || lifecycle.blocked ? 'is-waiting' : ''}>
                <span className="owner-work-lifecycle-icon"><PauseCircle size={14} strokeWidth={1.8} /></span>
                <span><strong>{lifecycle.waiting + lifecycle.blocked}</strong><small>ждут / блокированы</small></span>
              </a>
              <a href="#work-list" className={lifecycle.measuring ? 'is-measuring' : ''}>
                <span className="owner-work-lifecycle-icon"><Workflow size={14} strokeWidth={1.8} /></span>
                <span><strong>{lifecycle.measuring}</strong><small>измеряются</small></span>
              </a>
              <a href="#work-list" className={lifecycle.completed ? 'is-done' : ''}>
                <span className="owner-work-lifecycle-icon"><CheckCircle2 size={14} strokeWidth={1.8} /></span>
                <span><strong>{lifecycle.completed}</strong><small>завершены</small></span>
              </a>
            </div>
          </section>
        ) : null}

        {error ? <OwnerDataError error={error} /> : null}

        <section className="owner-section" id="owner-waiting">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-attention" aria-hidden="true"><CircleAlert size={17} strokeWidth={1.7} /></span>
              <div><h2>Ждёт вас</h2><div className="owner-section-kicker">Только работа, которая остановлена на границе полномочий владельца</div></div>
            </div>
          </div>

          {attentionVM.length ? (
            <div className="owner-list">
              {attentionVM.map((item) => (
                <article className="owner-list-row" key={item.id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className={`owner-status ${toneClass(item.tone)}`}>{item.priorityLabel}</span>
                      <span>{item.typeLabel}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.whyNow}</p>
                  </div>
                  <div className="owner-list-row-side">
                    <Link href={`/admin/company/owner-attention/${item.id}`} className="owner-button primary">Рассмотреть</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Сейчас ни одна работа не ждёт вашего решения.</div>
          )}
        </section>

        <section className="owner-section" id="operational-queues">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-work" aria-hidden="true"><Layers3 size={17} strokeWidth={1.7} /></span>
              <div><h2>Операционные очереди</h2><div className="owner-section-kicker">Реальная работа товара, поиска и контента — независимо от наличия Growth Case</div></div>
            </div>
          </div>

          <div className="owner-grid two">
            <Link href="/admin/product-facts-review" className={`owner-card ${operations.productFacts ? 'is-warning' : 'is-success'}`}>
              <div className={`owner-status ${operations.productFacts ? 'is-warning' : 'is-success'}`}>
                {operations.productFacts ? 'Нужно проверить' : 'Очередь пуста'}
              </div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Факты о товарах</h3>
              <p className="owner-card-copy">
                {operations.productFacts} товаров ждут проверки исходных фактов и сопоставления. Это нужно исправлять в источнике, а не маскировать переписыванием SEO-текста.
              </p>
            </Link>

            <Link href="/admin/seo-keyword-review" className={`owner-card ${operations.keywordReview ? 'is-info' : 'is-success'}`}>
              <div className={`owner-status ${operations.keywordReview ? 'is-info' : 'is-success'}`}>
                {operations.keywordReview ? 'В очереди' : 'Очередь пуста'}
              </div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Проверка ключевых слов</h3>
              <p className="owner-card-copy">
                {operations.keywordReview} ключевых запросов находятся в очереди смысловой, маршрутной или ALT-проверки. Сами запросы остаются на языке поиска.
              </p>
            </Link>

            <Link href="/admin/content-qa" className={`owner-card ${operations.cqaBlocked || operations.cqaRevision ? 'is-warning' : 'is-info'}`}>
              <div className={`owner-status ${operations.cqaBlocked || operations.cqaRevision ? 'is-warning' : 'is-info'}`}>
                Контроль качества
              </div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Контент и независимая проверка</h3>
              <div className="owner-mini-bars" style={{ marginTop: '12px' }}>
                {cqaBars.map((item) => (
                  <div className="owner-mini-bar" key={item.label}>
                    <div className="owner-mini-bar-label"><span>{item.label}</span><strong>{item.value}</strong></div>
                    <div className="owner-mini-bar-track">
                      <i className={`is-${item.tone}`} style={{ width: `${Math.max(item.value ? 5 : 0, Math.round((item.value / cqaMax) * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Link>

            <details className="owner-disclosure owner-card">
              <summary>
                <span>
                  <span className="owner-status">Автоматически</span>
                  <strong>Предварительные проверки контента</strong>
                </span>
                <span className="owner-section-kicker">{operations.cqaAutomaticChecks} в процессе</span>
              </summary>
              <p className="owner-card-copy">
                Эти черновики проходят проверки сходства, состава или базовые предварительные проверки. Это фоновая работа и не требует вашего участия, пока проверка не найдёт проблему.
              </p>
            </details>
          </div>
        </section>

        <section className="owner-section" id="work-list">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-info" aria-hidden="true"><Workflow size={17} strokeWidth={1.7} /></span>
              <div><h2>Текущая работа</h2><div className="owner-section-kicker">Статус приходит из реального процесса; перетаскивание карточек его не меняет</div></div>
            </div>
          </div>

          {workVM.length ? (
            <form action="/admin/company/work" className="owner-card" style={{ marginBottom: '14px' }}>
              <div className="grid gap-3 lg:grid-cols-[1fr_250px_260px_auto] lg:items-end">
                <label>
                  <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск работы</div>
                  <input name="q" defaultValue={q} className="field" placeholder="задача, причина, роль…" />
                </label>
                <label>
                  <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Состояние</div>
                  <select name="status" defaultValue={statusFilter} className="field">
                    <option value="active">Только активные</option>
                    <option value="BLOCKED">Заблокировано</option>
                    <option value="RUNNING">В работе</option>
                    <option value="QUEUED">В очереди</option>
                    <option value="MEASURING">Измеряем результат</option>
                    <option value="LEARNING">Формируем вывод</option>
                    <option value="COMPLETED">Завершено</option>
                    <option value="all">Все состояния</option>
                  </select>
                </label>
                <label>
                  <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Ответственная роль</div>
                  <select name="owner" defaultValue={ownerFilter} className="field">
                    <option value="all">Все роли</option>
                    {roleVM.map((role) => <option value={role.name} key={role.code}>{role.name}</option>)}
                  </select>
                </label>
                <button type="submit" className="owner-button primary">Применить</button>
              </div>
              <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
                <span>После фильтра: {filteredWorkVM.length}</span>
                <span>Всего процессов: {workVM.length}</span>
                <Link href="/admin/company/work#work-list">Сбросить</Link>
              </div>
              <OwnerSavedViewsClient scope="work" />
            </form>
          ) : null}

          {filteredWorkVM.length ? (
            GROUP_ORDER.filter((label) => grouped.has(label)).map((label) => {
              const items = grouped.get(label) || [];
              const expanded = !['Работа завершена', 'Закрыто'].includes(label);
              return (
                <details className="owner-disclosure owner-disclosure-section" key={label} open={expanded} style={{ marginBottom: '12px' }}>
                  <summary>
                    <span><strong>{label}</strong><small>{items.length} элементов</small></span>
                    <span className="owner-section-kicker">{expanded ? 'актуальная работа' : 'история'}</span>
                  </summary>
                  <div className="owner-disclosure-body owner-list">
                    {items.map((item) => (
                      <article className="owner-list-row" key={item.id}>
                        <div className="owner-list-row-main">
                          <div className="owner-card-meta">
                            <span className={`owner-status ${toneClass(item.tone)}`}>{item.statusLabel}</span>
                            <span>{item.priorityLabel}</span>
                            <span>{item.ownerLabel}</span>
                          </div>
                          <h3>{item.title}</h3>
                          <p>{item.purpose}</p>
                          {item.blockedReason ? <p style={{ marginTop: '5px' }}><strong>Блокирует:</strong> {item.blockedReason}</p> : null}
                          {item.waitReason ? <p style={{ marginTop: '5px' }}><strong>Ожидает:</strong> {item.waitReason}</p> : null}
                        </div>
                        <div className="owner-list-row-side">
                          <span className="owner-section-kicker">{formatRelativeTime(item.updatedAt)}</span>
                          <OwnerWorkDrawerClient item={item} />
                        </div>
                      </article>
                    ))}
                  </div>
                </details>
              );
            })
          ) : (
            <div className="owner-empty">
              {workVM.length
                ? 'По текущему фильтру задач роста нет.'
                : 'Активных задач роста и процессов пока нет. Это не означает, что работы нет: реальные очереди товарной системы и SEO показаны выше. FEYA не создаёт искусственные задачи только ради заполнения панели.'}
            </div>
          )}
        </section>

        <section className="owner-section" id="team">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-team" aria-hidden="true"><Bot size={17} strokeWidth={1.7} /></span>
              <div>
                <h2>Команда FEYA</h2>
                <div className="owner-section-kicker">Кто за что отвечает, в каком режиме работает и чего реально ждёт</div>
              </div>
            </div>
            <Link href="/admin/roles" className="owner-button owner-button-arrow">Вся команда <ArrowRight size={13} strokeWidth={1.8} aria-hidden="true" /></Link>
          </div>

          <div className="owner-team-roster" aria-label="Состояние команды FEYA">
            {roleVM.map((role) => {
              const raw = roleRows.get(role.code) || {};
              const workStats = roleWork.get(role.code) || { active: 0, queued: 0, waiting: 0, latestTitle: null, latestAt: null };
              const hasLimits = role.blockedCapabilityCount > 0;
              return (
                <article className={`owner-team-roster-row ${toneClass(role.tone)}`} key={role.code}>
                  <div className="owner-team-roster-status" aria-hidden="true">
                    <span />
                  </div>
                  <div className="owner-team-roster-main">
                    <div className="owner-team-roster-title">
                      <h3>{role.name}</h3>
                      <span className={`owner-status ${toneClass(role.tone)}`}>{role.statusLabel}</span>
                    </div>
                    <p>{role.summary}</p>
                  </div>
                  <div className="owner-team-roster-now">
                    <span>Сейчас</span>
                    <strong>{workStats.active ? `${workStats.active} в работе` : role.status === 'SHADOW' ? 'наблюдает' : 'ожидает задачу'}</strong>
                    <small>{workStats.waiting ? `${workStats.waiting} ждёт / заблокировано` : workStats.latestTitle || 'активных блокировок работы нет'}</small>
                    {workStats.latestAt ? <small className="owner-team-roster-time">обновлено {formatRelativeTime(workStats.latestAt)}</small> : null}
                  </div>
                  <div className="owner-team-roster-cap">
                    <span>Готовность</span>
                    <strong>{role.availableCapabilityCount}/{role.requiredCapabilityCount}</strong>
                    <small>{hasLimits ? `${role.blockedCapabilityCount} ограничений` : role.autonomyLabel}</small>
                  </div>
                  <div className="owner-team-roster-action">
                    <OwnerRoleDrawerClient
                      role={role}
                      work={workStats}
                      allowedActionCount={Number(raw.allowed_action_count || 0)}
                      activationReason={raw.activation_reason ? String(raw.activation_reason) : null}
                      updatedAt={raw.updated_at ? String(raw.updated_at) : null}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="owner-team-note">
            <ShieldCheck size={14} strokeWidth={1.7} aria-hidden="true" />
            <span>Роль существует как ответственность, а не как отдельный постоянно работающий бот. FEYA не изображает занятость, которой нет.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
