'use client';

import { useState } from 'react';

const PILOT_PRODUCT_ID = 'b6e0171f-4d42-4d71-88b1-ee0d4e0e109e';

type Result = Record<string, any>;

export default function FirstRealDraftClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch('/api/admin/seo-engine/draft-generate-pilot-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: PILOT_PRODUCT_ID }),
      });
      const payload = await response.json().catch(() => ({}));
      setResult({ ...payload, http_status: response.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка запуска');
    } finally {
      setLoading(false);
    }
  }

  const draft = result?.generated_draft_output || null;
  const validation = result?.generated_draft_validation || null;
  const diagnostics = result?.keyword_bank_diagnostics || null;
  const blocks = Array.isArray(draft?.pdp_blocks) ? draft.pdp_blocks : [];
  const alts = Array.isArray(draft?.image_alt_candidates) ? draft.image_alt_candidates : [];
  const issues = Array.isArray(validation?.issues) ? validation.issues : [];

  return <div className="space-y-5">
    <div className="rounded-2xl border border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow-gold">Первый настоящий OpenAI SEO draft</div>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">
            Сервер берёт только approved ключи с реальными метриками из канонического Keyword Bank. Комплектация пока не подтверждена, поэтому блок What’s Included намеренно не генерируется. Никакой записи и публикации нет.
          </p>
        </div>
        <button type="button" onClick={run} disabled={loading} className="btn-ghost disabled:opacity-50">
          {loading ? 'OpenAI генерирует…' : 'Запустить первый реальный draft'}
        </button>
      </div>
    </div>

    {error ? <Notice tone="danger">{error}</Notice> : null}

    {result ? <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Fact label="HTTP" value={String(result.http_status ?? '—')} />
        <Fact label="Статус" value={String(result.status || '—')} tone={result.ok ? 'success' : 'warning'} />
        <Fact label="OpenAI" value={result.openai_generation?.ok ? 'ответ получен' : result.openai_generation?.status || 'не вызван'} tone={result.openai_generation?.ok ? 'success' : 'warning'} />
        <Fact label="Модель" value={result.openai_generation?.model || '—'} />
        <Fact label="Фото" value={result.openai_generation?.vision_input?.primary_image_sent ? 'отправлено сервером' : 'не отправлено'} tone={result.openai_generation?.vision_input?.primary_image_sent ? 'success' : 'warning'} />
      </div>

      {result.error ? <Notice tone="danger">{result.error}</Notice> : null}
      {result.message ? <Notice tone={result.ok ? 'success' : 'warning'}>{result.message}</Notice> : null}

      {diagnostics ? <Panel title="Ключи, реально взятые из Keyword Bank">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <Fact label="Найдено в bank" value={String(diagnostics.bank_rows_found ?? 0)} />
          <Fact label="Trusted metrics" value={String(diagnostics.trusted_metric_rows ?? 0)} />
          <Fact label="Usable candidates" value={String(diagnostics.useful_candidate_rows ?? 0)} />
          <Fact label="Validated usable" value={String(diagnostics.useful_validated_rows ?? 0)} tone={Number(diagnostics.useful_validated_rows || 0) >= 3 ? 'success' : 'warning'} />
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          {(diagnostics.selected_keywords || []).map((item: any, index: number) => <div key={`${item.keyword}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3">
            <div className="text-bone text-[13px]">{item.keyword || '—'}</div>
            <div className="mt-1 text-[11px] text-[var(--bone-dim)]">role: {item.role || '—'} · volume: {item.avg_monthly_searches ?? '—'} · competition: {item.competition || '—'}</div>
            <div className="mt-1 text-[10px] text-[var(--smoke)]">{item.metric_source || '—'} · {item.last_checked || '—'}</div>
          </div>)}
        </div>
      </Panel> : null}

      {result.blockers?.length ? <Panel title="Что ещё блокирует запуск">
        <div className="grid md:grid-cols-2 gap-2">{result.blockers.map((item: any, index: number) => <div key={`${item.code}-${index}`} className="rounded-xl border border-[rgba(196,64,88,.28)] bg-[rgba(160,32,56,.08)] p-3">
          <div className="text-[12px] text-[var(--ruby-soft)]">{item.code}</div>
          <div className="mt-1 text-[11px] text-[var(--bone-dim)]">{item.message}</div>
        </div>)}</div>
      </Panel> : null}

      {draft ? <>
        <Panel title="SEO-поля">
          <div className="grid lg:grid-cols-2 gap-3">
            <TextField label="SEO title" value={draft.seo_title} />
            <TextField label="H1" value={draft.h1} />
            <TextField label="Meta description" value={draft.meta_description} />
            <TextField label="Intro" value={draft.intro} />
          </div>
        </Panel>

        <Panel title="Основное описание товара">
          <div className="space-y-3">{blocks.map((block: any, index: number) => <div key={`${block.block_key}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="text-bone text-[14px]">{block.heading || block.block_key}</div>
              <span className="rounded-full border border-[rgba(212,178,106,.28)] px-2 py-1 text-[9px] uppercase tracking-[.15em] text-[var(--gold-warm)]">{block.block_key}</span>
            </div>
            <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--bone-dim)]">{block.body || '—'}</div>
          </div>)}</div>
        </Panel>

        <Panel title="ALT для изображений">
          <ul className="space-y-2">{alts.map((item: any, index: number) => <li key={`${item.alt_text}-${index}`} className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/20 p-3 text-[12px] text-[var(--bone-dim)]">{item.alt_text || '—'} <span className="text-[var(--smoke)]">· {item.truth_basis || '—'}</span></li>)}</ul>
        </Panel>
      </> : null}

      {validation ? <Panel title="Детерминированный validator">
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Fact label="Результат" value={validation.ok ? 'PASS' : 'BLOCKED'} tone={validation.ok ? 'success' : 'warning'} />
          <Fact label="Замечаний" value={String(issues.length)} tone={issues.length ? 'warning' : 'success'} />
        </div>
        {issues.length ? <div className="grid md:grid-cols-2 gap-2">{issues.map((item: any, index: number) => <div key={`${item.code}-${index}`} className="rounded-xl border border-[rgba(212,178,106,.22)] bg-black/20 p-3">
          <div className="text-[11px] text-[var(--gold-warm)]">{item.severity}: {item.code}</div>
          <div className="mt-1 text-[11px] text-[var(--bone-dim)]">{item.message}</div>
        </div>)}</div> : <div className="text-[12px] text-[#a9dfbd]">Блокирующих ошибок не найдено.</div>}
      </Panel> : null}

      <details className="rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/20 p-4">
        <summary className="cursor-pointer text-[11px] uppercase tracking-[.16em] text-[var(--smoke)]">Полный JSON</summary>
        <pre className="mt-3 max-h-[500px] overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-[var(--bone-dim)]">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </> : null}
  </div>;
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

function Notice({ children, tone = 'warning' }: { children: React.ReactNode; tone?: string }) {
  const cls = tone === 'danger'
    ? 'border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] text-[var(--ruby-soft)]'
    : tone === 'success'
      ? 'border-[rgba(108,183,138,.30)] bg-[rgba(108,183,138,.07)] text-[#a9dfbd]'
      : 'border-[rgba(212,178,106,.28)] bg-[rgba(212,178,106,.06)] text-[var(--gold-warm)]';
  return <div className={`rounded-2xl border p-4 text-[12px] leading-relaxed ${cls}`}>{children}</div>;
}
