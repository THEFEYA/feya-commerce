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
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) {
    return { work: [], attention: [], roles: [], error: getMissingAdminDataEnvMessage() };
  }

  const [workResult, attentionResult, rolesResult] = await Promise.all([
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
  ]);

  const firstError = workResult.error || attentionResult.error || rolesResult.error;
  if (firstError) {
    return { work: [], attention: [], roles: [], error: firstError.message };
  }

  return {
    work: (workResult.data || []) as Row[],
    attention: (attentionResult.data || []) as Row[],
    roles: (rolesResult.data || []) as Row[],
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
  const { work, attention, roles, error } = await getWorkData();
  const workVM = work.map(presentWorkItem);
  const attentionVM = attention.map(presentOwnerAttention);
  const roleVM = roles.map(presentRole);

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
          <div className="owner-page-meta">{workVM.length} активных рабочих ситуаций</div>
        </header>

        <nav className="owner-subnav" aria-label="Разделы работы">
          <a href="#owner-waiting">Ждёт вас · {attentionVM.length}</a>
          <a href="#work-list">Работа · {workVM.length}</a>
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

        <section className="owner-section" id="work-list">
          <div className="owner-section-head">
            <div>
              <h2>Текущая работа</h2>
              <div className="owner-section-kicker">Список по реальному состоянию workflow, а не по ручному перетаскиванию карточек</div>
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
              Активных Growth Cases и workflow пока нет. FEYA находится в подготовке к запуску и не создаёт искусственные задачи, чтобы интерфейс выглядел занятым.
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
