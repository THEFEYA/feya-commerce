'use client';

import { useMemo, useState } from 'react';

type StorageHealth = {
  ok?: boolean;
  status?: string;
  checked_objects?: Array<{ kind?: string; name?: string; ok?: boolean; status?: string; error_code?: string | null; error_message?: string | null; count?: number | null }>;
  missing_objects?: string[];
  note?: string;
};

type SavePreflightResult = {
  ok?: boolean;
  status?: string;
  blocked?: boolean;
  blockers?: Array<{ code?: string; message?: string }>;
  readiness?: Record<string, unknown>;
  feature_flag?: { name?: string; enabled?: boolean };
  dry_run?: boolean;
  error?: string;
  validation_result?: { ok?: boolean; status?: string; issues?: Array<{ code?: string; severity?: string; message?: string }> };
  storage_payload_summary?: Record<string, unknown> | null;
  storage_contract?: Record<string, unknown>;
  storage_health?: StorageHealth;
  saved_draft?: Record<string, unknown> | null;
  saved_event?: Record<string, unknown> | null;
  guardrails?: string[];
  message?: string;
};

export default function SeoDraftSavePreflightClient({ productId }: { productId: string }) {
  const [loadingMode, setLoadingMode] = useState<'check' | 'save' | null>(null);
  const [result, setResult] = useState<SavePreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusTone = useMemo(() => {
    const status = String(result?.status || '').toLowerCase();
    if (!result) return 'neutral';
    if (result.ok && status.includes('saved')) return 'success';
    if (status.includes('blocked') || status.includes('missing') || status.includes('not_found')) return 'warning';
    if (result.ok) return 'success';
    return 'warning';
  }, [result]);

  async function runSaveRequest(mode: 'check' | 'save') {
    if (!productId || loadingMode) return;
    setLoadingMode(mode);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/admin/seo-engine/draft-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, dry_run: mode === 'check', include_payload: false }),
      });
      const payload = await response.json().catch(() => ({}));
      setResult({ ...payload, http_status: response.status } as SavePreflightResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка проверки сохранения');
    } finally {
      setLoadingMode(null);
    }
  }

  const storageHealth = result?.storage_health || null;
  const actualInsertEnabled = result?.readiness?.actual_insert_enabled === true;
  const draftSaved = result?.status === 'draft_saved_for_review' && Boolean(result?.saved_draft);

  return <div className="rounded-2xl border border-[rgba(212,178,106,.24)] bg-[rgba(212,178,106,.055)] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="eyebrow-gold mb-1">Проверка сохранения черновика</div>
        <div className="max-w-3xl text-[12px] leading-relaxed text-[var(--bone-dim)]">
          Проверяет и, когда включён флаг, сохраняет SEO-черновик в Supabase. Сохранение создаёт review draft + event, но не публикует товар и не меняет storefront/product tables.
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runSaveRequest('check')}
          disabled={!productId || Boolean(loadingMode)}
          className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingMode === 'check' ? 'Проверяю сохранение…' : 'Проверить сохранение черновика'}
        </button>
        <button
          type="button"
          onClick={() => runSaveRequest('save')}
          disabled={!productId || Boolean(loadingMode)}
          className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingMode === 'save' ? 'Пробую сохранить…' : 'Сохранить черновик для проверки'}
        </button>
      </div>
    </div>

    <div className="mt-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">
      <span className="text-bone">Безопасность:</span> кнопка сохранения сработает только если в Vercel включён флаг <span className="text-[var(--gold-warm)]">FEYA_SEO_DRAFT_STORAGE_ENABLED=true</span>, SQL виден приложению, validator пропускает черновик и есть service-role доступ. Иначе она покажет причину блокировки.
    </div>

    {error ? <div className="mt-3 rounded-lg border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-2.5 text-[11px] text-[var(--ruby-soft)]">{error}</div> : null}

    {result ? <div className="mt-4 space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <SaveFact label="Статус" value={translateStatus(result.status || 'unknown')} tone={statusTone} />
        <SaveFact label="HTTP" value={String((result as any).http_status || '—')} />
        <SaveFact label="Режим проверки" value={result.dry_run === false ? 'выключен' : 'включён'} />
        <SaveFact label="Запись включена" value={result.feature_flag?.enabled ? 'да' : 'нет'} />
      </div>

      {draftSaved ? <div className="rounded-xl border border-[rgba(108,183,138,.30)] bg-[rgba(108,183,138,.08)] p-3">
        <div className="text-[11px] uppercase tracking-[0.16em] text-[#a9dfbd]">Черновик сохранён для проверки</div>
        <div className="mt-2 grid md:grid-cols-2 gap-2">
          <SaveFact label="ID черновика" value={String(result.saved_draft?.id || '—')} tone="success" />
          <SaveFact label="Событие" value={String(result.saved_event?.event_type || '—')} tone="success" />
        </div>
        <div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">Это только review draft. Публикация и approve for publish не выполнялись.</div>
      </div> : null}

      {storageHealth ? <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Проверка SQL storage contract</div>
        <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${storageHealth.ok ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]' : 'border-[rgba(212,178,106,.35)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.08)]'}`}>{storageHealth.ok ? 'SQL применён' : 'SQL не применён полностью'}</span>
            <span className="text-[11px] leading-relaxed text-[var(--bone-dim)]">{translateStorageStatus(storageHealth.status || 'unknown')}</span>
          </div>
          {storageHealth.note ? <div className="mb-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">{storageHealth.note}</div> : null}
          <div className="grid md:grid-cols-2 gap-2">
            {(storageHealth.checked_objects || []).map((item) => <div key={item.name} className="rounded-lg border border-[rgba(216,214,211,.09)] bg-black/20 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-bone">{translateObjectName(item.name || 'object')}</div>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${item.ok ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd]' : 'border-[rgba(212,178,106,.35)] text-[var(--gold-warm)]'}`}>{item.ok ? 'есть' : 'нет'}</span>
              </div>
              {item.error_message ? <div className="mt-1.5 text-[10px] leading-relaxed text-[var(--bone-dim)]">{item.error_code ? `${item.error_code}: ` : ''}{item.error_message}</div> : null}
            </div>)}
          </div>
        </div>
      </div> : null}

      {result.blockers?.length ? <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Что блокирует сохранение</div>
        <div className="grid md:grid-cols-2 gap-2">{result.blockers.map((blocker, index) => <div key={`${blocker.code}-${index}`} className="rounded-xl border border-[rgba(212,178,106,.22)] bg-black/20 p-3">
          <div className="text-[11px] text-[var(--gold-warm)]">{translateBlocker(blocker.code || 'blocker')}</div>
          <div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">{blocker.message || 'Нужна проверка.'}</div>
        </div>)}</div>
      </div> : null}

      {result.readiness ? <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Готовность слоя сохранения</div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(result.readiness).map(([key, value]) => <SaveFact key={key} label={translateReadinessKey(key)} value={translateValue(value)} tone={key === 'actual_insert_enabled' && actualInsertEnabled ? 'success' : 'neutral'} />)}
        </div>
      </div> : null}

      {result.storage_payload_summary ? <div>
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Что будет сохранено потом</div>
        <pre className="max-h-[240px] overflow-auto rounded-xl border border-[rgba(216,214,211,.10)] bg-black/25 p-3 text-[10px] leading-relaxed text-[var(--bone-dim)] whitespace-pre-wrap">{JSON.stringify(result.storage_payload_summary, null, 2)}</pre>
      </div> : null}

      <details className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
        <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Полный JSON проверки сохранения</summary>
        <pre className="mt-2 max-h-[360px] overflow-auto text-[10px] leading-relaxed text-[var(--bone-dim)] whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div> : null}
  </div>;
}

function SaveFact({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: string }) {
  const valueClass = tone === 'success'
    ? 'text-[#a9dfbd]'
    : tone === 'warning'
      ? 'text-[var(--gold-warm)]'
      : 'text-bone';
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-2.5">
    <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1">{label}</div>
    <div className={`text-[12px] leading-snug ${valueClass}`}>{value}</div>
  </div>;
}

function translateStatus(status: string) {
  const map: Record<string, string> = {
    blocked_before_storage_write: 'заблокировано до записи',
    draft_saved_for_review: 'черновик сохранён для проверки',
    storage_write_failed: 'ошибка записи в Supabase',
    storage_write_not_implemented_yet: 'запись ещё не реализована',
    missing_product_id: 'нет product_id',
    product_not_found: 'товар не найден',
    blocked_missing_supabase_env: 'нет Supabase env',
  };
  return map[status] || status;
}

function translateBlocker(code: string) {
  const map: Record<string, string> = {
    feature_flag_disabled: 'флаг сохранения выключен',
    dry_run_only: 'режим только проверки',
    missing_service_role_client: 'нет service-role доступа',
    storage_contract_not_applied: 'SQL storage contract ещё не применён',
    output_validation_not_passing: 'validator не пропускает черновик',
    insert_flow_not_enabled: 'реальная запись ещё не включена',
  };
  return map[code] || code;
}

function translateReadinessKey(key: string) {
  const map: Record<string, string> = {
    has_service_role_client: 'service-role доступ',
    storage_feature_flag_enabled: 'флаг сохранения',
    storage_contract_applied: 'SQL применён',
    storage_contract_missing: 'чего не хватает в SQL',
    output_validation_status: 'статус validator',
    output_validation_ok: 'validator пропускает',
    payload_ready: 'payload готов',
    actual_insert_enabled: 'реальная запись',
  };
  return map[key] || key;
}

function translateStorageStatus(status: string) {
  const map: Record<string, string> = {
    storage_contract_detected: 'таблицы и views storage contract видны приложению',
    storage_contract_incomplete: 'часть таблиц/views отсутствует или недоступна',
    missing_service_role_client: 'нельзя проверить без service-role доступа',
  };
  return map[status] || status;
}

function translateObjectName(name: string) {
  const map: Record<string, string> = {
    feya_commerce_seo_pack_drafts_v1: 'таблица SEO-черновиков',
    feya_commerce_seo_pack_draft_events_v1: 'таблица истории черновиков',
    feya_commerce_v_seo_pack_drafts_latest_v1: 'view последнего черновика',
    feya_commerce_v_seo_pack_review_queue_v1: 'view очереди проверки',
  };
  return map[name] || name;
}

function translateValue(value: unknown) {
  if (value === true) return 'да';
  if (value === false) return 'нет';
  if (Array.isArray(value)) return value.length ? value.map((item) => translateObjectName(String(item))).join(', ') : 'ничего';
  if (value == null) return '—';
  return String(value);
}
