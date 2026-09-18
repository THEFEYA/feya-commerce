import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { presentOwnerAttention, presentRole, presentWorkItem, formatRelativeTime } from '@/lib/owner-ui/presenters';

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

export default async function AdminWorkPage() {
  const { work, attention, roles, operations, error } = await getWorkData();
  const workVM = work.map(presentWorkItem);
  const attentionVM = attention.map(presentOwnerAttention);
  const roleVM = roles.map(presentRole);
  const operationalWork =
    operations.productFacts +
    operations.keywordReview +
    operations.cqaHumanReview +
    operations.cqaIndependent +
    operations.cqaRevision +
    operations.cqaBlocked;

  const grouped = new Map<string, typeof workVM>();
  for (const item of workVM) {
    const label = groupLabel(item.status);
    grouped.set(label, [...(grouped.get(label) || []), item]);
  }

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Выполнение</div>
            <h1>Работа</h1>
            <p>
              Здесь видно, что FEYA действительно выполняет, чего ждёт и где требуется ваше участие. Пустая очередь не считается проблемой.
            </p>
          </div>
          <div className="owner-page-meta">{operationalWork + workVM.length} элементов в рабочих очередях</div>
        </header>

        <nav className="owner-subnav" aria-label="Разделы работы">
          <a href="#owner-waiting">Ждёт вас · {attentionVM.length}</a>
          <a href="#operational-queues">Операционные очереди · {operationalWork}</a>
          <a href="#work-list">задачи роста · {workVM.length}</a>
          <a href="#team">Команда FEYA · {roleVM.length}</a>
        </nav>

        {error ? (
          <div className="owner-card is-danger">
            <div className="owner-status is-danger">Ошибка данных</div>
            <h2 className="owner-card-title" style={{ marginTop: '10px' }}>Не удалось загрузить рабочее состояние</h2>
            <p className="owner-card-copy">{error}</p>
          </div>
        ) : null}

        <section className="owner-section" id="owner-waiting">
          <div className="owner-section-head">
            <div>
              <h2>Ждёт вас</h2>
              <div className="owner-section-kicker">Работа остановлена только там, где без владельца нельзя продолжить безопасно</div>
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
                    <Link href="/admin/company/owner-attention" className="owner-button primary">Рассмотреть</Link>
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
            <div>
              <h2>Операционные очереди</h2>
              <div className="owner-section-kicker">Реальная работа товарной системы и SEO-контура, даже если отдельная задача роста ещё не создана</div>
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
              <p className="owner-card-copy">
                К совместной проверке готовы: {operations.cqaHumanReview}. К независимой проверке: {operations.cqaIndependent}. Требуют исправления: {operations.cqaRevision}. Заблокированы валидатором: {operations.cqaBlocked}.
              </p>
            </Link>

            <article className="owner-card">
              <div className="owner-status">Автоматически</div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Предварительные проверки контента</h3>
              <p className="owner-card-copy">
                {operations.cqaAutomaticChecks} черновиков находятся на автоматических проверках сходства, состава или базовых prechecks. Это не требует вашего участия.
              </p>
            </article>
          </div>
        </section>

        <section className="owner-section" id="work-list">
          <div className="owner-section-head">
            <div>
              <h2>Текущая работа</h2>
              <div className="owner-section-kicker">Список по реальному состоянию процесса, а не по ручному перетаскиванию карточек</div>
            </div>
          </div>

          {workVM.length ? (
            GROUP_ORDER.filter((label) => grouped.has(label)).map((label) => (
              <div key={label} style={{ marginBottom: '18px' }}>
                <div className="owner-section-head" style={{ marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px' }}>{label}</h3>
                  <span className="owner-section-kicker">{grouped.get(label)?.length || 0}</span>
                </div>
                <div className="owner-list">
                  {(grouped.get(label) || []).map((item) => (
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
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="owner-empty">
              Активных задач роста и процессов пока нет. Это не означает, что работы нет: реальные очереди товарной системы и SEO показаны выше. FEYA не создаёт искусственные задачи только ради заполнения панели.
            </div>
          )}
        </section>

        <section className="owner-section" id="team">
          <div className="owner-section-head">
            <div>
              <h2>Команда FEYA</h2>
              <div className="owner-section-kicker">Логические роли и их реальные ограничения, а не восемь постоянно работающих ботов</div>
            </div>
            <Link href="/admin/roles" className="owner-button">Техническое состояние ролей</Link>
          </div>

          <div className="owner-team-grid">
            {roleVM.map((role) => (
              <article className={`owner-card owner-team-card ${toneClass(role.tone)}`} key={role.code}>
                <div className="owner-card-meta">
                  <span className={`owner-status ${toneClass(role.tone)}`}>{role.statusLabel}</span>
                </div>
                <h3>{role.name}</h3>
                <p className="owner-card-copy">{role.autonomyLabel}</p>
                <p className="owner-role-note">
                  Возможности: {role.availableCapabilityCount} полностью готовы из {role.requiredCapabilityCount}.
                  {role.blockedCapabilityCount > 0 ? ` Заблокировано: ${role.blockedCapabilityCount}.` : ' Критичных блокировок роли нет.'}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
