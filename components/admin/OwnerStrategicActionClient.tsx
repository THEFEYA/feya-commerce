'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type StrategicAction =
  | 'ACTIVATE_GROWTH_OBJECTIVE'
  | 'HUMAN_APPROVE_INITIATIVE'
  | 'ACTIVATE_GROWTH_STRATEGY';

type Props = {
  actionCode: StrategicAction;
  entityId: string;
  expectedState: string;
  title: string;
  enabled: boolean;
  blockers: string[];
  expectedActiveVersion?: number;
};

function actionCopy(actionCode: StrategicAction) {
  if (actionCode === 'ACTIVATE_GROWTH_OBJECTIVE') {
    return {
      label: 'Активировать цель',
      intro: 'Активация делает цель действующей рамкой Growth OS. Она не запускает автономные действия сама по себе.',
    };
  }
  if (actionCode === 'ACTIVATE_GROWTH_STRATEGY') {
    return {
      label: 'Активировать стратегию',
      intro: 'Активация меняет текущую версию стратегии. Незавершённые инициативы другой версии могут потребовать повторной проверки.',
    };
  }
  return {
    label: 'Решение владельца',
    intro: 'Инициатива может пройти Human Owner gate только после Director Gate и валидной связи со стратегией.',
  };
}

export function OwnerStrategicActionClient({
  actionCode,
  entityId,
  expectedState,
  title,
  enabled,
  blockers,
  expectedActiveVersion = 0,
}: Props) {
  const router = useRouter();
  const copy = actionCopy(actionCode);
  const [decision, setDecision] = useState<'ACTIVATE' | 'APPROVED' | 'REJECTED' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => Boolean(decision && reason.trim().length >= 3 && !busy),
    [busy, decision, reason],
  );

  if (!enabled) {
    return (
      <section className="owner-card is-warning owner-protected-inline">
        <div className="owner-status is-warning">Действие подготовлено, но заблокировано</div>
        <p className="owner-card-copy">{copy.intro}</p>
        {blockers.length ? (
          <ul className="owner-action-blockers">{blockers.map((item) => <li key={item}>{item}</li>)}</ul>
        ) : null}
        <div className="owner-actions">
          <Link href="/admin/company/system#permissions" className="owner-button">Проверить безопасность</Link>
        </div>
      </section>
    );
  }

  async function submit() {
    if (!decision || !canSubmit) return;
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/company/strategic-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_code: actionCode,
          entity_id: entityId,
          expected_state: expectedState,
          decision,
          reason: reason.trim(),
          expected_active_version: expectedActiveVersion,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Не удалось записать стратегическое решение.');

      setMessage(payload?.message || 'Решение записано.');
      setDecision(null);
      setReason('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось записать стратегическое решение.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="owner-card owner-decision-action-panel owner-protected-inline">
      <div className="owner-status is-success">Human Owner action</div>
      <h3 className="owner-card-title" style={{ marginTop: '10px' }}>{copy.label}</h3>
      <p className="owner-card-copy">{copy.intro}</p>

      {!decision ? (
        <div className="owner-actions">
          {actionCode === 'HUMAN_APPROVE_INITIATIVE' ? (
            <>
              <button type="button" className="owner-button primary" onClick={() => setDecision('APPROVED')}>Одобрить инициативу</button>
              <button type="button" className="owner-button is-danger" onClick={() => setDecision('REJECTED')}>Отклонить</button>
            </>
          ) : (
            <button type="button" className="owner-button primary" onClick={() => setDecision('ACTIVATE')}>{copy.label}</button>
          )}
        </div>
      ) : (
        <div className="owner-decision-preview">
          <div className="owner-section-kicker">Предпросмотр решения</div>
          <strong>
            {decision === 'REJECTED'
              ? 'Отклонить инициативу'
              : decision === 'APPROVED'
                ? 'Одобрить инициативу'
                : copy.label}
          </strong>
          <p>
            <b>Объект:</b> {title}<br />
            <b>Ожидаемое состояние:</b> {expectedState}<br />
            Запись пройдёт через server-side guard и durable owner audit.
          </p>
          <label className="owner-decision-reason">
            <span>Почему</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1500}
              rows={4}
              placeholder="Коротко зафиксируйте причину решения."
            />
          </label>
          <div className="owner-actions">
            <button type="button" className="owner-button primary" disabled={!canSubmit} onClick={submit}>{busy ? 'Записываю…' : 'Подтвердить запись'}</button>
            <button type="button" className="owner-button" disabled={busy} onClick={() => { setDecision(null); setReason(''); }}>Отмена</button>
          </div>
        </div>
      )}

      {message ? <p className="owner-action-message is-success">{message}</p> : null}
      {error ? <p className="owner-action-message is-danger">{error}</p> : null}
    </section>
  );
}
