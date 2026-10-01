'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type ActionResult = {
  ok?: boolean;
  status?: string;
  message?: string;
  error?: string;
  draft?: Record<string, unknown>;
  event?: Record<string, unknown>;
};

export default function SeoDraftReviewActionsClient({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<'request_changes' | 'approve_draft' | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: 'request_changes' | 'approve_draft') {
    if (!draftId || loadingAction) return;
    setLoadingAction(action);
    setResult(null);
    setError(null);
    try {
      const response = await fetch('/api/admin/seo-engine/draft-review-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draftId,
          action,
          actor: 'seo-approval-ui',
          note: action === 'approve_draft'
            ? 'Черновик одобрен человеком в очереди Проверка SEO. Publish не выполнялся.'
            : 'Запрошены правки в очереди Проверка SEO. Publish не выполнялся.',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      setResult({ ...payload, http_status: response.status });
      if (payload?.ok) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка review action');
    } finally {
      setLoadingAction(null);
    }
  }

  return <div className="mt-4 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Действия проверки</div>
        <div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">Эти кнопки меняют только review status черновика. Публикация и ready_for_publish остаются заблокированы.</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runAction('request_changes')}
          disabled={Boolean(loadingAction)}
          className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingAction === 'request_changes' ? 'Сохраняю правки…' : 'Запросить правки'}
        </button>
        <button
          type="button"
          onClick={() => runAction('approve_draft')}
          disabled={Boolean(loadingAction)}
          className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingAction === 'approve_draft' ? 'Одобряю…' : 'Одобрить черновик'}
        </button>
      </div>
    </div>

    {error ? <div className="mt-3 rounded-lg border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-2.5 text-[11px] text-[var(--ruby-soft)]">{error}</div> : null}
    {result ? <div className={`mt-3 rounded-lg border p-2.5 text-[11px] leading-relaxed ${result.ok ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)] text-[#a9dfbd]' : 'border-[rgba(212,178,106,.35)] bg-[rgba(212,178,106,.08)] text-[var(--gold-warm)]'}`}>{result.message || result.error || translateStatus(result.status || 'unknown')}</div> : null}
  </div>;
}

function translateStatus(status: string) {
  const map: Record<string, string> = {
    draft_approved: 'Черновик одобрен.',
    changes_requested: 'Запрошены правки.',
    blocked_feature_flag_disabled: 'Флаг storage выключен.',
    draft_not_found: 'Черновик не найден.',
    review_update_failed: 'Не удалось обновить review status.',
    review_event_failed: 'Review status обновился, но event не записался.',
  };
  return map[status] || status;
}
