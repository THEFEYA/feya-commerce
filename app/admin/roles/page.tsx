export const instant = false;

import Link from 'next/link';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { RoleActivationRow } from '@/lib/types';
import { formatRelativeTime, presentRole } from '@/lib/owner-ui/presenters';
import { OwnerRoleDrawerClient } from '@/components/admin/OwnerRoleDrawerClient';
import {
  projectRoleWorkEvidence, inspectRoleCapabilityFreshness,
  type RoleWorkEvidenceRow, type RoleCapabilityEvidenceRow,
} from '@/lib/owner-ui/roleRuntimeEvidence';

async function getRows(): Promise<{ rows: RoleActivationRow[]; work: RoleWorkEvidenceRow[]; capabilities: RoleCapabilityEvidenceRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], work: [], capabilities: [], error: getMissingAdminDataEnvMessage() };

  const [rolesResult, workResult, capabilityResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_role_activation_safe_v1')
      .select('*')
      .order('role_type', { ascending: true })
      .order('role_code', { ascending: true }),
    supabase
      .from('feya_commerce_v_owner_work_safe_v1')
      .select('case_id,current_accountable_domain,case_status,workflow_status,title,workflow_updated_at,updated_at,closed_at')
      .order('updated_at', { ascending: false }),
    supabase
      .from('feya_commerce_v_growth_capability_status_safe_v1')
      .select('owner_role,updated_at')
      .in('owner_role', ['CPIM','CQA','GDAE','GMEL','GROWTH_DIRECTOR','OSPM','SCO','TSEO'])
      .limit(200),
  ]);

  const firstError = rolesResult.error || workResult.error || capabilityResult.error;
  if (firstError) return { rows: [], work: [], capabilities: [], error: firstError.message };

  return {
    rows: (rolesResult.data || []) as RoleActivationRow[],
    work: (workResult.data || []) as RoleWorkEvidenceRow[],
    capabilities: (capabilityResult.data || []) as RoleCapabilityEvidenceRow[],
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
  const { rows, work, capabilities, error } = await getRows();
  const roles = rows.map(presentRole);
  const roleRows = new Map(rows.map((row) => [String(row.role_code || '').trim().toUpperCase(), row]));

  const active = roles.filter((role) => role.status === 'ACTIVE').length;
  const shadow = roles.filter((role) => role.status === 'SHADOW').length;
  const inactive = roles.filter((role) => role.status === 'INACTIVE').length;
  const paused = roles.filter((role) => role.status === 'PAUSED').length;

  // A completed technical workflow can still belong to an OPEN business case.
  // Show OPEN cases, truly running workflow and pending independent review separately.
  const roleWork = projectRoleWorkEvidence(work);
  const snapshotNow = new Date();

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
              <h2>Роли и проверяемое состояние</h2>
              <div className="owner-section-kicker">
                Логическая роль — не отдельный постоянно работающий AI-процесс. Состояние, текущие задачи и свежесть реестра показываются отдельно
              </div>
            </div>
          </div>

          <div className="owner-team-grid">
            {roles.map((role) => {
              const required = Math.max(0, role.requiredCapabilityCount || 0);
              const available = Math.min(required, role.availableCapabilityCount || 0);
              const stats = roleWork.get(role.code) || {
                active: 0, running: 0, queued: 0, waiting: 0, pendingReview: 0,
                latestTitle: null, latestAt: null,
              };
              const snapshot = inspectRoleCapabilityFreshness(capabilities, role.code, snapshotNow);
              const lastActivity = stats.latestAt ? formatRelativeTime(stats.latestAt) : 'ещё не было';

              return (
                <article className={`owner-card owner-team-card ${toneClass(role.tone)}`} key={role.code}>
                  <div className="owner-card-meta">
                    <span className={`owner-status ${toneClass(role.tone)}`}>{role.statusLabel}</span>
                    <span>{role.autonomyLabel}</span>
                    <span>{stats.active ? `открытых кейсов: ${stats.active}` : 'открытых кейсов нет'}</span>
                  </div>

                  <h3>{role.name}</h3>
                  <p className="owner-card-copy">{role.summary}</p>

                  <div className="owner-role-readiness">
                    <div className="owner-mini-bar-label">
                      <span>Возможности по реестру</span>
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
                    <div><span>Открытых кейсов</span><strong>{stats.active}</strong></div>
                    <div><span>Исполняется сейчас</span><strong>{stats.running}</strong></div>
                    <div><span>Ждёт проверки результата</span><strong>{stats.pendingReview}</strong></div>
                    <div><span>В очереди / заблокировано</span><strong>{stats.queued + stats.waiting}</strong></div>
                    <div><span>Последнее событие</span><strong>{lastActivity}</strong></div>
                  </div>
                  {stats.latestTitle ? <p className="owner-role-note"><strong>Последняя работа:</strong> {stats.latestTitle}</p> : null}
                  <p className="owner-role-note">
                    {snapshot.state === 'STALE_REGISTRY_SNAPSHOT'
                      ? `Реестр возможностей устарел (самая старая запись: ${snapshot.oldestRecordedAt?.slice(0, 10)}). Доступность нужно подтвердить заново.`
                      : snapshot.state === 'RECENT_REGISTRY_SNAPSHOT'
                        ? `Записи возможностей обновлялись не раньше ${snapshot.oldestRecordedAt?.slice(0, 10)}. Это реестр, не проверка live-исполнителя.`
                        : 'Дата проверки возможностей неизвестна. Нельзя считать их готовыми без подтверждения.'}
                  </p>
                  <div className="owner-card-meta" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <span>Блокеров возможностей: {role.blockedCapabilityCount}</span>
                    <span>Доступно полностью по реестру: {role.availableCapabilityCount}</span>
                  </div>
                  <div className="owner-actions">
                    <Link href={`/admin/company/work?owner=${encodeURIComponent(role.name)}#work-list`} className="owner-button">Посмотреть работу</Link>
                    <OwnerRoleDrawerClient
                      role={role}
                      work={stats}
                      allowedActionCount={Number(roleRows.get(role.code)?.allowed_action_count || 0)}
                      activationReason={roleRows.get(role.code)?.activation_reason || null}
                      updatedAt={roleRows.get(role.code)?.updated_at || null}
                      capabilityEvidenceState={snapshot.state}
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
                «Активна» — статус разрешённой роли, но не доказательство фонового AI-вызова.
                «Открытый кейс» ещё не означает, что исполнитель сейчас работает. Завершённый технический workflow
                без независимой QA и решения владельца остаётся открытой задачей.
                Количество возможностей — снимок реестра на указанные даты, а не автоматическая проверка текущих внешних сервисов.
              </p>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
