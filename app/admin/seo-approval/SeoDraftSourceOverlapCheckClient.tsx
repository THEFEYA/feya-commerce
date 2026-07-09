'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type SourceCatalogMatch = {
  product_slug?: string | null;
  title?: string | null;
  overlap_pct?: number | null;
  shared_tokens?: string[];
  source_axes?: {
    product_type?: string | null;
    material?: string | null;
    color?: string | null;
    category?: string | null;
    world?: string | null;
  };
};

type DifferentiationStrategy = {
  classification?: string;
  risk_level?: string;
  agent_instruction_summary?: string;
  recommended_generation_mode?: string;
  primary_angle_to_own?: string;
  title_strategy?: string;
  h1_strategy?: string;
  meta_strategy?: string;
  body_strategy?: string;
  keep_cluster_terms?: string[];
  avoid_overusing_terms?: string[];
  required_differentiators?: string[];
  nearest_catalog_match?: {
    title?: string | null;
    product_slug?: string | null;
    overlap_pct?: number | null;
    shared_tokens?: string[];
  } | null;
};

type SourceOverlapResult = {
  ok?: boolean;
  status?: string;
  message?: string;
  error?: string;
  source_overlap?: {
    status?: string;
    source_view_used?: string | null;
    source_select_tier?: string | null;
    match_key_used?: string | null;
    source_load_errors?: Array<{ stage?: string; view?: string; message?: string; code?: string | null }>;
    draft_vs_target_source?: { overlap_pct?: number | null } | null;
    source_catalog?: { max_overlap_pct?: number | null; candidate_count?: number | null; top_matches?: SourceCatalogMatch[] };
    target?: { source_loaded?: boolean; draft_token_count?: number | null; source_token_count?: number | null };
    differentiation_strategy?: DifferentiationStrategy | null;
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

  const overlap = result?.source_overlap;
  const strategy = overlap?.differentiation_strategy;
  const sourceLoaded = overlap?.target?.source_loaded;
  const hasResolverErrors = Boolean(overlap?.source_load_errors?.length);
  const topMatches = overlap?.source_catalog?.top_matches?.slice(0, 3) || [];
  const resultTone = getResultTone(overlap?.status, result?.ok);

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
    {result ? <div className={`mt-3 rounded-lg border p-2.5 text-[11px] leading-relaxed ${toneClass(resultTone)}`}>
      <div>{result.message || result.error || translateStatus(result.status || 'unknown')}</div>
      {overlap ? <div className="mt-2 space-y-2 text-[var(--bone-dim)]">
        <div>status: {translateOverlapStatus(overlap.status || 'unknown')} · draft/source: {overlap.draft_vs_target_source?.overlap_pct ?? '—'}% · catalog max: {overlap.source_catalog?.max_overlap_pct ?? '—'}% · checked products: {overlap.source_catalog?.candidate_count ?? 0}</div>
        <div>source: {sourceLoaded ? 'найден' : 'не найден'} · view: {overlap.source_view_used || '—'} · match: {translateMatchKey(overlap.match_key_used || '')} · draft tokens: {overlap.target?.draft_token_count ?? '—'} · source tokens: {overlap.target?.source_token_count ?? '—'}</div>
        {strategy ? <div className="mt-2 rounded-lg border border-[rgba(212,178,106,.22)] bg-[rgba(212,178,106,.07)] p-2.5">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--gold-warm)]">Решение для SEO-агента</div>
          <div className="text-bone">{translateClassification(strategy.classification || 'unknown')} · риск: {translateRisk(strategy.risk_level || 'unknown')}</div>
          {strategy.agent_instruction_summary ? <div className="mt-1 text-[var(--bone-dim)]">{strategy.agent_instruction_summary}</div> : null}
          {strategy.primary_angle_to_own ? <div className="mt-2 text-[#a9dfbd]">Угол, который должен занять этот товар: {strategy.primary_angle_to_own}</div> : null}
          <div className="mt-2 grid gap-2 lg:grid-cols-2">
            <MiniStrategy title="Title/H1" items={[strategy.title_strategy, strategy.h1_strategy].filter(Boolean) as string[]} />
            <MiniStrategy title="Meta/body" items={[strategy.meta_strategy, strategy.body_strategy].filter(Boolean) as string[]} />
          </div>
          {strategy.keep_cluster_terms?.length ? <div className="mt-2 text-[10px] text-[var(--bone-dim)]">кластер оставить: {strategy.keep_cluster_terms.join(', ')}</div> : null}
          {strategy.avoid_overusing_terms?.length ? <div className="mt-1 text-[10px] text-[var(--gold-warm)]">не переспамить: {strategy.avoid_overusing_terms.join(', ')}</div> : null}
          {strategy.required_differentiators?.length ? <div className="mt-1 text-[10px] text-[var(--bone-dim)]">дифференциаторы: {strategy.required_differentiators.slice(0, 6).join(' · ')}</div> : null}
        </div> : null}
        {topMatches.length ? <div className="mt-2 rounded-lg border border-[rgba(216,214,211,.10)] bg-black/20 p-2">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--smoke)]">Самые похожие товары каталога</div>
          <div className="space-y-2">{topMatches.map((match, index) => <div key={`${match.product_slug || 'match'}-${index}`} className="rounded-md border border-[rgba(216,214,211,.08)] bg-black/20 p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-bone">{index + 1}. {match.title || match.product_slug || 'товар каталога'}</div>
              <div className="text-[var(--gold-warm)]">{match.overlap_pct ?? 0}%</div>
            </div>
            <div className="mt-1 text-[10px] text-[var(--smoke)]">/{match.product_slug || 'no-slug'}</div>
            {match.shared_tokens?.length ? <div className="mt-1 text-[10px] text-[var(--bone-dim)]">общие слова: {match.shared_tokens.slice(0, 12).join(', ')}</div> : null}
            {match.source_axes ? <div className="mt-1 text-[10px] text-[var(--smoke)]">оси: {[match.source_axes.product_type, match.source_axes.material, match.source_axes.color, match.source_axes.category, match.source_axes.world].filter(Boolean).join(' · ') || '—'}</div> : null}
          </div>)}</div>
        </div> : null}
        {hasResolverErrors ? <div className="text-[var(--gold-warm)]">Есть resolver warnings: {overlap.source_load_errors?.slice(0, 2).map((item) => `${item.view || item.stage}: ${item.message}`).join(' · ')}</div> : null}
      </div> : null}
    </div> : null}
  </div>;
}

function MiniStrategy({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div className="rounded-md border border-[rgba(216,214,211,.10)] bg-black/20 p-2">
    <div className="mb-1 text-[9px] uppercase tracking-[0.16em] text-[var(--smoke)]">{title}</div>
    <ul className="space-y-1">{items.map((item, index) => <li key={`${title}-${index}`}>• {item}</li>)}</ul>
  </div>;
}

function getResultTone(status?: string, ok?: boolean) {
  if (!ok) return 'warning';
  if (status === 'pass') return 'success';
  if (status === 'blocker') return 'danger';
  return 'warning';
}

function toneClass(tone: string) {
  if (tone === 'success') return 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)] text-[#a9dfbd]';
  if (tone === 'danger') return 'border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] text-[var(--ruby-soft)]';
  return 'border-[rgba(212,178,106,.35)] bg-[rgba(212,178,106,.08)] text-[var(--gold-warm)]';
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

function translateClassification(value: string) {
  const map: Record<string, string> = {
    portfolio_clear: 'портфель чистый',
    strategic_cluster_overlap_needs_differentiation: 'нормальный кластер, нужна дифференциация',
    possible_duplicate_risk: 'возможный дубль',
    source_mapping_issue: 'проблема source mapping',
  };
  return map[value] || value;
}

function translateRisk(value: string) {
  const map: Record<string, string> = {
    low: 'низкий',
    medium: 'средний',
    high: 'высокий',
    mapping: 'mapping',
  };
  return map[value] || value;
}

function translateOverlapStatus(status: string) {
  const map: Record<string, string> = {
    pass: 'готово',
    warning: 'проверить',
    blocker: 'блокер',
  };
  return map[status] || status;
}

function translateMatchKey(value: string) {
  const map: Record<string, string> = {
    canonical_product_id: 'product id',
    product_slug: 'slug',
    matched_etsy_listing_id: 'etsy id',
  };
  return map[value] || value || '—';
}
