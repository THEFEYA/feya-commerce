import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CsvScoringPreview } from './CsvScoringPreview';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SeoScoringPreviewPage() {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-7 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-5 mb-5">
        <div>
          <div className="eyebrow-gold mb-2">Админка · SEO · scoring preview</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,64px)' }}>Preview scoring ключей</h1>
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Вставь CSV с заполненными метриками. Экран покажет provisional score и распределение ключей в портфель. Записи в Supabase нет.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Link href="/admin/seo-engine/metric-import/validate" className="btn-ghost">Проверка CSV <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/scoring" className="btn-ghost">Контракт scoring <ArrowUpRight size={13} /></Link></div>
      </div>

      <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold">Локальный scoring preview</div></div>
        <div className="p-4"><CsvScoringPreview /></div>
      </div>
    </section>
  </main>;
}
