'use client';

import Link from 'next/link';
import { useState } from 'react';

type ValidationIssue = { code?: string; severity?: string; message?: string };

type GeneratedDraftOutput = {
  contract_version?: string;
  status?: string;
  seo_title?: string | null;
  h1?: string | null;
  meta_description?: string | null;
  intro?: string | null;
  bullet_highlights?: string[];
  faq?: Array<{ question?: string; answer?: string; intent?: string }>;
  image_alt_candidates?: Array<{ alt_text?: string; truth_basis?: string; image_role?: string }>;
  internal_linking_hints?: Array<{ anchor?: string; target_type?: string; reason?: string }>;
  qa_self_report?: Record<string, unknown>;
  generation_notes?: string[];
};

type AiDraftResult = {
  ok?: boolean;
  status?: string;
  blocked?: boolean;
  mode?: string;
  message?: string;
  blockers?: Array<{ code?: string; message?: string }>;
  readiness?: Record<string, unknown>;
  feature_flag?: { name?: string; enabled?: boolean };
  openai_generation?: { ok?: boolean; status?: string; model?: string; response_id?: string | null; error?: string | null; has_output?: boolean };
  generated_draft_output?: GeneratedDraftOutput | null;
  generated_draft_validation?: { ok?: boolean; status?: string; issues?: ValidationIssue[] };
};

type SaveResult = {
  ok?: boolean;
  status?: string;
  blocked?: boolean;
  message?: string;
  blockers?: Array<{ code?: string; message?: string }>;
  saved_draft?: { id?: string; source_mode?: string; status?: string; review_status?: string; created_at?: string } | null;
  saved_event?: { id?: string; event_type?: string; created_at?: string } | null;
  readiness?: Record<string, unknown>;
  validation_result?: { ok?: boolean; status?: string; issues?: ValidationIssue[] };
};

export default function SeoAiDraftGenerateClient({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AiDraftResult | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function generateDraft() {
    if (!productId || loading) return;
    setLoading(true);
    setResult(null);
    setSaveResult(null);
    setError(null);
    setSaveError(null);
    try {
      const response = await fetch('/api/admin/seo-engine/draft-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          dry_run: false,
          include_mock_output: false,
          include_prompt: false,
          require_portfolio_strategy: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      setResult({ ...payload, http_status: response.status } as AiDraftResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка генерации AI-черновика');
    } finally {
      setLoading(false);
    }
  }

  async function saveGeneratedDraft() {
    if (!productId || !draft || saving) return;
    setSaving(true);
    setSaveResult(null);
    setSaveError(null);
    try {
      const response = await fetch('/api/admin/seo-engine/draft-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          dry_run: false,
          source_mode: 'openai_draft',
          agent_output: draft,
          include_payload: false,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      setSaveResult({ ...payload, http_status: response.status } as SaveResult);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Неизвестная ошибка сохранения AI-черновика');
    } finally {
      setSaving(false);
    }
  }

  const draft = result?.generated_draft_output || null;
  const validation = result?.generated_draft_validation || null;
  const issues = validation?.issues || [];
  const blocked = Boolean(result?.blocked) || !result?.ok;
  const canSaveGeneratedDraft = Boolean(draft && validation?.ok && !saveResult?.ok);

  return <div className="rounded-2xl border border-[rgba(212,178,106,.24)] bg-[rgba(212,178,106,.055)] p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="eyebrow-gold mb-1">Реальная генерация AI-черновика</div>
        <div className="max-w-3xl text-[12px] leading-relaxed text-[var(--bone-dim)]">
          Эта кнопка вызывает OpenAI только на сервере и возвращает новый SEO-черновик для проверки. Она не сохраняет текст в Supabase, не публикует товар и не меняет storefront/product tables.
        </div>
      </div>
      <button
        type="button"
        onClick={generateDraft}
        disabled={!productId || loading}
        className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Генерирую AI-черновик…' : 'Сгенерировать AI-черновик'}
      </button>
    </div>

    <div className="mt-3 rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3 text-[11px] leading-relaxed text-[var(--bone-dim)]">
      Безопасность: генерация сработает только если в Vercel Preview включён <span className="text-[var(--gold-warm)]">FEYA_SEO_AI_GENERATION_ENABLED=true</span>, есть серверный <span className="text-[var(--gold-warm)]">OPENAI_API_KEY</span>, стратегия портфеля загружена и validator готов. Даже при успехе это только черновик на экране.
    </div>

    {error ? <Alert tone="danger">{error}</Alert> : null}

    {result ? <div className="mt-4 space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <MiniFact label="Статус" value={translateStatus(result.status || 'unknown')} tone={blocked ? 'warning' : 'success'} />
        <MiniFact label="HTTP" value={String((result as any).http_status || '—')} />
        <MiniFact label="OpenAI" value={result.openai_generation?.ok ? 'ответ получен' : result.openai_generation?.status || 'не вызван'} tone={result.openai_generation?.ok ? 'success' : 'warning'} />
        <MiniFact label="Модель" value={result.openai_generation?.model || '—'} />
      </div>

      {result.blockers?.length ? <BlockerGrid title="Что сейчас блокирует генерацию" blockers={result.blockers} /> : null}

      {result.openai_generation?.error ? <Alert tone="danger">{translateOpenAiError(result.openai_generation.error)}</Alert> : null}

      {draft ? <div className="rounded-xl border border-[rgba(108,183,138,.28)] bg-[rgba(108,183,138,.07)] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#a9dfbd]">AI-черновик создан, но ещё не сохранён</div>
          <button
            type="button"
            onClick={saveGeneratedDraft}
            disabled={!canSaveGeneratedDraft || saving}
            className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Сохраняю AI-черновик…' : saveResult?.ok ? 'AI-черновик уже сохранён' : 'Сохранить AI-черновик в очередь проверки'}
          </button>
        </div>
        <div className="grid lg:grid-cols-[1fr_.8fr] gap-3">
          <div className="space-y-2">
            <PreviewField label="SEO-заголовок" value={draft.seo_title} />
            <PreviewField label="H1-заголовок" value={draft.h1} />
            <PreviewField label="Описание для Google" value={draft.meta_description} />
            <PreviewField label="Первый абзац" value={draft.intro} />
          </div>
          <div className="space-y-2">
            <PreviewList label="Тезисы" items={draft.bullet_highlights || []} />
            <PreviewFaq items={draft.faq || []} />
            <PreviewList label="ALT для изображений" items={(draft.image_alt_candidates || []).map((item) => `${item.alt_text || 'ALT требует проверки'} · ${translateTruthBasis(item.truth_basis)}`)} />
            <PreviewList label="Заметки генерации" items={draft.generation_notes || []} />
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-[rgba(216,214,211,.10)] bg-black/20 p-2 text-[11px] text-[var(--bone-dim)]">
          Сохранение создаёт только review draft и audit event. Публикация, изменение товара и применение к storefront остаются заблокированы.
        </div>
      </div> : null}

      {validation ? <div className="grid sm:grid-cols-2 gap-2">
        <MiniFact label="Validator" value={translateValidation(validation.status || 'unknown')} tone={validation.ok ? 'success' : 'warning'} />
        <MiniFact label="Замечаний" value={String(issues.length)} tone={issues.length ? 'warning' : 'success'} />
      </div> : null}

      {issues.length ? <div className="rounded-xl border border-[rgba(212,178,106,.24)] bg-black/20 p-3">
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Замечания validator по AI-ответу</div>
        <div className="grid md:grid-cols-2 gap-2">
          {issues.slice(0, 12).map((issue, index) => <div key={`${issue.code}-${index}`} className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/20 p-2.5">
            <div className="text-[11px] text-[var(--gold-warm)]">{translateIssueCode(issue.code || 'issue')}</div>
            <div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">{translateIssueMessage(issue.message || 'Нужна проверка.')}</div>
          </div>)}
        </div>
        {issues.length > 12 ? <div className="mt-2 text-[11px] text-[var(--bone-dim)]">Показано 12 из {issues.length}. Полный список есть в JSON ниже.</div> : null}
      </div> : null}

      {saveError ? <Alert tone="danger">{saveError}</Alert> : null}

      {saveResult ? <div className={`rounded-xl border p-3 ${saveResult.ok ? 'border-[rgba(108,183,138,.30)] bg-[rgba(108,183,138,.07)]' : 'border-[rgba(212,178,106,.28)] bg-black/20'}`}>
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Результат сохранения AI-черновика</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <MiniFact label="Статус" value={translateSaveStatus(saveResult.status || 'unknown')} tone={saveResult.ok ? 'success' : 'warning'} />
          <MiniFact label="ID черновика" value={saveResult.saved_draft?.id || '—'} />
          <MiniFact label="Источник" value={translateSourceMode(saveResult.saved_draft?.source_mode || '—')} />
          <MiniFact label="Событие" value={translateEvent(saveResult.saved_event?.event_type || '—')} />
        </div>
        {saveResult.blockers?.length ? <div className="mt-3"><BlockerGrid title="Что блокирует сохранение" blockers={saveResult.blockers} /></div> : null}
        {saveResult.ok ? <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/seo-approval" className="btn-ghost">Открыть очередь проверки</Link>
          <div className="rounded-full border border-[rgba(108,183,138,.30)] px-4 py-2 text-[11px] text-[#a9dfbd]">Сохранено безопасно: без публикации</div>
        </div> : null}
      </div> : null}

      <details className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
        <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">Полный JSON ответа генерации</summary>
        <pre className="mt-2 max-h-[360px] overflow-auto text-[10px] leading-relaxed text-[var(--bone-dim)] whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div> : null}
  </div>;
}

function Alert({ children, tone }: { children: React.ReactNode; tone: 'danger' | 'warning' }) {
  const className = tone === 'danger'
    ? 'border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] text-[var(--ruby-soft)]'
    : 'border-[rgba(212,178,106,.28)] bg-black/20 text-[var(--gold-warm)]';
  return <div className={`mt-3 rounded-lg border p-2.5 text-[11px] leading-relaxed ${className}`}>{children}</div>;
}

function BlockerGrid({ title, blockers }: { title: string; blockers: Array<{ code?: string; message?: string }> }) {
  return <div>
    <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">{title}</div>
    <div className="grid md:grid-cols-2 gap-2">{blockers.map((blocker, index) => <div key={`${blocker.code}-${index}`} className="rounded-xl border border-[rgba(212,178,106,.22)] bg-black/20 p-3">
      <div className="text-[11px] text-[var(--gold-warm)]">{translateBlocker(blocker.code || 'blocker')}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-[var(--bone-dim)]">{translateMessage(blocker.message || 'Нужна проверка.')}</div>
    </div>)}</div>
  </div>;
}

function MiniFact({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: string }) {
  const valueClass = tone === 'success' ? 'text-[#a9dfbd]' : tone === 'warning' ? 'text-[var(--gold-warm)]' : 'text-bone';
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-2.5">
    <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1">{label}</div>
    <div className={`text-[12px] leading-snug break-words ${valueClass}`}>{value}</div>
  </div>;
}

function PreviewField({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/20 p-2.5">
    <div className="mb-1 text-[9px] uppercase tracking-[0.16em] text-[var(--smoke)]">{label}</div>
    <div className="text-[12px] leading-relaxed text-bone">{value || '—'}</div>
  </div>;
}

function PreviewList({ label, items }: { label: string; items: string[] }) {
  return <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/20 p-2.5">
    <div className="mb-1 text-[9px] uppercase tracking-[0.16em] text-[var(--smoke)]">{label}</div>
    {items.length ? <ul className="list-disc pl-4 space-y-1 text-[12px] leading-relaxed text-[var(--bone-dim)]">{items.map((item, index) => <li key={`${label}-${index}`}>{item}</li>)}</ul> : <div className="text-[12px] text-[var(--bone-dim)]">—</div>}
  </div>;
}

function PreviewFaq({ items }: { items: Array<{ question?: string; answer?: string; intent?: string }> }) {
  return <div className="rounded-lg border border-[rgba(216,214,211,.10)] bg-black/20 p-2.5">
    <div className="mb-1 text-[9px] uppercase tracking-[0.16em] text-[var(--smoke)]">Частые вопросы</div>
    {items.length ? <div className="space-y-2 text-[12px] leading-relaxed text-[var(--bone-dim)]">{items.map((item, index) => <div key={`${item.question}-${index}`}>
      <div className="text-bone">{item.question || 'Вопрос требует проверки'}</div>
      <div>{item.answer || 'Ответ требует проверки'}</div>
    </div>)}</div> : <div className="text-[12px] text-[var(--bone-dim)]">—</div>}
  </div>;
}

function translateStatus(status: string) {
  const map: Record<string, string> = {
    blocked_before_generation: 'генерация заблокирована до запуска',
    ai_draft_generated_not_saved: 'AI-черновик создан, но не сохранён',
    generated_output_failed_validation: 'AI-ответ не прошёл validator',
    openai_error: 'ошибка OpenAI',
    parse_error: 'ошибка разбора JSON',
    missing_product_id: 'нет product_id',
    product_not_found: 'товар не найден',
  };
  return map[status] || status;
}

function translateSaveStatus(status: string) {
  const map: Record<string, string> = {
    openai_draft_saved_for_review: 'AI-черновик сохранён для проверки',
    draft_saved_for_review: 'черновик сохранён для проверки',
    blocked_before_storage_write: 'сохранение заблокировано до записи',
    storage_write_failed: 'ошибка записи в Supabase',
  };
  return map[status] || status;
}

function translateSourceMode(mode: string) {
  const map: Record<string, string> = { openai_draft: 'AI-черновик', brief_baseline: 'SEO-бриф', mock_contract: 'тестовый контракт', human_edit: 'ручная правка' };
  return map[mode] || mode;
}

function translateEvent(event: string) {
  const map: Record<string, string> = { draft_created: 'черновик создан' };
  return map[event] || event;
}

function translateBlocker(code: string) {
  const map: Record<string, string> = {
    feature_flag_disabled: 'флаг сохранения выключен',
    missing_openai_key: 'нет серверного OPENAI_API_KEY',
    missing_openai_agent_output: 'нет AI-ответа для сохранения',
    dry_run_only: 'режим только проверки',
    seo_pack_draft_not_saveable: 'SEO-pack draft не прошёл gate',
    similarity_not_checked: 'не пройдена проверка похожести',
    portfolio_strategy_missing: 'нет стратегии дифференциации портфеля',
    missing_service_role_client: 'нет service-role доступа Supabase',
    storage_contract_not_applied: 'storage SQL не применён полностью',
    output_validation_not_passing: 'validator нашёл блокирующие ошибки',
  };
  return map[code] || code;
}

function translateMessage(message: string) {
  const map: Record<string, string> = {
    'FEYA_SEO_AI_GENERATION_ENABLED is not true.': 'В Vercel Preview ещё не включён FEYA_SEO_AI_GENERATION_ENABLED=true для этого deployment.',
    'FEYA_SEO_DRAFT_STORAGE_ENABLED is not true.': 'В Vercel Preview ещё не включён FEYA_SEO_DRAFT_STORAGE_ENABLED=true для этого deployment.',
    'OPENAI_API_KEY is missing on the server.': 'На сервере не найден OPENAI_API_KEY.',
    'dry_run is enabled, so no model call or save is allowed.': 'Включён dry_run, поэтому модель не вызывается.',
    'dry_run is enabled, so no Supabase insert is allowed.': 'Включён dry_run, поэтому запись в Supabase не выполняется.',
    'Portfolio/source differentiation strategy is required before real AI generation.': 'Перед реальной генерацией нужна стратегия отличия от похожих товаров.',
    'source_mode=openai_draft requires agent_output from the generation response.': 'Для сохранения AI-черновика нужен AI-output с этого экрана.',
    'SeoAgentOutputContract validation has blocker issues.': 'AI-output имеет блокирующие ошибки validator и не может быть сохранён.',
  };
  return map[message] || message;
}

function translateOpenAiError(message: string) {
  if (message.includes('Invalid schema')) return `OpenAI не принял JSON Schema: ${message}`;
  return message;
}

function translateIssueCode(code: string) {
  const map: Record<string, string> = {
    wrong_contract_version: 'неверная версия контракта',
    invalid_status: 'неверный статус черновика',
    missing_qa_self_report: 'нет QA self-report',
    invalid_qa_notes: 'неверный формат QA notes',
    seo_title_long: 'SEO-заголовок слишком длинный',
    meta_description_long: 'Описание для Google слишком длинное',
  };
  if (code.startsWith('invalid_')) return `неверное поле: ${code.replace('invalid_', '')}`;
  if (code.startsWith('missing_qa_')) return `нет QA-поля: ${code.replace('missing_qa_', '')}`;
  if (code.startsWith('qa_blocker_')) return `QA blocker: ${code.replace('qa_blocker_', '')}`;
  return map[code] || code;
}

function translateIssueMessage(message: string) {
  const map: Record<string, string> = {
    'Agent output contract_version must be seo_agent_output_v1.': 'AI должен вернуть contract_version = seo_agent_output_v1.',
    'Agent output status must be draft, needs_review, or blocked.': 'AI должен вернуть status: draft / needs_review / blocked.',
    'qa_self_report must be present.': 'AI должен вернуть полный qa_self_report.',
    'seo_title is longer than the preferred review range.': 'SEO-заголовок длиннее безопасного диапазона.',
    'meta_description is longer than the preferred review range.': 'Описание для Google длиннее безопасного диапазона.',
  };
  return map[message] || message;
}

function translateValidation(status: string) {
  const map: Record<string, string> = { valid: 'валидно', warning: 'есть предупреждения', blocked: 'заблокировано', unknown: 'неизвестно' };
  return map[status] || status;
}

function translateTruthBasis(value?: string) {
  const map: Record<string, string> = { visible_product_fact: 'видимый факт товара', needs_image_review: 'нужна проверка фото' };
  return map[value || ''] || value || 'нужна проверка';
}
