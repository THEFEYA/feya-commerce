'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type SimilarityResult = {
  ok?: boolean;
  status?: string;
  message?: string;
  error?: string;
  similarity?: {
    status?: string;
    max_similarity_pct?: number;
    comparison_count?: number;
    top_matches?: Array<{ product_slug?: string; similarity_pct?: number; shared_tokens?: string[] }>;
    decision?: string;
  };
};

export default function SeoDraftSimilarityCheckClient({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimilarityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCheck() {
    if (!draftId || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch('/api/admin/seo-engine/draft-similarity-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId, actor: 'seo-approval-ui' }),
      });
      const payload = await response.json().catch(() => ({}));
      setResult({ ...payload, http_status: response.status });
      if (payload?.ok) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка проверки пересечения');
    } finally {
      setLoading(false);
    }
  }

  return <div className="mt-4 rounded-xl border border-[rgba(212,178,106,.22)] bg-[rgba(212,178,106,.055)] p-3">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--gold-warm)]">Портфельная проверка пересечения</div>
        <div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">Это не запрет похожих товаров. Проверка ищет риск дублей и слабой дифференциации внутри SEO-портфеля. Если всё нормально — черновик переходит к Image ALT review. Publish не выполняется.</div>
      </div>
      <button
        type="button"
        onClick={runCheck}
        disabled={loading}
        className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Проверяю пересечение…' : 'Проверить пересечение'}
      </button>
    </div>

    {error ? <div className="mt-3 rounded-lg border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-2.5 text-[11px] text-[var(--ruby-soft)]">{error}</div> : null}
    {result ? <div className={`mt-3 rounded-lg border p-2.5 text-[11px] leading-relaxed ${result.ok ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)] text-[#a9dfbd]' : 'border-[rgba(212,178,106,.35)] bg-[rgba(212,178,106,.08)] text-[var(--gold-warm)]'}`}>
      <div>{result.message || result.error || translateStatus(result.status || 'unknown')}</div>
      {result.similarity ? <div className="mt-2 text-[var(--bone-dim)]">
        status: {translateSimilarityStatus(result.similarity.status || 'unknown')} · max overlap: {result.similarity.max_similarity_pct ?? 0}% · compared: {result.similarity.comparison_count ?? 0}
      </div> : null}
    </div> : null}
  </div>;
}

function translateStatus(status: string) {
  const map: Record<string, string> = {
    portfolio_overlap_passed: 'Портфельная проверка пересечения пройдена.',
    portfolio_overlap_needs_review: 'Нужна ручная дифференциация SEO-черновика.',
    similarity_passed: 'Проверка похожести пройдена.',
    similarity_needs_review: 'Нужна ручная проверка похожести.',
    blocked_feature_flag_disabled: 'Флаг storage выключен.',
    draft_not_found: 'Черновик не найден.',
    candidate_load_failed: 'Не удалось загрузить drafts для сравнения.',
    similarity_update_failed: 'Не удалось сохранить результат проверки пересечения.',
    similarity_event_failed: 'Проверка сохранилась, но event не записался.',
  };
  return map[status] || status;
}

function translateSimilarityStatus(status: string) {
  const map: Record<string, string> = {
    pass: 'готово',
    warning: 'проверить',
    blocker: 'блокер',
  };
  return map[status] || status;
}
