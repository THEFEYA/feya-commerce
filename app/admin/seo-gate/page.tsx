// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileText } from 'lucide-react';
import { getSupabaseServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ChangeSetRow = { status: string };
type AppliedRow = { product_slug: string; target_field: string };
type PreviewRow = {
  product_slug: string;
  has_applied_seo_title?: boolean | null;
  has_applied_meta_description?: boolean | null;
  has_applied_h1?: boolean | null;
  has_applied_primary_image_alt?: boolean | null;
};

async function loadGateData() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { changeSets: [] as ChangeSetRow[], applied: [] as AppliedRow[], preview: [] as PreviewRow[], error: 'Нет серверного доступа к базе для админки.' };

  const [changeSets, applied, preview] = await Promise.all([
    supabase.from('feya_commerce_v_admin_seo_change_sets_v1').select('status').limit(1000),
    supabase.from('feya_commerce_v_admin_seo_applied_values_v1').select('product_slug,target_field').limit(1000),
    supabase.from('feya_commerce_v_admin_storefront_seo_preview_v1').select('product_slug,has_applied_seo_title,has_applied_meta_description,has_applied_h1,has_applied_primary_image_alt').limit(1000),
  ]);

  const error = changeSets.error?.message || applied.error?.message || preview.error?.message || null;
  return {
    changeSets: (changeSets.data || []) as ChangeSetRow[],
    applied: (applied.data || []) as AppliedRow[],
    preview: (preview.data || []) as PreviewRow[],
    error,
  };
}

function ChecklistItem({ done, title, note, href, action }) {
  return <div className="grid gap-4 rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 lg:grid-cols-[32px_1fr_auto]"><div className={`flex h-8 w-8 items-center justify-center rounded-full border ${done ? 'border-[rgba(108,183,138,.45)] text-[#a9dfbd]' : 'border-[rgba(212,178,106,.35)] text-[var(--gold-warm)]'}`}>{done ? <CheckCircle2 size={15} /> : <FileText size={15} />}</div><div><div className="text-[15px] leading-snug text-bone">{title}</div><div className="mt-2 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>{href ? <Link href={href} className="owner-button">{action || 'Открыть'} <ArrowUpRight size={13} /></Link> : null}</div>;
}

export default async function SeoGatePage() {
  const { changeSets, applied, preview, error } = await loadGateData();
  const pending = changeSets.filter((row) => row.status === 'pending').length;
  const approved = changeSets.filter((row) => row.status === 'approved').length;
  const appliedChangeSets = changeSets.filter((row) => row.status === 'applied').length;
  const rowsWithTitle = preview.filter((row) => row.has_applied_seo_title).length;
  const rowsWithMeta = preview.filter((row) => row.has_applied_meta_description).length;
  const rowsWithH1 = preview.filter((row) => row.has_applied_h1).length;
  const rowsWithAlt = preview.filter((row) => row.has_applied_primary_image_alt).length;
  const locked = true;
  const hasAnyChangeSet = changeSets.length > 0;
  const hasAnyAppliedValue = applied.length > 0;
  const hasAnyPreviewValue = rowsWithTitle + rowsWithMeta + rowsWithH1 + rowsWithAlt > 0;

  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">SEO · безопасное применение</div>
          <h1>Контроль SEO-процесса</h1>
          <p>Здесь видно, прошли ли SEO-правки проверку и на каком этапе они находятся. Отметка «применено» внутри процесса не равна автоматической публикации на витрину.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/seo-storefront-preview" className="owner-button">SEO-предпросмотр <ArrowUpRight size={13} /></Link>
          <Link href="/admin/seo-change-sets" className="owner-button primary">Очередь SEO-правок <ArrowUpRight size={13} /></Link>
        </div>
      </header>
    {error ? <div className="owner-card is-warning" style={{ marginBottom: '18px' }}><div className="owner-status is-warning">Данные доступны не полностью</div><p className="owner-card-copy">{error}</p></div> : null}
    <section className="owner-summary-strip" style={{ marginBottom: '16px' }}>
      <div className="owner-summary-cell"><strong>{pending}</strong><span>SEO-правок ждут проверки</span></div>
      <div className="owner-summary-cell"><strong>{approved}</strong><span>Одобрено, ещё не отмечено применённым</span></div>
      <div className="owner-summary-cell"><strong>{appliedChangeSets}</strong><span>Отмечено применённым внутри процесса</span></div>
      <div className="owner-summary-cell"><strong>{locked ? 'Закрыт' : 'Открыт'}</strong><span>Контракт публикации на витрину</span></div>
    </section>

    <details className="owner-disclosure owner-disclosure-section" style={{ marginBottom: '20px' }}>
      <summary>
        <span><strong>Покрытие SEO-полей</strong><small>Техническая детализация текущего предпросмотра</small></span>
        <span className="owner-section-kicker">{preview.length} строк</span>
      </summary>
      <div className="owner-disclosure-body">
        <div className="owner-summary-strip">
          <div className="owner-summary-cell"><strong>{applied.length}</strong><span>Применённых значений</span></div>
          <div className="owner-summary-cell"><strong>{rowsWithTitle}</strong><span>SEO title</span></div>
          <div className="owner-summary-cell"><strong>{rowsWithMeta}</strong><span>Meta description</span></div>
          <div className="owner-summary-cell"><strong>{rowsWithH1}/{rowsWithAlt}</strong><span>H1 / ALT</span></div>
        </div>
      </div>
    </details>
    <section className="owner-section">
      <div className="owner-section-head"><div><h2>Безопасная последовательность</h2><div className="owner-section-kicker">Каждый шаг подтверждает только свой этап и не перескакивает через публикационный gate.</div></div></div>
      <div className="grid gap-4"><ChecklistItem done={hasAnyChangeSet} title="1. Создать SEO-правки на проверку" note="Начни с одного товара. Создай строки только для реально изменившихся полей." href="/admin/seo-apply" action="Создать правки" /><ChecklistItem done={pending === 0 && hasAnyChangeSet} title="2. Проверить ожидающие строки" note="Одобри правильные строки или отклони ошибочные. Пока процесс не проверен, работай маленькими партиями." href="/admin/seo-change-sets" action="Проверить" /><ChecklistItem done={appliedChangeSets > 0} title="3. Отметить одобренные строки как применённые" note="Одобренные строки можно отметить как применённые в очереди SEO-правок. Это всё ещё не меняет витрину напрямую." href="/admin/seo-change-sets" action="Применить" /><ChecklistItem done={hasAnyAppliedValue} title="4. Проверить SEO-значения" note="SEO-значения должны показывать одобренные и применённые поля по товарам." href="/admin/seo-applied-values" action="Значения" /><ChecklistItem done={hasAnyPreviewValue} title="5. Проверить SEO-предпросмотр витрины" note="SEO-предпросмотр должен показывать текущие и применённые значения одного товара." href="/admin/seo-storefront-preview" action="Предпросмотр" /></div>
    </section>
    <div className="owner-card is-info" style={{ marginTop: '20px' }}>
      <div className="owner-status is-info">Текущее правило</div>
      <p className="owner-card-copy">SEO-процесс остаётся внутренним: можно создавать, проверять и фиксировать применённые значения, но публикация на витрину должна оставаться отдельным контролируемым действием.</p>
    </div>
    </div>
  </main>;
}
