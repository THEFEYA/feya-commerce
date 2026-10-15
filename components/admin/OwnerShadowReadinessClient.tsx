'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

type Receipt = {
  evidence_time: string;
  rows_scanned: number;
  coverage: string;
  counts_by_status: Record<string, number>;
  counts_by_type: Record<string, number>;
  changes_applied: number;
  model_calls: number;
  independent_agent_qa: string;
  conclusion: string;
};
type Result = {
  ok: boolean;
  status?: string;
  code?: string;
  error?: string;
  case_id?: string;
  receipt?: Receipt | null;
  message?: string;
};
type Props = {
  enabled: boolean;
  reason?: string | null;
};

const INITIAL = 'Какие страницы каталога и коллекций требуют проверки готовности к индексации?';

export function OwnerShadowReadinessClient({ enabled, reason }: Props) {
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const [question, setQuestion] = useState(INITIAL);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit() {
    if (!enabled || running || question.trim().length < 12 || question.trim().length > 500) return;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/company/work/shadow-indexability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), request_id: requestId.current }),
      });
      const data = (await response.json()) as Result;
      setResult(data);
      if (data.ok && data.status === 'COMPLETED') {
        requestId.current = null;
        router.refresh();
      }
    } catch {
      setResult({ ok: false, error: 'Связь прервалась. Повторите — идентификатор задания сохранён, дубликат не создастся.' });
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="owner-card" aria-labelledby="shadow-task-heading">
      <div className="owner-status is-info">Ручная проверка · TSEO / SHADOW</div>
      <h2 id="shadow-task-heading" className="owner-card-title" style={{ marginTop: 8 }}>
        Проверить готовность SEO-страниц
      </h2>
      <p className="owner-card-copy">
        Только чтение актуального портфеля: без AI-вызовов, переписывания товаров и публикации.
        Это снимок внутренних данных, а не подтверждение индексации Google.
      </p>

      {enabled ? (
        <div style={{ display: 'grid', gap: 8, maxWidth: 660, marginTop: 12 }}>
          <label htmlFor="growth-shadow-question" className="owner-eyebrow">Вопрос для отчёта</label>
          <textarea
            id="growth-shadow-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            rows={2}
            disabled={running}
            aria-label="Вопрос к проверке SEO-готовности"
            style={{ width: '100%', borderRadius: 8, padding: 12, font: 'inherit' }}
          />
          <div className="owner-actions">
            <button
              type="button"
              className="owner-button primary"
              disabled={running || question.trim().length < 12}
              onClick={submit}
            >
              {running ? 'Проверяется…' : 'Запустить проверку'}
            </button>
          </div>
        </div>
      ) : (
        <p className="owner-card-copy" style={{ marginTop: 10 }}>
          Запуск пока закрыт: {reason || 'проверка готовности и входа владельца ещё не завершена'}.
          Просмотр существующих задач остаётся доступен.
        </p>
      )}

      {result ? (
        <div className="owner-card" style={{ marginTop: 12 }} role="status" aria-live="polite">
          <div className={result.ok ? 'owner-status is-success' : 'owner-status is-warning'}>
            {result.ok ? 'Результат записан в историю' : 'Выполнение не подтверждено'}
          </div>
          <p className="owner-card-copy">{result.message || result.error || 'Состояние задачи обновлено.'}</p>
          {result.receipt ? (
            <>
              <p className="owner-card-copy">
                Проверено страниц: <strong>{result.receipt.rows_scanned}</strong>.
                Полнота: {result.receipt.coverage === 'COMPLETE' ? 'полная выборка' : 'нужна дополнительная проверка'}.
                Изменений: {result.receipt.changes_applied}.
                AI-вызовов: {result.receipt.model_calls}.
              </p>
              <p className="owner-card-copy">
                {Object.entries(result.receipt.counts_by_status).map(([status, count]) => (
                  <span key={status} style={{ marginRight: 12 }}>{status}: {count}</span>
                ))}
              </p>
              <p className="owner-card-copy">{result.receipt.conclusion}</p>
              <p className="owner-card-copy">Независимая агентная проверка: ещё не проводилась.</p>
            </>
          ) : null}
          {result.case_id ? (
            <Link className="owner-button" href={`/admin/company/work/${result.case_id}`}>
              Открыть задание в истории
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
