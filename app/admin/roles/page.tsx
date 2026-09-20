import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { RoleActivationRow } from '@/lib/types';
import { formatRelativeTime, presentRole } from '@/lib/owner-ui/presenters';
import { OwnerRoleDrawerClient } from '@/components/admin/OwnerRoleDrawerClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type WorkRow = {
  current_accountable_domain?: string | null;
  case_status?: string | null;
  workflow_status?: string | null;
  title?: string | null;
  workflow_updated_at?: string | null;
  updated_at?: string | null;
  closed_at?: string | null;
};

async function getRows(): Promise<{ rows: RoleActivationRow[]; work: WorkRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], work: [], error: getMissingAdminDataEnvMessage() };

  const [rolesResult, workResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_role_activation_safe_v1')
      .select('*')
      .order('role_type', { ascending: true })
      .order('role_code', { ascending: true }),
    supabase
      .from('feya_commerce_v_owner_work_safe_v1')
      .select('current_accountable_domain,case_status,workflow_status,title,workflow_updated_at,updated_at,closed_at')
      .order('updated_at', { ascending: false }),
  ]);

  const firstError = rolesResult.error || workResult.error;
  if (firstError) return { rows: [], work: [], error: firstError.message };

  return {
    rows: (rolesResult.data || []) as RoleActivationRow[],
    work: (workResult.data || []) as WorkRow[],
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

export default async function AdminRolesPage() {
  const { rows, work, error } = await getRows();
  const roles = rows.map(presentRole);
  const roleRows = new Map(rows.map((row) => [String(row.role_code || '').trim().toUpperCase(), row]));

  const active = roles.filter((role) => role.status === 'ACTIVE').length;
  const shadow = roles.filter((role) => role.status === 'SHADOW').length;
  const inactive = roles.filter((role) => role.status === 'INACTIVE').length;
  const paused = roles.filter((role) => role.status === 'PAUSED').length;

  const roleWork = new Map<string, { active: number; queued: number; waiting: number; latestTitle: string | null; latestAt: string | null }>();
  for (const row of work) {
    const code = String(row.current_accountable_domain || '').trim().toUpperCase();
    if (!code) continue;
    const current = roleWork.get(code) || { active: 0, queued: 0, waiting: 0, latestTitle: null, latestAt: null };
    const workflowStatus = String(row.workflow_status || row.case_status || '').toUpperCase();
    const closed = ['CLOSED', 'MERGED', 'COMPLETED'].includes(workflowStatus) || ['CLOSED', 'MERGED'].includes(String(row.case_status || '').toUpperCase());
    if (!closed) {
      current.active += 1;
      if (workflowStatus === 'QUEUED') current.queued += 1;
      if (workflowStatus.startsWith('WAITING') || workflowStatus === 'BLOCKED') current.waiting += 1;
    }
    if (!current.latestAt) {
      current.latestTitle = row.title || null;
      current.latestAt = row.closed_at || row.workflow_updated_at || row.updated_at || null;
    }
    roleWork.set(code, current);
  }

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Команда FEYA</div>
            <h1>ИИ-команда</h1>
            <p>
              Роли показываются как реальные зоны ответственности: что сейчас активно, какой предел самостоятельности,
              какие возможности доступны и есть ли у роли текущая работа.
            </p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/work#team" className="owner-button">Работа команды</Link>
            <Link href="/admin/execution-map" className="owner-button">Права действий</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{active}</strong><span>Активны</span></div>
          <div className="owner-summary-cell"><strong>{shadow}</strong><span>Безопасный режим</span></div>
          <div className="owner-summary-cell"><strong>{inactive}</strong><span>Ещё не активированы</span></div>
          <div className="owner-summary-cell"><strong>{paused}</strong><span>Приостановлены</span></div>
        </section>

        {error ? (
          <div className="owner-card is-danger" style={{ marginBottom: '18px' }}>
            <div className="owner-status is-danger">Ошибка данных</div>
            <p className="owner-card-copy">{error}</p>
          </div>
        ) : null}

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div>
              <h2>Роли и текущее состояние</h2>
              <div className="owner-section-kicker">
                Логическая роль не считается работающим агентом, пока не активированы её режим выполнения и необходимые возможности
              </div>
            </div>
          </div>

          <div className="owner-team-grid">
            {roles.map((role) => {
              const required = Math.max(0, role.requiredCapabilityCount || 0);
              const available = Math.min(required, role.availableCapabilityCount || 0);
              const stats = roleWork.get(role.code) || { active: 0, queued: 0, waiting: 0, latestTitle: null, latestAt: null };
              const lastActivity = stats.latestAt ? formatRelativeTime(stats.latestAt) : 'ещё не было';

              return (
                <article className={`owner-card owner-team-card ${toneClass(role.tone)}`} key={role.code}>
                  <div className="owner-card-meta">
                    <span className={`owner-status ${toneClass(role.tone)}`}>{role.statusLabel}</span>
                    <span>{role.autonomyLabel}</span>
                    <span>{stats.active ? `в работе: ${stats.active}` : 'активной работы нет'}</span>
                  </div>

                  <h3>{role.name}</h3>
                  <p className="owner-card-copy">{role.summary}</p>

                  <div className="owner-role-readiness">
                    <div className="owner-mini-bar-label">
                      <span>Необходимые возможности</span>
                      <strong>{role.availableCapabilityCount}/{role.requiredCapabilityCount}</strong>
                    </div>
                    <div className="owner-capability-dots" aria-label={`Доступно ${role.availableCapabilityCount} из ${role.requiredCapabilityCount} необходимых возможностей`}>
                      {required ? Array.from({ length: required }).map((_, index) => (
                        <span
                          key={index}
                          className={index < available ? 'is-ready' : 'is-missing'}
                          title={index < available ? 'Доступно' : 'Ещё не доступно'}
                        />
                      )) : <span className="owner-section-kicker">отдельные обязательные возможности не заданы</span>}
                    </div>
                  </div>

                  <div className="owner-role-roster">
                    <div><span>Сейчас</span><strong>{stats.active ? `${stats.active} активных` : 'нет активной работы'}</strong></div>
                    <div><span>В очереди</span><strong>{stats.queued}</strong></div>
                    <div><span>Ждёт / заблокировано</span><strong>{stats.waiting}</strong></div>
                    <div><span>Последняя активность</span><strong>{lastActivity}</strong></div>
                  </div>
                  {stats.latestTitle ? <p className="owner-role-note"><strong>Последняя работа:</strong> {stats.latestTitle}</p> : null}
                  <div className="owner-card-meta" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <span>Блокеров возможностей: {role.blockedCapabilityCount}</span>
                    <span>Доступно возможностей: {role.availableCapabilityCount}</span>
                  </div>
                  <div className="owner-actions">
                    <Link href={`/admin/company/work?owner=${encodeURIComponent(role.name)}#work-list`} className="owner-button">Посмотреть работу</Link>
                    <OwnerRoleDrawerClient
                      role={role}
                      work={stats}
                      allowedActionCount={Number(roleRows.get(role.code)?.allowed_action_count || 0)}
                      activationReason={roleRows.get(role.code)?.activation_reason || null}
                      updatedAt={roleRows.get(role.code)?.updated_at || null}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span>
                <strong>Как читать этот экран</strong>
                <small>Чтобы статус агента не выглядел как имитация виртуального офиса</small>
              </span>
              <span className="owner-section-kicker">методика</span>
            </summary>
            <div className="owner-disclosure-body">
              <p className="owner-card-copy">
                «Активна» означает фактически включённую роль. «Безопасный режим» — работу без самостоятельного изменения рабочих данных.
                «Не активирована» — роль существует в архитектуре, но ещё не готова к реальной работе. Количество возможностей показывает
                техническую готовность, а не «интеллект» или качество роли.
              </p>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
