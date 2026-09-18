// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileText, ShieldAlert } from 'lucide-react';
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

function Metric({ label, value, note, icon: Icon, tone = 'neutral' }) {
  const toneClass = tone === 'danger' ? 'border-[rgba(196,64,88,.34)] bg-[rgba(160,32,56,.08)]' : tone === 'success' ? 'border-[rgba(108,183,138,.35)] bg-[rgba(108,183,138,.08)]' : 'border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)]';
  return <div className={`rounded-2xl border ${toneClass} p-5`}><div className="flex items-center justify-between gap-4 mb-4"><div className="eyebrow-dim">{label}</div><Icon size={16} className="text-[var(--gold-warm)]" /></div><div className="font-price text-gold-grad text-[40px] leading-none">{value}</div><div className="mt-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>;
}

function ChecklistItem({ done, title, note, href, action }) {
  return <div className="grid gap-4 rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5 lg:grid-cols-[32px_1fr_auto]"><div className={`flex h-8 w-8 items-center justify-center rounded-full border ${done ? 'border-[rgba(108,183,138,.45)] text-[#a9dfbd]' : 'border-[rgba(212,178,106,.35)] text-[var(--gold-warm)]'}`}>{done ? <CheckCircle2 size={15} /> : <FileText size={15} />}</div><div><div className="text-[15px] leading-snug text-bone">{title}</div><div className="mt-2 text-[12px] leading-relaxed text-[var(--bone-dim)]">{note}</div></div>{href ? <Link href={href} className="btn-ghost px-4 py-2 text-[10px]">{action || 'Открыть'} <ArrowUpRight size={13} /></Link> : null}</div>;
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

  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]"><section className="container-feya pt-10 pb-16">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7"><div><div className="eyebrow-gold mb-3">Админка · SEO-шлюз</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>SEO-шлюз</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Внутренний контрольный экран SEO-процесса. Он не изменяет данные витрины.</p></div><div className="flex gap-3"><Link href="/admin/seo-storefront-preview" className="btn-ghost">SEO-предпросмотр <ArrowUpRight size={13} /></Link><Link href="/admin/seo-change-sets" className="btn-ghost">Очередь SEO-правок <ArrowUpRight size={13} /></Link></div></div>
    {error ? <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.06)] p-5 text-[var(--bone-dim)] mb-7">Данные SEO-шлюза доступны не полностью: {error}</div> : null}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"><Metric icon={ShieldAlert} label="Шлюз" value={locked ? 'ЗАКРЫТ' : 'ОТКРЫТ'} note="Закрыт до появления проверенного контракта публикации SEO на витрине." tone="danger" /><Metric icon={FileText} label="Ждут проверки" value={pending} note="Строки, которые ещё ждут проверки." /><Metric icon={CheckCircle2} label="Одобрено" value={approved} note="Одобренные строки, ещё не отмеченные как применённые." tone="success" /><Metric icon={CheckCircle2} label="Применено" value={appliedChangeSets} note="Строки, отмеченные как применённые." tone="success" /></div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8"><Metric icon={FileText} label="Строки предпросмотра" value={preview.length} note="Строки витрины в предпросмотре." /><Metric icon={FileText} label="Применённые значения" value={applied.length} note="Одобренные и применённые значения полей." /><Metric icon={FileText} label="Title" value={rowsWithTitle} note="Строки с применённым SEO-заголовком." /><Metric icon={FileText} label="Meta" value={rowsWithMeta} note="Строки с применённым meta description." /><Metric icon={FileText} label="H1/Alt" value={`${rowsWithH1}/${rowsWithAlt}`} note="Строки с применённым H1 / ALT изображения." /></div>
    <div className="grid gap-4 mb-8"><ChecklistItem done={hasAnyChangeSet} title="1. Создать SEO-правки на проверку" note="Начни с одного товара. Создай строки только для реально изменившихся полей." href="/admin/seo-apply" action="Создать правки" /><ChecklistItem done={pending === 0 && hasAnyChangeSet} title="2. Проверить ожидающие строки" note="Одобри правильные строки или отклони ошибочные. Пока процесс не проверен, работай маленькими партиями." href="/admin/seo-change-sets" action="Проверить" /><ChecklistItem done={appliedChangeSets > 0} title="3. Отметить одобренные строки как применённые" note="Одобренные строки можно отметить как применённые в очереди SEO-правок. Это всё ещё не меняет витрину напрямую." href="/admin/seo-change-sets" action="Применить" /><ChecklistItem done={hasAnyAppliedValue} title="4. Проверить SEO-значения" note="SEO-значения должны показывать одобренные и применённые поля по товарам." href="/admin/seo-applied-values" action="Значения" /><ChecklistItem done={hasAnyPreviewValue} title="5. Проверить SEO-предпросмотр витрины" note="SEO-предпросмотр должен показывать текущие и применённые значения одного товара." href="/admin/seo-storefront-preview" action="Предпросмотр" /></div>
    <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5"><div className="eyebrow-dim mb-3">Текущее решение</div><div className="text-[15px] leading-relaxed text-bone">Оставить SEO-процесс внутренним. Продолжать создавать, проверять и отмечать применёнными SEO-правки до появления отдельного безопасного контракта публикации на витрину.</div></div>
  </section></main>;
}
