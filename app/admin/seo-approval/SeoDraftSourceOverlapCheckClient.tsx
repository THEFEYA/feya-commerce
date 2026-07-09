'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type SourceOverlapResult = {
  ok?: boolean;
  status?: string;
  message?: string;
  error?: string;
  source_overlap?: {
    status?: string;
    draft_vs_target_source?: { overlap_pct?: number | null } | null;
    source_catalog?: { max_overlap_pct?: number | null; candidate_count?: number | null };
  };
};

export default function SeoDraftSourceOverlapCheckClient({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SourceOverlapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCheck() {
    if (!draftId || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch('/api/admin/seo-engine/draft-source-overlap-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId, actor: 'seo-approval-ui' }),
      });
      const payload = await response.json().catch(() => ({}));
      setResult({ ...payload, http_status: response.status });
      if (payload?.ok) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка проверки текущего каталога');
    } finally {
      setLoading(false);
    }
  }

  return <div className="mt-4 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Проверка текущего каталога</div>
        <div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">Сравнит SEO-черновик с текущим storefront/source состоянием товара и похожими товарами в каталоге. Это помогает понять, что уже приехало из Etsy и где нужна дифференциация. Publish не выполняется.</div>
      </div>
      <button
        type="button"
        onClick={runCheck}
        disabled={loading}
        className="btn-ghost px-4 py-2 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Проверяю каталог…' : 'Проверить текущий каталог'}
      </button>
    </div>

    {error ? <div className="mt-3 rounded-lg border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-2.5 text-[11px] text-[var(--ruby-soft)]">{error}</div> : null}
    {result ? <div className={`mt-3 rounded-lg border p-2.5 text-[11px] leading-relaxed ${result.ok ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)] text-[#a9dfbd]' : 'border-[rgba(212,178,106,.35)] bg-[rgba(212,178,106,.08)] text-[var(--gold-warm)]'}`}>
      <div>{result.message || result.error || translateStatus(result.status || 'unknown')}</div>
      {result.source_overlap ? <div className="mt-2 text-[var(--bone-dim)]">
        status: {translateOverlapStatus(result.source_overlap.status || 'unknown')} · draft/source: {result.source_overlap.draft_vs_target_source?.overlap_pct ?? '—'}% · catalog max: {result.source_overlap.source_catalog?.max_overlap_pct ?? '—'}% · checked products: {result.source_overlap.source_catalog?.candidate_count ?? 0}
      </div> : null}
    </div> : null}
  </div>;
}

function translateStatus(status: string) {
  const map: Record<string, string> = {
    source_overlap_passed: 'Проверка текущего каталога пройдена.',
    source_overlap_needs_review: 'Нужна ручная проверка отличия от текущего каталога.',
    blocked_feature_flag_disabled: 'Флаг storage выключен.',
    draft_not_found: 'Черновик не найден.',
    source_overlap_update_failed: 'Не удалось сохранить source overlap snapshot.',
    source_overlap_event_failed: 'Проверка сохранилась, но event не записался.',
  };
  return map[status] || status;
}

function translateOverlapStatus(status: string) {
  const map: Record<string, string> = {
    pass: 'готово',
    warning: 'проверить',
    blocker: 'блокер',
  };
  return map[status] || status;
}
