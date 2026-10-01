'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { RoleStatusVM } from '@/lib/owner-ui/types';
import { useOwnerDrawerA11y } from '@/components/admin/useOwnerDrawerA11y';

type RoleWorkStats = {
  active: number;
  queued: number;
  waiting: number;
  latestTitle: string | null;
  latestAt: string | null;
};

function toneClass(tone: RoleStatusVM['tone']) {
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

function nextStepForRole(role: RoleStatusVM, work: RoleWorkStats) {
  if (role.status === 'PAUSED') return 'Сохранять паузу до явного решения о повторной активации.';
  if (role.blockedCapabilityCount > 0) return 'Сначала закрыть блокирующие системные возможности. Роль не должна компенсировать отсутствующие данные или исполнителей догадкой.';
  if (role.status === 'INACTIVE') return 'Не активировать роль ради видимости работы. Активация нужна только при реальной задаче и готовых обязательных возможностях.';
  if (work.waiting > 0) return 'Разобрать условия ожидания или блокировки и эскалировать владельцу только то, что действительно находится на его границе полномочий.';
  if (work.active > 0) return 'Продолжать текущую работу в пределах разрешённой самостоятельности и зафиксировать результат после фактического выполнения.';
  if (role.status === 'SHADOW') return 'Оставаться в безопасном режиме: наблюдать, анализировать и готовить предложения без самостоятельного изменения рабочих данных.';
  return 'Ждать подходящего сигнала или рабочей ситуации. FEYA не создаёт искусственную занятость роли.';
}

function dateTimeLabel(value?: string | null) {
  if (!value) return 'не зафиксировано';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'не определено';
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function OwnerRoleDrawerClient({
  role,
  work,
  allowedActionCount,
  activationReason,
  updatedAt,
}: {
  role: RoleStatusVM;
  work: RoleWorkStats;
  allowedActionCount: number;
  activationReason?: string | null;
  updatedAt?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeDrawer = useCallback(() => setOpen(false), []);

  useOwnerDrawerA11y({
    open,
    dialogRef,
    triggerRef,
    initialFocusRef: closeRef,
    close: closeDrawer,
  });

  return (
    <>
      <button ref={triggerRef} type="button" className="owner-button" onClick={() => setOpen(true)}>
        Подробнее
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button
            type="button"
            aria-label="Закрыть карточку роли"
            className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]"
            onClick={closeDrawer}
          />
          <aside
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`role-drawer-${role.code}`}
            className="owner-drawer absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto border-l border-[rgba(216,214,211,.14)] bg-[#0c0c11] shadow-[-30px_0_90px_rgba(0,0,0,.55)]"
          >
            <div className="owner-drawer-head sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[rgba(216,214,211,.10)] bg-[#0c0c11]/95 px-5 py-4 backdrop-blur-xl">
              <div>
                <div className="owner-eyebrow" style={{ marginBottom: '5px' }}>Команда FEYA</div>
                <h2 id={`role-drawer-${role.code}`} className="m-0 text-[20px] leading-snug text-bone">{role.name}</h2>
              </div>
              <button ref={closeRef} type="button" className="owner-button" aria-label="Закрыть" onClick={() => setOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div className="owner-drawer-body space-y-4 p-5">
              <section className={`owner-card ${toneClass(role.tone)}`}>
                <div className="owner-card-meta">
                  <span className={`owner-status ${toneClass(role.tone)}`}>{role.statusLabel}</span>
                  <span>{role.autonomyLabel}</span>
                </div>
                <h3 className="owner-card-title">Зона ответственности</h3>
                <p className="owner-card-copy">{role.summary}</p>
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Что происходит сейчас</div>
                <div className="owner-role-roster" style={{ marginTop: '10px' }}>
                  <div><span>Активная работа</span><strong>{work.active}</strong></div>
                  <div><span>В очереди</span><strong>{work.queued}</strong></div>
                  <div><span>Ждёт / заблокировано</span><strong>{work.waiting}</strong></div>
                  <div><span>Последнее изменение</span><strong>{dateTimeLabel(work.latestAt)}</strong></div>
                </div>
                {work.latestTitle ? <p className="owner-role-note" style={{ marginTop: '12px' }}><strong>Последняя работа:</strong> {work.latestTitle}</p> : null}
              </section>

              <section className="owner-card">
                <div className="owner-section-kicker">Границы самостоятельности</div>
                <p className="owner-card-copy"><strong>Режим:</strong> {role.autonomyLabel}.</p>
                <div className="owner-role-roster" style={{ marginTop: '10px' }}>
                  <div><span>Нужно возможностей</span><strong>{role.requiredCapabilityCount}</strong></div>
                  <div><span>Доступно полностью</span><strong>{role.availableCapabilityCount}</strong></div>
                  <div><span>Блокеров</span><strong>{role.blockedCapabilityCount}</strong></div>
                  <div><span>Разрешённых действий</span><strong>{allowedActionCount}</strong></div>
                </div>
              </section>

              <section className={`owner-card ${role.blockedCapabilityCount ? 'is-warning' : 'is-success'}`}>
                <div className={`owner-status ${role.blockedCapabilityCount ? 'is-warning' : 'is-success'}`}>
                  {role.blockedCapabilityCount ? 'Есть системные ограничения' : 'Критичных блокеров роли нет'}
                </div>
                <p className="owner-card-copy">
                  {role.blockedCapabilityCount
                    ? 'Роль существует и может быть полезна только в пределах доступных возможностей. Недостающие источники или исполнители не заменяются догадкой.'
                    : 'Текущие зарегистрированные обязательные возможности роли не сообщают о критичной блокировке.'}
                </p>
              </section>

              <section className="owner-grid two">
                <article className="owner-card">
                  <div className="owner-section-kicker">Последний подтверждённый результат</div>
                  <p className="owner-card-copy">
                    Отдельный доказанный бизнес-результат этой роли пока не зафиксирован в owner-проекции. Рабочая активность не считается результатом сама по себе.
                  </p>
                  <div className="owner-actions"><Link href="/admin/company/results" className="owner-button">Результаты</Link></div>
                </article>
                <article className="owner-card is-info">
                  <div className="owner-section-kicker">Следующий безопасный шаг</div>
                  <p className="owner-card-copy">{nextStepForRole(role, work)}</p>
                </article>
              </section>

              <div className="owner-actions">
                <Link href={`/admin/company/work?owner=${encodeURIComponent(role.name)}#work-list`} className="owner-button primary">Работа роли</Link>
                <Link href={`/admin/system-readiness?q=${encodeURIComponent(role.name)}`} className="owner-button">Возможности</Link>
                <Link href={`/admin/execution-map?q=${encodeURIComponent(role.name)}`} className="owner-button">Разрешённые действия</Link>
              </div>

              <details className="owner-disclosure owner-disclosure-section">
                <summary>
                  <span><strong>Технические детали</strong><small>Только для диагностики</small></span>
                  <span className="owner-section-kicker">Технически</span>
                </summary>
                <div className="owner-disclosure-body">
                  <div className="owner-card-meta" style={{ marginBottom: 0 }}>
                    <span title={role.code}>Код роли</span>
                    <span title={activationReason || undefined}>Причина активации</span>
                    <span>конфигурация обновлена: {dateTimeLabel(updatedAt)}</span>
                  </div>
                </div>
              </details>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
