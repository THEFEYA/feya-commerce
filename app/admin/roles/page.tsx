import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { RoleActivationRow } from '@/lib/types';
import { presentRole } from '@/lib/owner-ui/presenters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type WorkRow = {
  current_accountable_domain?: string | null;
  case_status?: string | null;
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
      .select('current_accountable_domain,case_status')
      .not('case_status', 'in', '(CLOSED,MERGED)'),
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

  const active = roles.filter((role) => role.status === 'ACTIVE').length;
  const shadow = roles.filter((role) => role.status === 'SHADOW').length;
  const inactive = roles.filter((role) => role.status === 'INACTIVE').length;
  const paused = roles.filter((role) => role.status === 'PAUSED').length;

  const workCounts = new Map<string, number>();
  for (const row of work) {
    const code = String(row.current_accountable_domain || '').trim().toUpperCase();
    if (!code) continue;
    workCounts.set(code, (workCounts.get(code) || 0) + 1);
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
              const currentWork = workCounts.get(role.code) || 0;

              return (
                <article className={`owner-card owner-team-card ${toneClass(role.tone)}`} key={role.code}>
                  <div className="owner-card-meta">
                    <span className={`owner-status ${toneClass(role.tone)}`}>{role.statusLabel}</span>
                    <span>{role.autonomyLabel}</span>
                    <span>{currentWork ? `в работе: ${currentWork}` : 'активных задач нет'}</span>
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

                  <div className="owner-card-meta" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <span>Блокеров: {role.blockedCapabilityCount}</span>
                    <span>Рабочих возможностей: {role.availableCapabilityCount}</span>
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
                ACTIVE означает фактически активированную роль. SHADOW — безопасную работу без самостоятельного production-действия.
                INACTIVE — роль существует в архитектуре, но ещё не готова к реальной работе. Количество возможностей показывает
                техническую готовность, а не «интеллект» или качество роли.
              </p>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
