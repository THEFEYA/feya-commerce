// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileText, ShieldAlert, Sparkles } from 'lucide-react';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import { buildMockSeoAgentOutput } from '@/lib/seoAgentMockDraft';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';
import SeoDraftSavePreflightClient from './SeoDraftSavePreflightClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function param(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

function asText(value, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusTone(value) {
  const status = String(value || '').toLowerCase();
  if (status === 'valid' || status === 'pass' || status === 'draft') return 'success';
  if (status === 'blocked' || status === 'blocker') return 'danger';
  return 'warning';
}

function Pill({ children, tone = 'neutral' }) {
  const cls = tone === 'success'
    ? 'border-[rgba(108,183,138,.35)] text-[#a9dfbd] bg-[rgba(108,183,138,.08)]'
    : tone === 'danger'
      ? 'border-[rgba(196,64,88,.34)] text-[var(--ruby-soft)] bg-[rgba(160,32,56,.08)]'
      : tone === 'gold' || tone === 'warning'
        ? 'border-[rgba(212,178,106,.35)] text-[var(--gold-warm)] bg-[rgba(212,178,106,.08)]'
        : 'border-[rgba(216,214,211,.16)] text-[var(--bone-dim)] bg-black/15';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${cls}`}>{children}</span>;
}

function Section({ label, children }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-3">
    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1.5">{label}</div>
    <div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">{children}</div>
  </div>;
}

function Fact({ label, value }) {
  return <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-2.5">
    <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--smoke)] mb-1">{label}</div>
    <div className="text-[12px] text-bone leading-snug">{asText(value)}</div>
  </div>;
}

function Notice({ children, tone = 'warning' }) {
  const cls = tone === 'danger' ? 'border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)]' : 'border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)]';
  return <div className={`rounded-2xl border ${cls} p-4 text-[var(--bone-dim)] mb-5`}>{children}</div>;
}

function ReviewList({ items = [] }) {
  return items.length ? <ul className="list-disc pl-5 space-y-1.5">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <span>—</span>;
}

function FaqList({ items = [] }) {
  return items.length ? <div className="space-y-3">{items.map((item, index) => <div key={`${item.question}-${index}`}>
    <div className="text-bone text-[12px]">{item.question || 'Вопрос требует проверки'}</div>
    <div className="mt-1 text-[12px] leading-relaxed text-[var(--bone-dim)]">{item.answer || 'Ответ требует проверки'}</div>
    <div className="mt-1"><Pill tone="gold">{item.intent || 'другое'}</Pill></div>
  </div>)}</div> : <span>—</span>;
}

function Issues({ issues = [] }) {
  return issues.length ? <div className="grid md:grid-cols-2 gap-2">{issues.map((issue, index) => <div key={`${issue.code}-${index}`} className="rounded-xl border border-[rgba(212,178,106,.22)] bg-black/15 p-3">
    <div className="flex flex-wrap gap-2 mb-1.5"><Pill tone={issue.severity === 'blocker' ? 'danger' : 'warning'}>{issue.severity || 'issue'}</Pill><Pill>{issue.code || 'validation'}</Pill></div>
    <div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">{issue.message || 'Нужна проверка.'}</div>
  </div>)}</div> : <div className="rounded-xl border border-[rgba(108,183,138,.25)] bg-[rgba(108,183,138,.06)] p-3 text-[12px] text-[#a9dfbd]">Validator не нашёл blocker issues в review output.</div>;
}

export default async function SeoDraftPreviewPage({ searchParams }) {
  const params = await searchParams;
  const productId = param(params?.product_id || params?.product).trim();
  const bundle = await buildSeoBriefContractBundle(productId);
  const product = bundle.product || null;
  const brief = bundle.brief || null;
  const seoPackDraft = bundle.seoPackDraft || null;
  const mockDraft = bundle.aiAgentInput ? buildMockSeoAgentOutput(bundle.aiAgentInput, brief) : null;
  const validation = mockDraft ? validateSeoAgentOutput(mockDraft) : null;
  const activeProductId = seoPackDraft?.canonical_product_id || product?.canonical_product_id || productId;

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-7 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-5 mb-5">
        <div>
          <div className="eyebrow-gold mb-2">Админка · SEO · проверка черновика</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,64px)' }}>Проверка SEO-черновика</h1>
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Этот экран показывает человекочитаемый SEO Brief baseline, завёрнутый в seo_agent_output_v1 для проверки validator/storage pipeline. Это не финальный AI-текст и не publish draft.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeProductId ? <Link href={`/admin/seo-engine/briefs?product_id=${activeProductId}`} className="btn-ghost">Назад к SEO-брифу <ArrowUpRight size={13} /></Link> : null}
          {activeProductId ? <Link href={`/api/admin/seo-engine/brief-contract?product_id=${activeProductId}`} className="btn-ghost" target="_blank">Открыть JSON-контракт <ArrowUpRight size={13} /></Link> : null}
          <Link href="/admin/seo-engine/metric-import" className="btn-ghost">Импорт метрик <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      {bundle.error ? <Notice tone="danger">{bundle.error}</Notice> : null}
      {!product ? <Notice tone="danger">Товар не найден в Product Focus view. Открой SEO-бриф с конкретным product_id.</Notice> : null}
      {product && !bundle.decision ? <Notice>Для этого товара нет сохранённого решения Listing Master. Draft baseline может быть неполным, потому что нет ручного Product DNA и выбранных ключей.</Notice> : null}

      {product && brief && seoPackDraft && mockDraft ? <>
        <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-5 mb-5">
          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold">Исходный товар</div><FileText size={17} className="text-[var(--gold-warm)]" /></div>
            <div className="p-4">
              <div className="grid sm:grid-cols-[118px_1fr] gap-4">
                <div className="h-32 rounded-xl overflow-hidden border border-[rgba(216,214,211,.10)] bg-black/30">
                  {product.primary_image_url ? <img src={product.primary_image_url} alt={product.primary_image_alt || product.card_title || ''} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-[0.18em] text-[var(--smoke)]">нет фото</div>}
                </div>
                <div>
                  <div className="text-bone text-[18px] leading-tight">{brief.productTitle}</div>
                  <div className="mt-2 text-[11px] text-[var(--bone-dim)]">ID: {activeProductId} · /{brief.productSlug}</div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-2">
                    <Fact label="Статус SEO-pack" value={seoPackDraft.status} />
                    <Fact label="Статус брифа" value={brief.status} />
                    <Fact label="Главные ключи" value={seoPackDraft.keyword_roles.primary.length} />
                    <Fact label="Вторичные ключи" value={seoPackDraft.keyword_roles.secondary.length} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold">Контрольные проверки</div><ShieldAlert size={17} className="text-[var(--gold-warm)]" /></div>
            <div className="p-4 space-y-3">
              <div className="grid sm:grid-cols-3 gap-2">
                <Fact label="Черновик" value={mockDraft.status} />
                <Fact label="Validator" value={validation?.status || 'unknown'} />
                <Fact label="Сохранение" value="нет" />
              </div>
              <div className="rounded-xl border border-[rgba(212,178,106,.25)] bg-[rgba(212,178,106,.06)] p-3 text-[12px] leading-relaxed text-[var(--bone-dim)]">
                Главный текст ниже восстановлен из SeoPilotBrief.draftPreview, чтобы не терять качество preview. Сохранение в Supabase, OpenAI generation и publish остаются заблокированы до storage contract, human review и similarity/cannibalization gate.
              </div>
              <div className="flex flex-wrap gap-2"><Pill tone={statusTone(validation?.status)}>{validation?.status || 'not_checked'}</Pill><Pill tone="success">SEO baseline</Pill><Pill tone="warning">без записи в Supabase</Pill><Pill tone="warning">без публикации</Pill><Pill tone="warning">без реального OpenAI</Pill></div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden mb-5">
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div><div className="eyebrow-gold">SEO baseline / review output</div><div className="mt-1 text-bone text-[18px]">seo_agent_output_v1 seeded from draftPreview</div></div><Sparkles size={17} className="text-[var(--gold-warm)]" /></div>
          <div className="p-4 grid lg:grid-cols-[1fr_.85fr] gap-4">
            <div className="space-y-3">
              <Section label="SEO title">{mockDraft.seo_title}</Section>
              <Section label="H1">{mockDraft.h1}</Section>
              <Section label="Meta description">{mockDraft.meta_description}</Section>
              <Section label="Intro">{mockDraft.intro}</Section>
            </div>
            <div className="space-y-3">
              <Section label="Тезисы"><ReviewList items={mockDraft.bullet_highlights || []} /></Section>
              <Section label="FAQ"><FaqList items={mockDraft.faq || []} /></Section>
              <Section label="ALT для изображений"><ReviewList items={(mockDraft.image_alt_candidates || []).map((item) => `${item.alt_text || 'ALT требует проверки'} · ${item.truth_basis || 'unknown'}`)} /></Section>
              <Section label="Внутренние ссылки"><ReviewList items={(mockDraft.internal_linking_hints || []).map((item) => `${item.anchor || 'anchor'} → ${item.target_type || 'target'} · ${item.reason || 'needs review'}`)} /></Section>
              <Section label="Служебные заметки"><ReviewList items={mockDraft.generation_notes || []} /></Section>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden mb-5">
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div><div className="eyebrow-gold">Результат validator</div><div className="mt-1 text-bone text-[18px]">Перед любым будущим сохранением</div></div><CheckCircle2 size={17} className="text-[var(--gold-warm)]" /></div>
          <div className="p-4"><Issues issues={validation?.issues || []} /></div>
        </div>

        <div className="mb-5"><SeoDraftSavePreflightClient productId={activeProductId} /></div>

        <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-4">
          <div className="eyebrow-gold mb-3">Следующие действия пока намеренно заблокированы</div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-ghost opacity-60 cursor-not-allowed" disabled>Сохранить черновик в Supabase — заблокировано</button>
            <button className="btn-ghost opacity-60 cursor-not-allowed" disabled>Одобрить к публикации — заблокировано</button>
            <button className="btn-ghost opacity-60 cursor-not-allowed" disabled>Запустить реальный OpenAI — заблокировано</button>
          </div>
        </div>
      </> : null}
    </section>
  </main>;
}
