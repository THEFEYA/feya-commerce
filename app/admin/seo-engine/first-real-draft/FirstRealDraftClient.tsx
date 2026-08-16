// @ts-nocheck
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { SeoDraftStorefrontPreview } from '@/components/SeoDraftStorefrontPreview';
import { validateSeoCommercialCopy } from '@/lib/seoCommercialCopyValidator';

type Result = Record<string, any>;
type Candidate = {
  canonical_product_id: string;
  matched_etsy_listing_id?: string | null;
  product_slug?: string | null;
  product_title?: string | null;
  primary_image_url?: string | null;
  primary_image_alt?: string | null;
  product_type?: string | null;
  material?: string | null;
  color?: string | null;
  generation_mode?: string | null;
  ready_for_openai?: boolean;
  ready_for_full_pack?: boolean;
  selected_keyword_count?: number;
  validated_metric_count?: number;
  useful_keyword_count?: number;
  hard_blockers?: string[];
  section_blockers?: string[];
  primary_keywords?: Array<Record<string, any>>;
  secondary_keywords?: Array<Record<string, any>>;
  has_saved_draft?: boolean;
  latest_draft_status?: string | null;
  latest_review_status?: string | null;
  latest_draft_at?: string | null;
  decision_status?: string | null;
  keyword_selection?: {
    mode?: string | null;
    status?: string | null;
    confirmation_required?: boolean;
  } | null;
  keyword_recommendation_diagnostics?: Record<string, any> | null;
  portfolio_strategy?: Record<string, any> | null;
};

type Filter = 'all' | 'ready' | 'blocked' | 'saved' | 'untested';

const TESTED_STORAGE_KEY = 'feya:seo-first-draft-tested-products:v1';
const PAGE_SIZE = 36;

export default function FirstRealDraftClient({
  initialProductId = '',
  autoGenerate = false,
  loadSavedDraft = false,
  resaveSavedDraft = false,
  recoverFailedDraft = false,
}: {
  initialProductId?: string;
  autoGenerate?: boolean;
  loadSavedDraft?: boolean;
  resaveSavedDraft?: boolean;
  recoverFailedDraft?: boolean;
}) {
  const [candidateLoading, setCandidateLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailVerifiedProductId, setDetailVerifiedProductId] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [testedIds, setTestedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [savedDraftLoading, setSavedDraftLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairUsed, setRepairUsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCurrentResult, setSavedCurrentResult] = useState(false);
  const [recoveryText, setRecoveryText] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [storefrontProduct, setStorefrontProduct] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const autoGenerationStarted = useRef('');
  const savedDraftLoadStarted = useRef('');

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(TESTED_STORAGE_KEY) || '[]');
      if (Array.isArray(parsed)) setTestedIds(new Set(parsed.map(String)));
    } catch {
      setTestedIds(new Set());
    }
  }, []);

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
          setError(payload?.error || 'Не удалось загрузить каталог товаров для SEO-проверки.');
          return;
        }

        const combined = uniqueCandidates(
          Array.isArray(payload?.candidates)
            ? payload.candidates
            : [
                ...(Array.isArray(payload?.ready_candidates) ? payload.ready_candidates : []),
                ...(Array.isArray(payload?.nearest_candidates) ? payload.nearest_candidates : []),
              ],
        );
        setCandidates(combined);

        const requestedId = initialProductId || new URL(window.location.href).searchParams.get('product_id') || '';
        const requestedExists = combined.some((item) => item.canonical_product_id === requestedId);
        const defaultId = requestedExists
          ? requestedId
          : payload?.best_candidate?.canonical_product_id
            || combined.find((item) => item.ready_for_openai && !item.has_saved_draft)?.canonical_product_id
            || combined.find((item) => item.ready_for_openai)?.canonical_product_id
            || combined[0]?.canonical_product_id
            || '';
        setSelectedProductId((current) => current || defaultId);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Неизвестная ошибка загрузки товаров.');
      } finally {
        if (active) setCandidateLoading(false);
      }
    }

    loadCandidates();
    return () => { active = false; };
  }, [initialProductId]);

  useEffect(() => {
    if (!selectedProductId) return;
    const controller = new AbortController();
    let active = true;

    async function loadDetail() {
      setDetailVerifiedProductId('');
      setDetailLoading(true);
      setDetailError(null);
      try {
        const response = await fetch(
          `/api/admin/seo-engine/first-draft-candidates?product_id=${encodeURIComponent(selectedProductId)}`,
          { cache: 'no-store', signal: controller.signal },
        );
        const payload = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok || !payload?.candidate) {
          setDetailError(payload?.error || 'Не удалось выполнить точную проверку выбранного товара.');
          return;
        }

        setCandidates((current) => {
          const exists = current.some((item) => item.canonical_product_id === payload.candidate.canonical_product_id);
          if (!exists) return [payload.candidate, ...current];
          return current.map((item) => item.canonical_product_id === payload.candidate.canonical_product_id
            ? { ...item, ...payload.candidate }
            : item);
        });
        setDetailVerifiedProductId(payload.candidate.canonical_product_id);
      } catch (err) {
        if (active && err?.name !== 'AbortError') {
          setDetailError(err instanceof Error ? err.message : 'Неизвестная ошибка точной проверки.');
        }
      } finally {
        if (active) setDetailLoading(false);
      }
    }

    loadDetail();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedProductId]);

  const selectedCandidate = useMemo(
    () => candidates.find((item) => item.canonical_product_id === selectedProductId) || null,
    [candidates, selectedProductId],
  );

  const filteredCandidates = useMemo(() => {
    const query = normalizeSearch(search);
    return candidates.filter((candidate) => {
      const tested = testedIds.has(candidate.canonical_product_id);
      const matchesFilter = filter === 'all'
        || (filter === 'ready' && candidate.ready_for_openai)
        || (filter === 'blocked' && !candidate.ready_for_openai)
        || (filter === 'saved' && candidate.has_saved_draft)
        || (filter === 'untested' && !tested);
      if (!matchesFilter) return false;
      if (!query) return true;
      const haystack = normalizeSearch([
        candidate.product_title,
        candidate.product_slug,
        candidate.matched_etsy_listing_id,
        candidate.canonical_product_id,
        candidate.product_type,
        candidate.material,
        candidate.color,
      ].filter(Boolean).join(' '));
      return haystack.includes(query);
    });
  }, [candidates, search, filter, testedIds]);

  const visibleCandidates = filteredCandidates.slice(0, visibleCount);
  const readyCount = candidates.filter((item) => item.ready_for_openai).length;
  const savedCount = candidates.filter((item) => item.has_saved_draft).length;
  const testedCount = candidates.filter((item) => testedIds.has(item.canonical_product_id)).length;

  function selectProduct(productId: string) {
    setSelectedProductId(productId);
    setResult(null);
    setRepairUsed(false);
    setSavedCurrentResult(false);
    setStorefrontProduct(null);
    setError(null);
    setDetailError(null);

    const url = new URL(window.location.href);
    if (productId) url.searchParams.set('product_id', productId);
    else url.searchParams.delete('product_id');
    url.searchParams.delete('generate');
    url.searchParams.delete('saved');
    window.history.replaceState({}, '', url.toString());
  }

  function markTested(productId: string) {
    setTestedIds((current) => {
      const next = new Set(current);
      next.add(productId);
      try {
        window.localStorage.setItem(TESTED_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Browser storage is optional; the review itself still continues.
      }
      return next;
    });
  }

  async function run() {
    if (loading || detailLoading || !selectedProductId || !selectedCandidate) return;
    if (detailVerifiedProductId !== selectedProductId) {
      setError('Подождите: точная проверка Product Truth для выбранного товара ещё не завершена.');
      return;
    }
    if (!selectedCandidate.ready_for_openai) {
      setError('Этот товар заблокирован. Сначала устраните указанные ниже блокеры. OpenAI не вызван.');
      return;
    }

    setLoading(true);
    setResult(null);
    setRepairUsed(false);
    setSavedCurrentResult(false);
    setStorefrontProduct(null);
    setError(null);
    const generationController = new AbortController();
    const generationTimer = window.setTimeout(() => generationController.abort(), 130_000);

    try {
      const [generationResponse, productResponse] = await Promise.all([
        fetch('/api/admin/seo-engine/catalog-draft-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: generationController.signal,
          body: JSON.stringify({
            product_id: selectedProductId,
            enforce_portfolio_strategy: true,
          }),
        }),
        fetch(`/api/admin/seo-engine/storefront-product?product_id=${encodeURIComponent(selectedProductId)}`, {
          cache: 'no-store',
        }),
      ]);

      const [generationText, productText] = await Promise.all([
        generationResponse.text(),
        productResponse.text(),
      ]);
      const generationPayload = parseResponsePayload(
        generationText,
        `Generation returned HTTP ${generationResponse.status} without a valid JSON response.`,
      );
      const productPayload = parseResponsePayload(
        productText,
        `Product preview returned HTTP ${productResponse.status} without a valid JSON response.`,
      );

      setResult({ ...generationPayload, http_status: generationResponse.status });
      if (productPayload?.product) setStorefrontProduct(productPayload.product);
      markTested(selectedProductId);

      const errors = [
        !productResponse.ok ? productPayload?.error : null,
        !generationResponse.ok && !generationPayload?.generated_draft_output
          ? generationPayload?.error || generationPayload?.message || generationPayload?.status
          : null,
      ].filter(Boolean);
      if (errors.length) setError(errors.join(' · '));

      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err?.name === 'AbortError'
        ? 'OpenAI не ответил за 120 секунд. Запрос остановлен без повторной попытки; ничего не сохранено и не опубликовано.'
        : err instanceof Error ? err.message : 'Неизвестная ошибка запуска.');
    } finally {
      window.clearTimeout(generationTimer);
      setLoading(false);
    }
  }

  async function loadStoredDraft() {
    if (savedDraftLoading || !selectedProductId) return;
    setSavedDraftLoading(true);
    setResult(null);
    setRepairUsed(false);
    setSavedCurrentResult(false);
    setStorefrontProduct(null);
    setError(null);
    setWorkflowNotice(null);

    try {
      const [draftResponse, productResponse] = await Promise.all([
        fetch(`/api/admin/seo-engine/saved-draft-preview?product_id=${encodeURIComponent(selectedProductId)}&renormalize=${resaveSavedDraft ? '1' : '0'}`, {
          cache: 'no-store',
        }),
        fetch(`/api/admin/seo-engine/storefront-product?product_id=${encodeURIComponent(selectedProductId)}`, {
          cache: 'no-store',
        }),
      ]);
      const [draftPayload, productPayload] = await Promise.all([
        draftResponse.json().catch(() => ({})),
        productResponse.json().catch(() => ({})),
      ]);

      if (!draftResponse.ok || !draftPayload?.generated_draft_output) {
        setError(draftPayload?.error || 'Не удалось загрузить сохранённый SEO-черновик. OpenAI не вызывался.');
        return;
      }
      if (!productResponse.ok || !productPayload?.product) {
        setError(productPayload?.error || 'Сохранённый текст найден, но карточка товара не загрузилась. OpenAI не вызывался.');
        return;
      }

      setResult({ ...draftPayload, http_status: draftResponse.status });
      setStorefrontProduct(productPayload.product);
      setSavedCurrentResult(!resaveSavedDraft);
      setWorkflowNotice(resaveSavedDraft
        ? 'Загружен последний сохранённый SEO-черновик. Разрешено создать только новую нормализованную review-версию: OpenAI не вызывается, Apply и Publish не выполняются.'
        : 'Загружен последний сохранённый SEO-черновик. Это read-only preview: OpenAI не вызывался, токены не потрачены, ничего не изменено и не опубликовано.');
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err instanceof Error
        ? err.message
        : 'Неизвестная ошибка загрузки сохранённого SEO-черновика. OpenAI не вызывался.');
    } finally {
      setSavedDraftLoading(false);
    }
  }

  async function runTargetedRepair() {
    if (repairing || repairUsed || !selectedProductId || !draft || reviewPass) return;
    setRepairing(true);
    setRepairUsed(true);
    setError(null);
    setWorkflowNotice(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 130_000);

    try {
      const response = await fetch('/api/admin/seo-engine/catalog-draft-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          product_id: selectedProductId,
          repair_attempt: 1,
          current_output: draft,
          allow_openai_repair: false,
        }),
      });
      const payload = parseResponsePayload(
        await response.text(),
        `Targeted repair returned HTTP ${response.status} without a valid JSON response.`,
      );
      setResult((current) => ({ ...current, ...payload, http_status: response.status }));
      if (!response.ok && !payload?.generated_draft_output) {
        setError(payload?.error || payload?.message || 'Точечное исправление не выполнено. Повтор автоматически не запускается.');
      } else if (payload?.generated_draft_output) {
        setWorkflowNotice(payload?.repair?.deterministic_only
          ? 'Замечания исправлены бесплатными детерминированными правилами. OpenAI не вызывался; результат не сохранён и не опубликован.'
          : 'Выполнена одна ручная точечная доработка через OpenAI. Результат не сохранён и не опубликован.');
      }
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err?.name === 'AbortError'
        ? 'Точечное исправление остановлено через 120 секунд. Повтор не выполнялся.'
        : err instanceof Error ? err.message : 'Неизвестная ошибка точечного исправления.');
    } finally {
      window.clearTimeout(timer);
      setRepairing(false);
    }
  }

  async function importFailedDraftForRecovery() {
    if (recoveryLoading || !selectedProductId || !recoveryText.trim()) return;
    setRecoveryLoading(true);
    setError(null);
    setWorkflowNotice(null);
    try {
      const payload = JSON.parse(recoveryText);
      const payloadProductId = String(
        payload?.source?.product_id
          || payload?.pipeline_telemetry?.product_id
          || payload?.seo_pack_draft?.product_truth?.canonical_product_id
          || '',
      ).trim();
      if (payloadProductId !== selectedProductId) {
        throw new Error('Этот результат относится к другому товару. Восстановление остановлено.');
      }
      if (!payload?.generated_draft_output || typeof payload.generated_draft_output !== 'object') {
        throw new Error('В JSON нет generated_draft_output. OpenAI повторно не запускался.');
      }
      const productResponse = await fetch(
        `/api/admin/seo-engine/storefront-product?product_id=${encodeURIComponent(selectedProductId)}`,
        { cache: 'no-store' },
      );
      const productPayload = await productResponse.json().catch(() => ({}));
      if (!productResponse.ok || !productPayload?.product) {
        throw new Error(productPayload?.error || 'Карточка товара не загрузилась.');
      }
      setResult({ ...payload, http_status: payload.http_status ?? 422 });
      setStorefrontProduct(productPayload.product);
      setRepairUsed(false);
      setSavedCurrentResult(false);
      setWorkflowNotice('Несохранённый результат восстановлен локально. OpenAI не вызывался; теперь доступно одно бесплатное детерминированное исправление.');
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось восстановить несохранённый результат.');
    } finally {
      setRecoveryLoading(false);
    }
  }

  useEffect(() => {
    if (
      !autoGenerate
      || !selectedCandidate
      || detailLoading
      || detailVerifiedProductId !== selectedProductId
      || loading
      || result
      || !selectedCandidate.ready_for_openai
      || autoGenerationStarted.current === selectedProductId
    ) return;
    autoGenerationStarted.current = selectedProductId;
    void run();
    // `run` intentionally reads the latest selected candidate; adding the
    // render-scoped function here would retrigger automatic generation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, selectedCandidate, detailLoading, detailVerifiedProductId, loading, result, selectedProductId]);

  useEffect(() => {
    if (
      !loadSavedDraft
      || !selectedCandidate
      || detailLoading
      || detailVerifiedProductId !== selectedProductId
      || savedDraftLoading
      || result
      || !selectedCandidate.has_saved_draft
      || savedDraftLoadStarted.current === selectedProductId
    ) return;
    savedDraftLoadStarted.current = selectedProductId;
    void loadStoredDraft();
    // The read-only loader intentionally follows the same bounded one-shot
    // pattern as auto generation. It never calls OpenAI or writes storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSavedDraft, selectedCandidate, detailLoading, detailVerifiedProductId, savedDraftLoading, result, selectedProductId]);

  async function saveAndOpenNext() {
    if (saving || !selectedProductId || !draft || !reviewPass || savedCurrentResult) return;

    const savedProductId = selectedProductId;
    setSaving(true);
    setError(null);
    setWorkflowNotice(null);

    try {
      const response = await fetch('/api/admin/seo-engine/draft-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: savedProductId,
          dry_run: false,
          source_mode: 'openai_draft',
          agent_output: draft,
          include_payload: false,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload?.saved_draft) {
        const blockerText = Array.isArray(payload?.blockers)
          ? payload.blockers.map((item: any) => item?.message || item?.code).filter(Boolean).join(' · ')
          : '';
        setError(payload?.error || blockerText || 'Не удалось сохранить review draft.');
        return;
      }

      const savedDraft = payload.saved_draft;
      const savedAt = savedDraft.created_at || new Date().toISOString();
      setCandidates((current) => current.map((item) => item.canonical_product_id === savedProductId
        ? {
            ...item,
            has_saved_draft: true,
            latest_draft_status: savedDraft.status || 'needs_human_review',
            latest_review_status: savedDraft.review_status || 'not_reviewed',
            latest_draft_at: savedAt,
          }
        : item));
      setSavedCurrentResult(true);

      const nextCandidate = candidates.find((item) => (
        item.canonical_product_id !== savedProductId
        && item.ready_for_openai
        && !item.has_saved_draft
      ));
      setWorkflowNotice(`Review draft сохранён для ${selectedCandidate?.product_title || selectedCandidate?.product_slug || savedProductId}. Публикация не выполнялась.`);
      if (nextCandidate) selectProduct(nextCandidate.canonical_product_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка сохранения review draft.');
    } finally {
      setSaving(false);
    }
  }

  const draft = result?.generated_draft_output || null;
  const structuralValidation = result?.generated_draft_validation || null;
  const commercialValidation = result?.generated_draft_commercial_validation
    || (draft ? validateSeoCommercialCopy(draft) : null);
  const keywordPlacementValidation = result?.generated_draft_keyword_placement_validation || null;
  const assembledPack = result?.assembled_seo_pack || null;
  const diagnostics = result?.keyword_bank_diagnostics || null;
  const savedSnapshotLoaded = result?.status === 'saved_draft_loaded';
  const alts = Array.isArray(draft?.image_alt_candidates) ? draft.image_alt_candidates : [];
  const structuralIssues = Array.isArray(structuralValidation?.issues) ? structuralValidation.issues : [];
  const commercialIssues = Array.isArray(commercialValidation?.issues) ? commercialValidation.issues : [];
  const keywordPlacementIssues = Array.isArray(keywordPlacementValidation?.issues) ? keywordPlacementValidation.issues : [];
  const blockers = Array.isArray(result?.blockers) ? result.blockers : [];
  const reviewPass = Boolean(structuralValidation?.ok && commercialValidation?.ok && keywordPlacementValidation?.ok);

  return <div className="min-w-0 space-y-6 overflow-x-hidden">
    <section className="min-w-0 rounded-2xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="eyebrow-gold">Каталог товаров для SEO-проверки</div>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">
            Найдите товар по названию, Etsy listing ID или slug. Фотография, готовность, сохранённый draft и история проверки видны до запуска OpenAI.
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[520px]">
          <Fact label="Товаров" value={String(candidates.length)} />
          <Fact label="Готовы к тексту" value={String(readyCount)} tone={readyCount ? 'success' : 'warning'} />
          <Fact label="С draft" value={String(savedCount)} />
          <Fact label="Проверено здесь" value={String(testedCount)} />
        </div>
      </div>
    </section>

    {error ? <Notice tone="danger">{error}</Notice> : null}
    {workflowNotice ? <Notice tone="success">{workflowNotice}</Notice> : null}

    {recoverFailedDraft ? <section className="min-w-0 rounded-2xl border border-[rgba(212,178,106,.28)] bg-black/25 p-4 sm:p-5">
      <div className="eyebrow-gold">Восстановление несохранённого результата</div>
      <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-[var(--bone-dim)]">
        Вставьте JSON уже выполненной генерации. Это не вызывает OpenAI, ничего не сохраняет и не публикует; товар и product ID проверяются до загрузки preview.
      </p>
      <textarea
        value={recoveryText}
        onChange={(event) => setRecoveryText(event.target.value)}
        placeholder="JSON результата генерации"
        className="mt-3 min-h-32 w-full rounded-xl border border-[rgba(216,214,211,.16)] bg-black/40 p-3 font-mono text-[11px] text-bone outline-none focus:border-[rgba(212,178,106,.55)]"
      />
      <button
        type="button"
        onClick={importFailedDraftForRecovery}
        disabled={recoveryLoading || !recoveryText.trim()}
        className="btn-ghost mt-3 min-h-11 w-full justify-center px-4 text-center disabled:cursor-not-allowed disabled:opacity-40"
      >
        {recoveryLoading ? 'Восстанавливаю…' : 'Восстановить без OpenAI'}
      </button>
    </section> : null}

    <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]">
        <div className="border-b border-[rgba(216,214,211,.10)] p-4 sm:p-5">
          <label className="block text-[9px] uppercase tracking-[.17em] text-[var(--smoke)]">Поиск товара</label>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Название, Etsy listing ID, slug или product ID"
            className="mt-2 h-12 w-full min-w-0 rounded-xl border border-[rgba(216,214,211,.16)] bg-black/35 px-4 text-[13px] text-bone outline-none placeholder:text-[var(--smoke)] focus:border-[rgba(212,178,106,.55)]"
          />
          <div className="mt-3 flex min-w-0 flex-wrap gap-2">
            <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Все</FilterButton>
            <FilterButton active={filter === 'ready'} onClick={() => setFilter('ready')}>Готовы</FilterButton>
            <FilterButton active={filter === 'blocked'} onClick={() => setFilter('blocked')}>Заблокированы</FilterButton>
            <FilterButton active={filter === 'saved'} onClick={() => setFilter('saved')}>Есть draft</FilterButton>
            <FilterButton active={filter === 'untested'} onClick={() => setFilter('untested')}>Не проверены</FilterButton>
          </div>
        </div>

        <div className="max-h-[760px] min-w-0 overflow-y-auto p-3 sm:p-4">
          {candidateLoading ? <div className="p-8 text-center text-[13px] text-[var(--bone-dim)]">Загружаю каталог…</div> : null}
          {!candidateLoading && !visibleCandidates.length ? <div className="p-8 text-center text-[13px] text-[var(--bone-dim)]">По этому запросу товары не найдены.</div> : null}
          <div className="grid min-w-0 gap-2">
            {visibleCandidates.map((candidate) => {
              const selected = candidate.canonical_product_id === selectedProductId;
              const tested = testedIds.has(candidate.canonical_product_id);
              return <button
                key={candidate.canonical_product_id}
                type="button"
                onClick={() => selectProduct(candidate.canonical_product_id)}
                className={`grid min-w-0 grid-cols-[68px_minmax(0,1fr)] gap-3 rounded-xl border p-2.5 text-left transition ${selected
                  ? 'border-[rgba(212,178,106,.70)] bg-[rgba(212,178,106,.10)]'
                  : 'border-[rgba(216,214,211,.10)] bg-black/20 hover:border-[rgba(216,214,211,.28)] hover:bg-white/[.035]'}`}
              >
                <ProductThumb candidate={candidate} />
                <div className="min-w-0 py-0.5">
                  <div
                    className="overflow-hidden text-[13px] leading-snug text-bone"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                  >
                    {candidate.product_title || candidate.product_slug || candidate.canonical_product_id}
                  </div>
                  <div className="mt-1 truncate text-[10px] text-[var(--smoke)]">
                    Etsy {candidate.matched_etsy_listing_id || '—'} · {candidate.product_slug || candidate.canonical_product_id}
                  </div>
                  <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                    <StatusBadge tone={candidate.ready_for_openai ? 'success' : 'warning'}>
                      {candidate.ready_for_openai ? (candidate.ready_for_full_pack ? 'Полный Pack готов' : 'Готов к тексту') : blockerShort(candidate.hard_blockers)}
                    </StatusBadge>
                    {candidate.has_saved_draft ? <StatusBadge>Есть draft</StatusBadge> : null}
                    {candidate.keyword_selection?.mode === 'auto_recommendation' ? <StatusBadge tone="warning">Ключи рекомендованы</StatusBadge> : null}
                    {tested ? <StatusBadge tone="tested">Проверен здесь</StatusBadge> : null}
                  </div>
                </div>
              </button>;
            })}
          </div>

          {filteredCandidates.length > visibleCount ? <button
            type="button"
            onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}
            className="mt-4 h-11 w-full rounded-xl border border-[rgba(216,214,211,.16)] text-[11px] uppercase tracking-[.16em] text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.45)] hover:text-bone"
          >
            Показать ещё · осталось {filteredCandidates.length - visibleCount}
          </button> : null}
        </div>
      </section>

      <aside className="min-w-0 2xl:sticky 2xl:top-5 2xl:self-start">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]">
          {!selectedCandidate ? <div className="p-8 text-[13px] text-[var(--bone-dim)]">Выберите товар слева.</div> : <>
            <div className="grid min-w-0 grid-cols-[92px_minmax(0,1fr)] gap-4 border-b border-[rgba(216,214,211,.10)] p-4 sm:p-5">
              <ProductThumb candidate={selectedCandidate} large />
              <div className="min-w-0">
                <div className="eyebrow-dim">Выбранный товар</div>
                <div className="mt-2 break-words text-[16px] leading-snug text-bone">
                  {selectedCandidate.product_title || selectedCandidate.product_slug || selectedCandidate.canonical_product_id}
                </div>
                <div className="mt-2 break-all text-[10px] leading-relaxed text-[var(--smoke)]">
                  Etsy {selectedCandidate.matched_etsy_listing_id || '—'}<br />
                  {selectedCandidate.product_slug || selectedCandidate.canonical_product_id}
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-4 p-4 sm:p-5">
              {detailLoading ? <Notice>Проверяю точные Product Truth, ключи и метрики…</Notice> : null}
              {savedDraftLoading ? <Notice>Загружаю сохранённый SEO-черновик без OpenAI…</Notice> : null}
              {detailError ? <Notice tone="danger">{detailError}</Notice> : null}

              <div className="grid grid-cols-2 gap-2">
                <Fact label="Режим" value={selectedCandidate.generation_mode || '—'} tone={selectedCandidate.ready_for_openai ? 'success' : 'warning'} />
                <Fact label="Validated metrics" value={String(selectedCandidate.validated_metric_count ?? 0)} tone={Number(selectedCandidate.validated_metric_count || 0) > 0 ? 'success' : 'warning'} />
                <Fact label="Выбрано ключей" value={String(selectedCandidate.selected_keyword_count ?? selectedCandidate.useful_keyword_count ?? 0)} />
                <Fact label="Сохранённый draft" value={selectedCandidate.has_saved_draft ? (selectedCandidate.latest_draft_status || 'есть') : 'нет'} />
              </div>

              {selectedCandidate.keyword_selection?.mode === 'auto_recommendation' ? <Notice>
                Approved Keyword Bank подготовил рекомендации, но OpenAI не будет запущен до вашего подтверждения. Откройте Мастер листинга, проверьте авто-фокус, события, стили, персону, аудиторию, стратегии и сохраните keyword decision.
              </Notice> : null}

              {(selectedCandidate.primary_keywords?.length || selectedCandidate.secondary_keywords?.length) ? <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-[.16em] text-[var(--gold-warm)]">Ключи до запуска OpenAI</div>
                <div className="mt-3 space-y-3">
                  <KeywordPreview label="Primary" items={selectedCandidate.primary_keywords} />
                  <KeywordPreview label="Secondary" items={selectedCandidate.secondary_keywords} />
                </div>
              </div> : null}

              {selectedCandidate.portfolio_strategy?.keyword_ownership ? <PortfolioOwnershipNotice
                ownership={selectedCandidate.portfolio_strategy.keyword_ownership}
              /> : null}

              {selectedCandidate.has_saved_draft ? <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">
                Последний сохранённый draft: <span className="text-bone">{selectedCandidate.latest_draft_status || '—'}</span>
                {selectedCandidate.latest_review_status ? <> · review: <span className="text-bone">{selectedCandidate.latest_review_status}</span></> : null}
                {selectedCandidate.latest_draft_at ? <> · {formatDate(selectedCandidate.latest_draft_at)}</> : null}
              </div> : null}

              {selectedCandidate.hard_blockers?.length ? <div className="rounded-xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-4">
                <div className="text-[10px] uppercase tracking-[.16em] text-[var(--gold-warm)]">Почему генерация заблокирована</div>
                <div className="mt-3 space-y-2">
                  {selectedCandidate.hard_blockers.map((code) => <div key={code} className="text-[12px] leading-relaxed text-[var(--bone-dim)]">• {blockerLabel(code)}</div>)}
                </div>
              </div> : <Notice tone="success">Товар прошёл gate для генерации текста{selectedCandidate.ready_for_full_pack ? ' и имеет полный Product Truth' : '; полный SEO Pack останется заблокирован до закрытия Product Truth'}.</Notice>}

              {selectedCandidate.section_blockers?.length ? <details className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
                <summary className="cursor-pointer text-[10px] uppercase tracking-[.15em] text-[var(--gold-warm)]">Ограничения Product Truth</summary>
                <div className="mt-3 space-y-2">{selectedCandidate.section_blockers.map((code) => <div key={code} className="text-[11px] text-[var(--bone-dim)]">• {blockerLabel(code)}</div>)}</div>
              </details> : null}

              {!selectedCandidate.ready_for_openai ? <a
                href={`/admin/listing-master?product_id=${encodeURIComponent(selectedCandidate.canonical_product_id)}`}
                className="btn-gold min-h-12 w-full min-w-0 justify-center px-4 text-center"
              >
                Выбрать фокус и ключи
              </a> : <button
                type="button"
                onClick={run}
                disabled={candidateLoading || detailLoading || detailVerifiedProductId !== selectedProductId || loading || savedDraftLoading || savedSnapshotLoaded}
                className="btn-gold min-h-12 w-full min-w-0 justify-center px-4 text-center disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savedSnapshotLoaded
                  ? 'Сохранённый черновик загружен — новая генерация не нужна'
                  : detailVerifiedProductId !== selectedProductId
                  ? 'Проверяю Product Truth…'
                  : loading
                    ? 'OpenAI генерирует и собирает preview…'
                    : result
                      ? 'Сгенерировать заново'
                      : 'Сгенерировать и показать полный preview'}
              </button>}
              <div className="text-center text-[10px] leading-relaxed text-[var(--smoke)]">Сначала генерация и визуальная проверка; сохранение доступно только после PASS.</div>
            </div>
          </>}
        </section>
      </aside>
    </div>

    <div ref={resultRef} className="scroll-mt-5 min-w-0">
      {result ? <section className={`mb-5 rounded-2xl border p-5 ${draft
        ? 'border-[rgba(108,183,138,.30)] bg-[rgba(108,183,138,.06)]'
        : 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)]'}`}>
        <div className="eyebrow-gold">Результат запуска</div>
        <div className={`mt-2 break-words text-[22px] ${draft ? 'text-[#a9dfbd]' : 'text-[var(--gold-warm)]'}`}>
          {draft
            ? savedSnapshotLoaded
              ? 'Сохранённый черновик загружен — начинайте визуальную проверку'
              : 'Draft получен — начинайте визуальную проверку'
            : 'OpenAI не вернул draft'}
        </div>
        <div className="mt-2 text-[12px] leading-relaxed text-[var(--bone-dim)]">
          HTTP {result.http_status ?? '—'} · {result.status || '—'}
          {result.message ? <> · {result.message}</> : null}
        </div>
        {result.openai_generation?.error ? <div className="mt-3 break-words rounded-xl border border-[rgba(196,64,88,.28)] bg-[rgba(160,32,56,.08)] p-3 text-[12px] leading-relaxed text-[var(--ruby-soft)]">
          {result.openai_generation.error}
        </div> : null}
      </section> : null}

      {draft && storefrontProduct ? <SeoDraftStorefrontPreview product={storefrontProduct} draft={draft} /> : null}

      {assembledPack ? <section className="mt-5 min-w-0 rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
        <div className="eyebrow-gold">Собранный SEO Pack</div>
        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Текущий URL" value={assembledPack.url?.current_path || '—'} />
          <Fact label="Короткий URL-кандидат" value={assembledPack.url?.proposed_path || '—'} tone="warning" />
          <Fact label="Schema" value={assembledPack.structured_data?.product?.['@type'] || '—'} tone="success" />
          <Fact label="Approval gate" value={assembledPack.quality_gate?.ready_for_storage ? 'READY' : 'BLOCKED'} tone={assembledPack.quality_gate?.ready_for_storage ? 'success' : 'warning'} />
        </div>
        <div className="mt-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">
          URL-кандидат не применяется автоматически: сначала обязательны проверка уникальности по каталогу и human review. Product/FAQ schema, image filename proposals, ALT, linking hints и полный validation snapshot собраны детерминированно и не придумываются OpenAI.
        </div>
      </section> : null}

      {draft && commercialValidation ? <section className={`mt-5 rounded-2xl border p-5 ${reviewPass ? 'border-[rgba(108,183,138,.30)] bg-[rgba(108,183,138,.06)]' : 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]'}`}>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow-gold">Итоговый quality gate</div>
            <div className={`mt-2 break-words text-[22px] ${reviewPass ? 'text-[#a9dfbd]' : 'text-[var(--ruby-soft)]'}`}>
              {reviewPass ? 'PASS для ручной проверки' : 'BLOCKED: текст нужно доработать'}
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            {(commercialValidation.benefit_categories_found || []).map((category) => <span key={category} className="rounded-full border border-[rgba(212,178,106,.28)] px-2.5 py-1 text-[9px] uppercase tracking-[.14em] text-[var(--gold-warm)]">{category.replaceAll('_', ' ')}</span>)}
          </div>
        </div>
        {commercialIssues.length ? <div className="mt-4 grid min-w-0 gap-2 md:grid-cols-2">{commercialIssues.map((item, index) => <Issue key={`${item.code}-${index}`} item={item} />)}</div> : <div className="mt-3 text-[12px] text-[#a9dfbd]">Коммерческий текст прошёл проверку на полезность, повторы, пустые фразы и запрещённые обещания.</div>}
        {keywordPlacementValidation ? <div className="mt-4 border-t border-[rgba(216,214,211,.10)] pt-4">
          <div className="text-[10px] uppercase tracking-[.16em] text-[var(--gold-warm)]">Keyword placement · {keywordPlacementValidation.status}</div>
          {keywordPlacementIssues.length ? <div className="mt-3 grid min-w-0 gap-2 md:grid-cols-2">{keywordPlacementIssues.map((item, index) => <Issue key={`${item.code}-${index}`} item={item} />)}</div> : <div className="mt-2 text-[12px] text-[#a9dfbd]">Primary, commercial intent и ALT размещены в разрешённых полях без точного переспама.</div>}
        </div> : null}
        <div className="mt-4 border-t border-[rgba(216,214,211,.10)] pt-4">
          {!reviewPass ? <div className="mb-4 rounded-xl border border-[rgba(212,178,106,.24)] bg-black/20 p-3">
            <button
              type="button"
              onClick={runTargetedRepair}
              disabled={repairing || repairUsed}
              className="btn-ghost min-h-11 w-full justify-center px-4 text-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              {repairing
                ? 'Проверяю и исправляю…'
                : repairUsed
                  ? 'Лимит точечной доработки использован'
                  : 'Исправить замечания — сначала бесплатно'}
            </button>
            <div className="mt-2 text-center text-[10px] leading-relaxed text-[var(--smoke)]">
              Сначала применяются ограниченные детерминированные исправления с 0 токенов. Только если blocker остаётся, выполняется один OpenAI-вызов — без автоматического повтора и сохранения.
            </div>
          </div> : null}
          <button
            type="button"
            onClick={saveAndOpenNext}
            disabled={!reviewPass || saving || savedCurrentResult}
            className="btn-gold min-h-12 w-full justify-center px-4 text-center disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving
              ? 'Сохраняю review draft…'
              : savedCurrentResult
                ? 'Этот результат сохранён'
                : savedSnapshotLoaded
                  ? 'Сохранить новую нормализованную версию'
                : reviewPass
                  ? 'Сохранить и открыть следующий товар'
                  : 'Сохранение доступно после PASS'}
          </button>
          <div className="mt-2 text-center text-[10px] leading-relaxed text-[var(--smoke)]">
            Сохраняется только review draft. Approval, Apply и Publish не выполняются.
          </div>
        </div>
      </section> : null}

      {result ? <div className="mt-5 min-w-0 space-y-5">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <Fact label="HTTP" value={String(result.http_status ?? '—')} />
          <Fact label="Статус" value={String(result.status || '—')} tone={result.ok ? 'success' : 'warning'} />
          <Fact label="Режим данных" value={String(result.readiness?.mode || '—')} tone={result.readiness?.mode === 'READY_FULL' ? 'success' : 'warning'} />
          <Fact label="OpenAI" value={result.openai_generation?.ok ? 'ответ получен' : result.openai_generation?.status || 'не вызван'} tone={result.openai_generation?.ok ? 'success' : 'warning'} />
          <Fact label="Структура" value={structuralValidation?.ok ? 'PASS' : 'BLOCKED'} tone={structuralValidation?.ok ? 'success' : 'warning'} />
          <Fact label="Коммерческий текст" value={commercialValidation?.ok ? 'PASS' : 'BLOCKED'} tone={commercialValidation?.ok ? 'success' : 'warning'} />
        </div>

        {blockers.length ? <Panel title="Блокеры до генерации">
          <div className="grid min-w-0 gap-2 md:grid-cols-2">{blockers.map((item: any, index: number) => <Issue key={`${item.code}-${index}`} item={{ severity: 'blocker', ...item }} />)}</div>
        </Panel> : null}

        <details className="min-w-0 rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4 sm:p-5">
          <summary className="cursor-pointer text-[11px] uppercase tracking-[.18em] text-[var(--gold-warm)]">SEO-поля, ключи и техническая проверка</summary>
          <div className="mt-5 min-w-0 space-y-5">
            {draft ? <Panel title="SEO-поля">
              <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                <TextField label="SEO title" value={draft.seo_title} />
                <TextField label="H1" value={draft.h1} />
                <TextField label="Meta description" value={draft.meta_description} />
                <TextField label="Intro" value={draft.intro} />
              </div>
            </Panel> : null}

            {diagnostics ? <Panel title="Карта ролей ключевых слов">
              <p className="mb-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">Primary обязан появиться естественно в основных SEO-полях. Secondary — семантические кандидаты, а не список для обязательного exact-match: близкие варианты используются только там, где добавляют смысл без переспама. Выбранные event/style/persona/audience должны быть отражены в блоке Ideal for; hold/reject в генерацию не попадают.</p>
              <div className="mb-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Fact label="Найдено" value={String(diagnostics.bank_rows_found ?? 0)} />
                <Fact label="Trusted metrics" value={String(diagnostics.trusted_metric_rows ?? 0)} />
                <Fact label="Usable candidates" value={String(diagnostics.useful_candidate_rows ?? 0)} />
                <Fact label="Validated usable" value={String(diagnostics.useful_validated_rows ?? 0)} tone={Number(diagnostics.useful_validated_rows || 0) > 0 ? 'success' : 'warning'} />
              </div>
              <div className="grid min-w-0 gap-2 md:grid-cols-2">
                {(diagnostics.selected_keywords || []).map((item: any, index: number) => <div key={`${item.keyword}-${index}`} className="min-w-0 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
                  <div className="break-words text-[13px] text-bone">{item.keyword || '—'}</div>
                  <div className="mt-1 break-words text-[11px] text-[var(--bone-dim)]">role: {item.role || '—'} · volume: {item.avg_monthly_searches ?? '—'} · competition: {item.competition || '—'}</div>
                  <div className="mt-1 break-words text-[10px] text-[var(--smoke)]">{item.metric_source || '—'} · {item.last_checked || '—'}</div>
                </div>)}
              </div>
            </Panel> : null}

            {alts.length ? <Panel title="ALT для изображений">
              <ul className="min-w-0 space-y-2">{alts.map((item: any, index: number) => <li key={`${item.alt_text}-${index}`} className="min-w-0 break-words rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3 text-[12px] text-[var(--bone-dim)]">{item.alt_text || '—'} <span className="text-[var(--smoke)]">· {item.truth_basis || '—'}</span></li>)}</ul>
            </Panel> : null}

            {structuralValidation ? <Panel title="Структурный validator">
              <div className="mb-3 grid min-w-0 gap-3 sm:grid-cols-2">
                <Fact label="Результат" value={structuralValidation.ok ? 'PASS' : 'BLOCKED'} tone={structuralValidation.ok ? 'success' : 'warning'} />
                <Fact label="Замечаний" value={String(structuralIssues.length)} tone={structuralIssues.length ? 'warning' : 'success'} />
              </div>
              {structuralIssues.length ? <div className="grid min-w-0 gap-2 md:grid-cols-2">{structuralIssues.map((item: any, index: number) => <Issue key={`${item.code}-${index}`} item={item} />)}</div> : <div className="text-[12px] text-[#a9dfbd]">Структурных ошибок не найдено.</div>}
            </Panel> : null}

            <details className="min-w-0 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-4">
              <summary className="cursor-pointer text-[10px] uppercase tracking-[.16em] text-[var(--smoke)]">Полный JSON</summary>
              <pre className="mt-3 max-h-[500px] max-w-full overflow-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-[var(--bone-dim)]">{JSON.stringify(result, null, 2)}</pre>
            </details>
          </div>
        </details>
      </div> : null}
    </div>
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

function parseResponsePayload(text: string, fallbackError: string) {
  try {
    const parsed = JSON.parse(text || '{}');
    return parsed && typeof parsed === 'object' ? parsed : { error: fallbackError };
  } catch {
    return { error: fallbackError };
  }
}

function normalizeSearch(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function blockerShort(values?: string[]) {
  const first = values?.[0];
  if (!first) return 'Требует проверки';
  if (first.includes('portfolio')) return 'Конфликт Primary';
  if (first.includes('keyword_metric')) return 'Нет валидной метрики';
  if (first.includes('keyword')) return 'Нет выбранных ключей';
  if (first.includes('mismatch')) return 'Конфликт товара';
  if (first.includes('catalog')) return 'Нет в витрине';
  if (first.includes('title')) return 'Нет названия';
  return 'Есть блокеры';
}

function blockerLabel(code) {
  const labels = {
    missing_primary_or_secondary_keyword: 'Не выбран релевантный primary или secondary keyword.',
    missing_validated_keyword_metric: 'Ни у одного выбранного ключа нет доверенного validated metric snapshot.',
    keyword_selection_not_human_confirmed: 'Нужно проверить авто-фокус и сохранить keyword decision в Мастере листинга.',
    draft_status_blocked_by_product_mismatch: 'SEO draft заблокирован из-за несоответствия данных товара.',
    latest_draft_blocked_by_product_mismatch: 'Последний сохранённый draft заблокирован из-за product mismatch.',
    missing_storefront_catalog_product: 'Товар отсутствует в текущем storefront-каталоге.',
    missing_product_title: 'У товара отсутствует рабочее название.',
    missing_product_slug: 'У товара отсутствует product slug.',
    insufficient_product_identity_evidence: 'Недостаточно подтверждённых данных для идентификации товара.',
    composition_missing_canonical_product_truth: 'Canonical Product Truth ещё не доступен для состава товара.',
    composition_missing_confirmed_components: 'Нет подтверждённых included components.',
    composition_has_unresolved_facts: 'В составе товара остались нерешённые факты.',
    composition_has_review_blockers: 'Есть блокеры component mapping review.',
    qa_blocker_forbidden_mismatch: 'QA обнаружил запрещённое несоответствие товара.',
    qa_blocker_product_specificity: 'QA не подтвердил достаточную специфичность текста.',
    qa_blocker_validated_metrics: 'QA не подтвердил валидированные метрики.',
    portfolio_strategy_missing: 'Не удалось загрузить обязательную стратегию портфеля до запуска OpenAI.',
    primary_keyword_portfolio_conflict: 'Этот же Primary уже выбран для другого товара. Один главный поисковый интент должен принадлежать одной странице.',
    primary_keyword_portfolio_map_unavailable: 'Не удалось проверить текущих владельцев Primary. OpenAI не вызван, чтобы не создать каннибализацию.',
    primary_keyword_peer_reassignment_pending: 'Этот товар сохраняет Primary, но конфликтующему товару нужен новый whole-product Primary до публикации.',
  };
  return labels[code] || String(code || 'Неизвестный блокер').replaceAll('_', ' ');
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '—');
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function ProductThumb({ candidate, large = false }: { candidate: Candidate; large?: boolean }) {
  const size = large ? 'h-[112px] w-[92px]' : 'h-[82px] w-[68px]';
  return <div className={`${size} shrink-0 overflow-hidden rounded-lg border border-[rgba(216,214,211,.12)] bg-[linear-gradient(145deg,#1a1720,#09090c)]`}>
    {candidate.primary_image_url ? <img
      src={candidate.primary_image_url}
      alt={candidate.primary_image_alt || candidate.product_title || 'Product'}
      className="h-full w-full object-cover"
      loading="lazy"
    /> : <div className="flex h-full w-full items-center justify-center px-2 text-center text-[9px] uppercase tracking-[.12em] text-[var(--smoke)]">Нет фото</div>}
  </div>;
}

function FilterButton({ active, onClick, children }) {
  return <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[.13em] transition ${active
      ? 'border-[rgba(212,178,106,.65)] bg-[rgba(212,178,106,.13)] text-[var(--gold-warm)]'
      : 'border-[rgba(216,214,211,.13)] text-[var(--bone-dim)] hover:border-[rgba(216,214,211,.30)] hover:text-bone'}`}
  >{children}</button>;
}

function StatusBadge({ children, tone = 'neutral' }) {
  const cls = tone === 'success'
    ? 'border-[rgba(108,183,138,.28)] bg-[rgba(108,183,138,.08)] text-[#a9dfbd]'
    : tone === 'warning'
      ? 'border-[rgba(212,178,106,.26)] bg-[rgba(212,178,106,.07)] text-[var(--gold-warm)]'
      : tone === 'tested'
        ? 'border-[rgba(150,140,210,.25)] bg-[rgba(120,100,190,.08)] text-[#c9c1ef]'
        : 'border-[rgba(216,214,211,.13)] bg-white/[.025] text-[var(--bone-dim)]';
  return <span className={`max-w-full truncate rounded-full border px-2 py-1 text-[8px] uppercase tracking-[.10em] ${cls}`}>{children}</span>;
}

function KeywordPreview({ label, items = [] }: { label: string; items?: Array<Record<string, any>> }) {
  if (!items.length) return null;
  return <div className="min-w-0">
    <div className="text-[9px] uppercase tracking-[.14em] text-[var(--smoke)]">{label}</div>
    <div className="mt-1.5 flex min-w-0 flex-wrap gap-1.5">
      {items.slice(0, 5).map((item, index) => <span
        key={`${item.keyword || item.keyword_norm}-${index}`}
        className="max-w-full rounded-full border border-[rgba(216,214,211,.13)] bg-white/[.025] px-2 py-1 text-[9px] leading-snug text-[var(--bone-dim)]"
        title={`volume ${item.avg_monthly_searches ?? '—'} · competition ${item.competition || '—'}`}
      >
        {item.keyword || item.keyword_norm || '—'}
      </span>)}
    </div>
  </div>;
}

function PortfolioOwnershipNotice({ ownership }: { ownership: Record<string, any> }) {
  const conflicts = Array.isArray(ownership?.conflicts) ? ownership.conflicts : [];
  const alternatives = Array.isArray(ownership?.suggested_primary_alternatives)
    ? ownership.suggested_primary_alternatives
    : [];
  const primary = ownership?.primary_keyword || ownership?.primary_keyword_norm || '—';

  if (ownership?.status === 'pass') {
    return <Notice tone="success">
      Primary <span className="text-bone">“{primary}”</span> свободен среди {ownership.compared_product_count || 0} других текущих решений Listing Master. Это разрешает генерацию, но не заменяет последующую проверку похожести готовых текстов.
    </Notice>;
  }

  if (ownership?.status === 'pass_with_pending_reassignment') {
    return <div className="rounded-xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-4">
      <div className="text-[10px] uppercase tracking-[.16em] text-[var(--gold-warm)]">Primary закреплён за этим товаром</div>
      <p className="mt-2 text-[12px] leading-relaxed text-[var(--bone-dim)]">
        Текущее подтверждённое решение сохраняет <span className="text-bone">“{primary}”</span> за выбранной карточкой. Генерация разрешена; публикация останется закрыта, пока устаревшее решение другой карточки не получит новый whole-product Primary.
      </p>
      <div className="mt-3 space-y-2">
        {conflicts.map((item: Record<string, any>) => <a
          key={`${item.canonical_product_id}-${item.keyword_norm}`}
          href={`/admin/listing-master?product_id=${encodeURIComponent(item.canonical_product_id)}`}
          className="block rounded-lg border border-[rgba(216,214,211,.10)] bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)] hover:text-bone"
        >
          Требует нового Primary до публикации: Etsy {item.matched_etsy_listing_id || '—'} · статус текущей проверки {item.current_selection_status || 'не проверен'}
        </a>)}
      </div>
    </div>;
  }

  if (ownership?.status === 'not_checked') {
    return <Notice tone="danger">
      Карта владельцев Primary сейчас недоступна. OpenAI не будет вызван, пока read-only проверка не вернёт достоверный результат.
    </Notice>;
  }

  return <div className="rounded-xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-4">
    <div className="text-[10px] uppercase tracking-[.16em] text-[var(--ruby-soft)]">Конфликт владельца Primary</div>
    <p className="mt-2 text-[12px] leading-relaxed text-[var(--bone-dim)]">
      Фраза <span className="text-bone">“{primary}”</span> уже выбрана главным ключом другой карточки. До решения конфликта OpenAI не вызывается и токены не расходуются.
    </p>
    <div className="mt-3 space-y-2">
      {conflicts.map((item: Record<string, any>) => <a
        key={`${item.canonical_product_id}-${item.keyword_norm}`}
        href={`/admin/listing-master?product_id=${encodeURIComponent(item.canonical_product_id)}`}
        className="block rounded-lg border border-[rgba(216,214,211,.10)] bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-[var(--bone-dim)] hover:border-[rgba(212,178,106,.35)] hover:text-bone"
      >
        Конфликтующий товар: Etsy {item.matched_etsy_listing_id || '—'} · {item.product_slug || item.canonical_product_id}
      </a>)}
    </div>
    {alternatives.length ? <div className="mt-4">
      <div className="text-[9px] uppercase tracking-[.14em] text-[var(--smoke)]">Безопасные кандидаты для ручного выбора у этого товара</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {alternatives.map((item: Record<string, any>) => <span
          key={item.keyword_norm || item.keyword}
          className="rounded-full border border-[rgba(212,178,106,.25)] bg-black/20 px-2.5 py-1 text-[9px] text-[var(--gold-warm)]"
          title={`volume ${item.avg_monthly_searches ?? '—'} · competition ${item.competition || '—'} · ${item.metric_source || '—'}`}
        >
          {item.keyword} · {item.avg_monthly_searches ?? '—'}/мес
        </span>)}
      </div>
    </div> : null}
  </div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4 sm:p-5">
    <div className="mb-4 text-[11px] uppercase tracking-[.18em] text-[var(--gold-warm)]">{title}</div>
    {children}
  </section>;
}

function Fact({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: string }) {
  const cls = tone === 'success' ? 'text-[#a9dfbd]' : tone === 'warning' ? 'text-[var(--gold-warm)]' : 'text-bone';
  return <div className="min-w-0 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
    <div className="truncate text-[9px] uppercase tracking-[.14em] text-[var(--smoke)]">{label}</div>
    <div className={`mt-1 break-words text-[12px] ${cls}`}>{value}</div>
  </div>;
}

function TextField({ label, value }: { label: string; value?: string | null }) {
  return <div className="min-w-0 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-4">
    <div className="text-[9px] uppercase tracking-[.17em] text-[var(--smoke)]">{label}</div>
    <div className="mt-2 break-words text-[13px] leading-relaxed text-bone">{value || '—'}</div>
  </div>;
}

function Issue({ item }: { item: Record<string, any> }) {
  return <div className="min-w-0 rounded-xl border border-[rgba(212,178,106,.22)] bg-black/20 p-3">
    <div className="break-words text-[11px] text-[var(--gold-warm)]">{item.severity || 'warning'}: {item.code || 'unknown'}</div>
    <div className="mt-1 break-words text-[11px] leading-relaxed text-[var(--bone-dim)]">{item.message || blockerLabel(item.code) || '—'}</div>
  </div>;
}

function Notice({ children, tone = 'warning' }: { children: React.ReactNode; tone?: string }) {
  const cls = tone === 'danger'
    ? 'border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] text-[var(--ruby-soft)]'
    : tone === 'success'
      ? 'border-[rgba(108,183,138,.30)] bg-[rgba(108,183,138,.07)] text-[#a9dfbd]'
      : 'border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] text-[var(--gold-warm)]';
  return <div className={`min-w-0 break-words rounded-2xl border p-4 text-[12px] leading-relaxed ${cls}`}>{children}</div>;
}
