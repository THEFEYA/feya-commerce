// @ts-nocheck
'use client';

import { useEffect, useMemo, useState } from 'react';
import { SeoDraftStorefrontPreview } from '@/components/SeoDraftStorefrontPreview';
import { validateSeoCommercialCopy } from '@/lib/seoCommercialCopyValidator';

type Result = Record<string, any>;
type Candidate = {
  canonical_product_id: string;
  matched_etsy_listing_id?: string | null;
  product_slug?: string | null;
  product_title?: string | null;
  generation_mode?: string | null;
  ready_for_openai?: boolean;
  validated_metric_count?: number;
  useful_keyword_count?: number;
  hard_blockers?: string[];
  section_blockers?: string[];
  primary_keywords?: Array<Record<string, any>>;
  secondary_keywords?: Array<Record<string, any>>;
};

export default function FirstRealDraftClient() {
  const [candidateLoading, setCandidateLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [storefrontProduct, setStorefrontProduct] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCandidates() {
      setCandidateLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/seo-engine/first-draft-candidates', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!active) return;

        if (!response.ok) {
          setError(payload?.error || 'Не удалось загрузить список товаров для SEO-генерации.');
          return;
        }

        const combined = uniqueCandidates([
          ...(Array.isArray(payload?.ready_candidates) ? payload.ready_candidates : []),
          ...(Array.isArray(payload?.nearest_candidates) ? payload.nearest_candidates : []),
        ]);
        setCandidates(combined);

        const requestedId = new URL(window.location.href).searchParams.get('product_id') || '';
        const requestedExists = combined.some((item) => item.canonical_product_id === requestedId);
        const defaultId = requestedExists
          ? requestedId
          : payload?.best_candidate?.canonical_product_id || combined[0]?.canonical_product_id || '';
        setSelectedProductId(defaultId);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Неизвестная ошибка загрузки товаров.');
      } finally {
        if (active) setCandidateLoading(false);
      }
    }

    loadCandidates();
    return () => { active = false; };
  }, []);

  const selectedCandidate = useMemo(
    () => candidates.find((item) => item.canonical_product_id === selectedProductId) || null,
    [candidates, selectedProductId],
  );

  function selectProduct(productId: string) {
    setSelectedProductId(productId);
    setResult(null);
    setStorefrontProduct(null);
    setError(null);

    const url = new URL(window.location.href);
    if (productId) url.searchParams.set('product_id', productId);
    else url.searchParams.delete('product_id');
    window.history.replaceState({}, '', url.toString());
  }

  async function run() {
    if (loading || !selectedProductId) return;
    setLoading(true);
    setResult(null);
    setStorefrontProduct(null);
    setError(null);

    try {
      const [generationResponse, productResponse] = await Promise.all([
        fetch('/api/admin/seo-engine/catalog-draft-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: selectedProductId,
            enforce_portfolio_strategy: false,
          }),
        }),
        fetch(`/api/admin/seo-engine/storefront-product?product_id=${encodeURIComponent(selectedProductId)}`, {
          cache: 'no-store',
        }),
      ]);

      const [generationPayload, productPayload] = await Promise.all([
        generationResponse.json().catch(() => ({})),
        productResponse.json().catch(() => ({})),
      ]);

      setResult({ ...generationPayload, http_status: generationResponse.status });
      if (productPayload?.product) setStorefrontProduct(productPayload.product);

      const errors = [
        !productResponse.ok ? productPayload?.error : null,
        !generationResponse.ok && !generationPayload?.generated_draft_output ? generationPayload?.error : null,
      ].filter(Boolean);
      if (errors.length) setError(errors.join(' · '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка запуска.');
    } finally {
      setLoading(false);
    }
  }

  const draft = result?.generated_draft_output || null;
  const structuralValidation = result?.generated_draft_validation || null;
  const commercialValidation = result?.generated_draft_commercial_validation
    || (draft ? validateSeoCommercialCopy(draft) : null);
  const diagnostics = result?.keyword_bank_diagnostics || null;
  const alts = Array.isArray(draft?.image_alt_candidates) ? draft.image_alt_candidates : [];
  const structuralIssues = Array.isArray(structuralValidation?.issues) ? structuralValidation.issues : [];
  const commercialIssues = Array.isArray(commercialValidation?.issues) ? commercialValidation.issues : [];
  const blockers = Array.isArray(result?.blockers) ? result.blockers : [];
  const reviewPass = Boolean(structuralValidation?.ok && commercialValidation?.ok);

  return <div className="space-y-5">
    <section className="rounded-2xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="eyebrow-gold">Каталоговая OpenAI SEO-генерация</div>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--bone-dim)]">
            Выберите товар с сохранённым Product DNA и ключевыми словами. Генерация использует реальные validated-метрики, фотографию, исходные данные товара и утверждённые правила текста. Ничего не сохраняется, не применяется и не публикуется.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 xl:max-w-[560px]">
          <label className="text-[9px] uppercase tracking-[.17em] text-[var(--smoke)]">Товар для проверки</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedProductId}
              onChange={(event) => selectProduct(event.target.value)}
              disabled={candidateLoading || loading || !candidates.length}
              className="min-h-11 flex-1 rounded-xl border border-[rgba(216,214,211,.16)] bg-black/35 px-4 text-[12px] text-bone outline-none disabled:opacity-50"
            >
              {!candidates.length ? <option value="">{candidateLoading ? 'Загружаю товары…' : 'Нет доступных кандидатов'}</option> : null}
              {candidates.map((candidate) => <option key={candidate.canonical_product_id} value={candidate.canonical_product_id}>
                {candidate.product_title || candidate.product_slug || candidate.canonical_product_id} · {candidate.generation_mode || 'UNKNOWN'}
              </option>)}
            </select>
            <button
              type="button"
              onClick={run}
              disabled={candidateLoading || loading || !selectedProductId}
              className="btn-ghost min-h-11 justify-center disabled:opacity-50"
            >
              {loading ? 'OpenAI генерирует…' : result ? 'Сгенерировать заново' : 'Сгенерировать draft'}
            </button>
          </div>
        </div>
      </div>

      {selectedCandidate ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Fact label="Режим" value={selectedCandidate.generation_mode || '—'} tone={selectedCandidate.ready_for_openai ? 'success' : 'warning'} />
        <Fact label="Validated metrics" value={String(selectedCandidate.validated_metric_count ?? 0)} tone={Number(selectedCandidate.validated_metric_count || 0) > 0 ? 'success' : 'warning'} />
        <Fact label="Полезные ключи" value={String(selectedCandidate.useful_keyword_count ?? 0)} />
        <Fact label="Etsy listing" value={String(selectedCandidate.matched_etsy_listing_id || '—')} />
        <Fact label="Product Truth" value={selectedCandidate.section_blockers?.length ? 'частичный' : 'готов'} tone={selectedCandidate.section_blockers?.length ? 'warning' : 'success'} />
      </div> : null}
    </section>

    {error ? <Notice tone="danger">{error}</Notice> : null}

    {selectedCandidate?.hard_blockers?.length ? <Notice tone="warning">
      Этот товар пока нельзя отправить в OpenAI: {selectedCandidate.hard_blockers.join(', ')}.
    </Notice> : null}

    {draft && storefrontProduct ? <SeoDraftStorefrontPreview product={storefrontProduct} draft={draft} /> : null}

    {draft && commercialValidation ? <section className={`rounded-2xl border p-5 ${reviewPass ? 'border-[rgba(108,183,138,.30)] bg-[rgba(108,183,138,.06)]' : 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow-gold">Итоговый quality gate</div>
          <div className={`mt-2 text-[22px] ${reviewPass ? 'text-[#a9dfbd]' : 'text-[var(--ruby-soft)]'}`}>
            {reviewPass ? 'PASS для ручной проверки' : 'BLOCKED: текст нужно доработать'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(commercialValidation.benefit_categories_found || []).map((category) => <span key={category} className="rounded-full border border-[rgba(212,178,106,.28)] px-2.5 py-1 text-[9px] uppercase tracking-[.14em] text-[var(--gold-warm)]">{category.replaceAll('_', ' ')}</span>)}
        </div>
      </div>
      {commercialIssues.length ? <div className="mt-4 grid gap-2 md:grid-cols-2">{commercialIssues.map((item, index) => <Issue key={`${item.code}-${index}`} item={item} />)}</div> : <div className="mt-3 text-[12px] text-[#a9dfbd]">Коммерческий текст прошёл проверку на полезность, повторы, пустые фразы и запрещённые обещания.</div>}
    </section> : null}

    {result ? <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Fact label="HTTP" value={String(result.http_status ?? '—')} />
        <Fact label="Статус" value={String(result.status || '—')} tone={result.ok ? 'success' : 'warning'} />
        <Fact label="Режим данных" value={String(result.readiness?.mode || '—')} tone={result.readiness?.mode === 'READY_FULL' ? 'success' : 'warning'} />
        <Fact label="OpenAI" value={result.openai_generation?.ok ? 'ответ получен' : result.openai_generation?.status || 'не вызван'} tone={result.openai_generation?.ok ? 'success' : 'warning'} />
        <Fact label="Структура" value={structuralValidation?.ok ? 'PASS' : 'BLOCKED'} tone={structuralValidation?.ok ? 'success' : 'warning'} />
        <Fact label="Коммерческий текст" value={commercialValidation?.ok ? 'PASS' : 'BLOCKED'} tone={commercialValidation?.ok ? 'success' : 'warning'} />
      </div>

      {blockers.length ? <Panel title="Блокеры до генерации">
        <div className="grid gap-2 md:grid-cols-2">{blockers.map((item: any, index: number) => <Issue key={`${item.code}-${index}`} item={{ severity: 'blocker', ...item }} />)}</div>
      </Panel> : null}

      {result.message ? <Notice tone={reviewPass ? 'success' : 'warning'}>{result.message}</Notice> : null}

      <details className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
        <summary className="cursor-pointer text-[11px] uppercase tracking-[.18em] text-[var(--gold-warm)]">SEO-поля, ключи и техническая проверка</summary>
        <div className="mt-5 space-y-5">
          {draft ? <Panel title="SEO-поля">
            <div className="grid gap-3 lg:grid-cols-2">
              <TextField label="SEO title" value={draft.seo_title} />
              <TextField label="H1" value={draft.h1} />
              <TextField label="Meta description" value={draft.meta_description} />
              <TextField label="Intro" value={draft.intro} />
            </div>
          </Panel> : null}

          {diagnostics ? <Panel title="Ключи, реально переданные в генерацию">
            <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Fact label="Найдено" value={String(diagnostics.bank_rows_found ?? 0)} />
              <Fact label="Trusted metrics" value={String(diagnostics.trusted_metric_rows ?? 0)} />
              <Fact label="Usable candidates" value={String(diagnostics.useful_candidate_rows ?? 0)} />
              <Fact label="Validated usable" value={String(diagnostics.useful_validated_rows ?? 0)} tone={Number(diagnostics.useful_validated_rows || 0) > 0 ? 'success' : 'warning'} />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {(diagnostics.selected_keywords || []).map((item: any, index: number) => <div key={`${item.keyword}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
                <div className="text-[13px] text-bone">{item.keyword || '—'}</div>
                <div className="mt-1 text-[11px] text-[var(--bone-dim)]">role: {item.role || '—'} · volume: {item.avg_monthly_searches ?? '—'} · competition: {item.competition || '—'}</div>
                <div className="mt-1 text-[10px] text-[var(--smoke)]">{item.metric_source || '—'} · {item.last_checked || '—'}</div>
              </div>)}
            </div>
          </Panel> : null}

          {alts.length ? <Panel title="ALT для изображений">
            <ul className="space-y-2">{alts.map((item: any, index: number) => <li key={`${item.alt_text}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3 text-[12px] text-[var(--bone-dim)]">{item.alt_text || '—'} <span className="text-[var(--smoke)]">· {item.truth_basis || '—'}</span></li>)}</ul>
          </Panel> : null}

          {structuralValidation ? <Panel title="Структурный validator">
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <Fact label="Результат" value={structuralValidation.ok ? 'PASS' : 'BLOCKED'} tone={structuralValidation.ok ? 'success' : 'warning'} />
              <Fact label="Замечаний" value={String(structuralIssues.length)} tone={structuralIssues.length ? 'warning' : 'success'} />
            </div>
            {structuralIssues.length ? <div className="grid gap-2 md:grid-cols-2">{structuralIssues.map((item: any, index: number) => <Issue key={`${item.code}-${index}`} item={item} />)}</div> : <div className="text-[12px] text-[#a9dfbd]">Структурных ошибок не найдено.</div>}
          </Panel> : null}

          <details className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-4">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[.16em] text-[var(--smoke)]">Полный JSON</summary>
            <pre className="mt-3 max-h-[500px] overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-[var(--bone-dim)]">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      </details>
    </> : null}
  </div>;
}

function uniqueCandidates(values: Candidate[]) {
  const seen = new Set<string>();
  return values.filter((item) => {
    const id = String(item?.canonical_product_id || '').trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="mb-4 text-[11px] uppercase tracking-[.18em] text-[var(--gold-warm)]">{title}</div>
    {children}
  </section>;
}

function Fact({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: string }) {
  const cls = tone === 'success' ? 'text-[#a9dfbd]' : tone === 'warning' ? 'text-[var(--gold-warm)]' : 'text-bone';
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
    <div className="text-[9px] uppercase tracking-[.17em] text-[var(--smoke)]">{label}</div>
    <div className={`mt-1 break-words text-[12px] ${cls}`}>{value}</div>
  </div>;
}

function TextField({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-4">
    <div className="text-[9px] uppercase tracking-[.17em] text-[var(--smoke)]">{label}</div>
    <div className="mt-2 text-[13px] leading-relaxed text-bone">{value || '—'}</div>
  </div>;
}

function Issue({ item }: { item: Record<string, any> }) {
  return <div className="rounded-xl border border-[rgba(212,178,106,.22)] bg-black/20 p-3">
    <div className="text-[11px] text-[var(--gold-warm)]">{item.severity || 'warning'}: {item.code || 'unknown'}</div>
    <div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">{item.message || '—'}</div>
  </div>;
}

function Notice({ children, tone = 'warning' }: { children: React.ReactNode; tone?: string }) {
  const cls = tone === 'danger'
    ? 'border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] text-[var(--ruby-soft)]'
    : tone === 'success'
      ? 'border-[rgba(108,183,138,.30)] bg-[rgba(108,183,138,.07)] text-[#a9dfbd]'
      : 'border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] text-[var(--gold-warm)]';
  return <div className={`rounded-2xl border p-4 text-[12px] leading-relaxed ${cls}`}>{children}</div>;
}
