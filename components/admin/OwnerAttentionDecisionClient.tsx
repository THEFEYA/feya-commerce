'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Props = {
  attentionId: string;
  currentStatus: string;
  title: string;
  recommendation: string;
  enabled: boolean;
  blockers: string[];
};

type PendingDecision = {
  status: 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';
  code: string | null;
  label: string;
  tone: 'primary' | 'neutral' | 'danger';
};

const DECISIONS: PendingDecision[] = [
  { status: 'RESOLVED', code: 'ACCEPT_RECOMMENDATION', label: 'Подтвердить рекомендованный шаг', tone: 'primary' },
  { status: 'RESOLVED', code: 'REJECT_RECOMMENDATION', label: 'Отклонить рекомендацию', tone: 'neutral' },
  { status: 'ACKNOWLEDGED', code: null, label: 'Принято к рассмотрению', tone: 'neutral' },
  { status: 'CANCELLED', code: 'CLOSED_WITHOUT_ACTION', label: 'Закрыть без действия', tone: 'danger' },
];

export function OwnerAttentionDecisionClient({
  attentionId,
  currentStatus,
  title,
  recommendation,
  enabled,
  blockers,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingDecision | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const terminal = pending?.status === 'RESOLVED' || pending?.status === 'CANCELLED';
  const canSubmit = useMemo(() => {
    if (!pending || busy) return false;
    if (terminal && reason.trim().length < 3) return false;
    return true;
  }, [busy, pending, reason, terminal]);

  if (!enabled) {
    return (
      <section className="owner-card is-warning">
        <div className="owner-status is-warning">Protected actions подготовлены, но заблокированы</div>
        <h2 className="owner-card-title" style={{ marginTop: '10px' }}>Решение пока нельзя записать из браузера</h2>
        <p className="owner-card-copy">
          Серверный аудитируемый путь уже существует, но кнопки останутся закрытыми, пока не завершён защищённый вход владельца и отдельный switch owner actions.
        </p>
        {blockers.length ? (
          <ul className="owner-action-blockers">
            {blockers.map((item) => <li key={item}>{item}</li>)}
          </ul>
        ) : null}
        <div className="owner-actions">
          <Link href="/admin/company/system#permissions" className="owner-button">Проверить готовность</Link>
        </div>
      </section>
    );
  }

  async function submitDecision() {
    if (!pending || !canSubmit) return;
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/company/owner-attention/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attention_id: attentionId,
          expected_status: currentStatus,
          new_status: pending.status,
          decision_code: pending.code,
          reason: reason.trim() || null,
          idempotency_key: crypto.randomUUID(),
          resolution_json: {
            ui_label: pending.label,
            recommendation_snapshot: recommendation,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Не удалось записать решение.');

      setMessage(payload?.message || 'Решение записано.');
      setPending(null);
      setReason('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось записать решение.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="owner-card owner-decision-action-panel">
      <div className="owner-status is-success">Защищённая запись доступна</div>
      <h2 className="owner-card-title" style={{ marginTop: '10px' }}>Записать решение владельца</h2>
      <p className="owner-card-copy">
        Это изменит только состояние Owner Attention и создаст audit event. Оно не публикует контент, не меняет цену, canonical, индексацию или checkout автоматически.
      </p>

      {!pending ? (
        <div className="owner-actions">
          {DECISIONS.map((decision) => (
            <button
              type="button"
              key={decision.label}
              className={`owner-button ${decision.tone === 'primary' ? 'primary' : ''} ${decision.tone === 'danger' ? 'is-danger' : ''}`}
              onClick={() => {
                setPending(decision);
                setMessage(null);
                setError(null);
              }}
            >
              {decision.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="owner-decision-preview">
          <div className="owner-section-kicker">Предпросмотр решения</div>
          <strong>{pending.label}</strong>
          <p>
            <b>Сейчас:</b> {title}<br />
            <b>После записи:</b> {pending.status === 'ACKNOWLEDGED' ? 'решение останется открытым, но будет отмечено как принятое к рассмотрению' : pending.status === 'RESOLVED' ? 'Owner Attention будет закрыт как решённый' : 'Owner Attention будет закрыт без выполнения действия'}.
          </p>
          {terminal ? (
            <label className="owner-decision-reason">
              <span>Коротко почему</span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1200} rows={4} placeholder="Например: подтверждаю рекомендацию; отдельное выполнение будет создано следующим шагом." />
            </label>
          ) : null}
          <div className="owner-actions">
            <button type="button" className="owner-button primary" disabled={!canSubmit} onClick={submitDecision}>
              {busy ? 'Записываю…' : 'Подтвердить запись'}
            </button>
            <button type="button" className="owner-button" disabled={busy} onClick={() => { setPending(null); setReason(''); }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {message ? <p className="owner-action-message is-success">{message}</p> : null}
      {error ? <p className="owner-action-message is-danger">{error}</p> : null}
    </section>
  );
}
