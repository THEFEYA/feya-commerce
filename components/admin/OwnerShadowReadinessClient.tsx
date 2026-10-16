'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { TSEO_SHADOW_RELEASE_QUESTION } from '@/lib/growthShadowTaskContract';

type Receipt = {
  evidence_time: string;
  release_code: string;
  release_version: number;
  target_origin: string;
  intended_urls_counted: number;
  intended_index: number;
  intended_noindex: number;
  approved_product_bindings: number;
  coverage: string;
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
  gmel_review?: {
    status: string;
    method: string;
    handoff_id?: string;
    model_calls: number;
    changes_applied: number;
  } | null;
  message?: string;
};
type Props = {
  enabled: boolean;
  reason?: string | null;
};


export function OwnerShadowReadinessClient({ enabled, reason }: Props) {
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit() {
    if (!enabled || running) return;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/company/work/shadow-indexability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: TSEO_SHADOW_RELEASE_QUESTION, request_id: requestId.current }),
      });
      const data = (await response.json()) as Result;
      setResult(data);
      if (data.ok && data.status === 'COMPLETED') {
        // Preserve the request id while the second deterministic step awaits retry.
        if (data.gmel_review?.status === 'COMPLETED') requestId.current = null;
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
        Сверить действующий поисковый релиз
      </h2>
      <p className="owner-card-copy">
        Только чтение утверждённого ACTIVE Search Release: без AI-вызовов, изменения товаров и публикации.
        Показываем правила index/noindex, а не фактическое число страниц в Google.
      </p>

      {enabled ? (
        <div style={{ display: 'grid', gap: 8, maxWidth: 660, marginTop: 12 }}>
          <span className="owner-eyebrow">Первое стандартизированное задание</span>
          <p className="owner-card-copy">{TSEO_SHADOW_RELEASE_QUESTION}</p>
          <p className="owner-card-copy">
            Свободные поручения нескольким AI-сотрудникам подключим отдельно, после проверки
            передачи ответственности и сохранения результатов.
          </p>
          <div className="owner-actions">
            <button
              type="button"
              className="owner-button primary"
              disabled={running}
              onClick={submit}
            >
              {running ? 'Проверяется…' : result?.gmel_review?.status === 'PENDING' ? 'Повторить сохранённую проверку' : 'Запустить проверку'}
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
                Релиз: <strong>v{result.receipt.release_version}</strong> ({result.receipt.release_code}).
                URL по плану: <strong>{result.receipt.intended_urls_counted}</strong>.
                Изменений: {result.receipt.changes_applied}.
                AI-вызовов: {result.receipt.model_calls}.
              </p>
              <p className="owner-card-copy">
                <span style={{ marginRight: 12 }}>index: {result.receipt.intended_index}</span>
                <span style={{ marginRight: 12 }}>noindex: {result.receipt.intended_noindex}</span>
                <span>Утверждённых товаров: {result.receipt.approved_product_bindings}</span>
              </p>
              <p className="owner-card-copy">{result.receipt.conclusion}</p>
              {result.gmel_review ? (
                <p className="owner-card-copy">
                  Проверка доказательств: {result.gmel_review.status === 'COMPLETED'
                    ? result.gmel_review.method === 'AUTOMATED_SQL_RECONCILIATION_NO_LLM'
                      ? 'автоматическая SQL-сверка завершена (без AI)'
                      : 'ранее сохранённая проверка повторно использована'
                    : 'ожидает безопасного повтора'}.
                  GMEL-модель не запускалась; сайт не изменялся.
                </p>
              ) : null}
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
