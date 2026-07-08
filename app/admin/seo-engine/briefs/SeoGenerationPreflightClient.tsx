'use client';

import { useMemo, useState } from 'react';

type PreflightResult = {
  ok?: boolean;
  status?: string;
  blocked?: boolean;
  blockers?: Array<{ code?: string; message?: string }>;
  readiness?: Record<string, unknown>;
  feature_flag?: { name?: string; enabled?: boolean };
  dry_run?: boolean;
  error?: string;
  guardrails?: string[];
  seo_pack_draft?: unknown;
  ai_agent_input?: unknown;
  message?: string;
};

export default function SeoGenerationPreflightClient({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusTone = useMemo(() => {
    const status = String(result?.status || '').toLowerCase();
    if (!result) return 'neutral';
    if (status.includes('blocked') || status.includes('missing') || status.includes('not_found')) return 'warning';
    if (result.ok) return 'success';
    return 'warning';
  }, [result]);

  async function runPreflight() {
    if (!productId || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/admin/seo-engine/draft-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, dry_run: true }),
      });
      const payload = await response.json().catch(() => ({}));
      setResult({ ...payload, http_status: response.status } as PreflightResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown preflight error');
    } finally {
      setLoading(false);
    }
  }

  return <div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.055)] p-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--gold-warm)]">Generation preflight</div>
        <div className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[var(--bone-dim)]">Проверяет будущий путь генерации: feature flag, OpenAI key, dry-run, save gates, similarity gate. OpenAI не вызывается и Supabase не пишет.</div>
      </div>
      <button
        type="button"
        onClick={runPreflight}
        disabled={!productId || loading}
        className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Проверяю…' : 'Run generation preflight'}
      </button>
    </div>

    {error ? <div className="mt-3 rounded-lg border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-2.5 text-[11px] text-[var(--ruby-soft)]">{error}</div> : null}

    {result ? <div className="mt-3 space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <PreflightFact label="Status" value={result.status || 'unknown'} tone={statusTone} />
        <PreflightFact label="HTTP" value={String((result as any).http_status || '—')} />
        <PreflightFact label="Dry run" value={String(result.dry_run ?? true)} />
        <PreflightFact label="Feature flag" value={String(result.feature_flag?.enabled ?? false)} />
      </div>

      {result.error ? <div className="rounded-lg border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-2.5 text-[11px] leading-relaxed text-[var(--ruby-soft)]">{result.error}</div> : null}

      {result.blockers?.length ? <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Blockers</div>
        <div className="grid md:grid-cols-2 gap-2">{result.blockers.map((blocker, index) => <div key={`${blocker.code}-${index}`} className="rounded-lg border border-[rgba(212,178,106,.22)] bg-black/20 p-2.5">
          <div className="text-[11px] text-[var(--gold-warm)]">{blocker.code || 'blocker'}</div>
          <div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">{blocker.message || 'Needs review'}</div>
        </div>)}</div>
      </div> : null}

      {result.readiness ? <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Readiness</div>
        <pre className="max-h-[180px] overflow-auto rounded-lg border border-[rgba(216,214,211,.10)] bg-black/25 p-2.5 text-[10px] leading-relaxed text-[var(--bone-dim)] whitespace-pre-wrap">{JSON.stringify(result.readiness, null, 2)}</pre>
      </div> : null}

      <details className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/20 p-2.5">
        <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Full preflight JSON</summary>
        <pre className="mt-2 max-h-[360px] overflow-auto text-[10px] leading-relaxed text-[var(--bone-dim)] whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div> : null}
  </div>;
}

function PreflightFact({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: string }) {
  const valueClass = tone === 'success'
    ? 'text-[#a9dfbd]'
    : tone === 'warning'
      ? 'text-[var(--gold-warm)]'
      : 'text-bone';
  return <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/20 p-2.5">
    <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1">{label}</div>
    <div className={`text-[12px] leading-snug ${valueClass}`}>{value}</div>
  </div>;
}
