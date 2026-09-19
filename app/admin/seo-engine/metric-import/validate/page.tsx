import Link from 'next/link';
import { ArrowUpRight, ShieldAlert } from 'lucide-react';
import { CsvMetricImportValidator } from '../CsvMetricImportValidator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function Panel({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] overflow-hidden">
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[rgba(216,214,211,.10)]"><div className="eyebrow-gold">{title}</div>{Icon ? <Icon size={16} className="text-[var(--gold-warm)]" /> : null}</div>
    <div className="p-4">{children}</div>
  </div>;
}

export default function SeoMetricImportValidatePage() {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-7 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-5 mb-5">
        <div>
          <div className="eyebrow-gold mb-2">Админка · SEO · metric validation</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,64px)' }}>Проверка CSV метрик</h1>
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Вставь заполненный CSV или загрузи файл. Экран покажет, какие строки готовы к scoring, какие требуют проверки, а какие заблокированы. Записи в Supabase нет.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Link href="/admin/seo-engine/metric-import" className="btn-ghost">Импорт метрик <ArrowUpRight size={13} /></Link><Link href="/admin/seo-engine/scoring" className="btn-ghost">Scoring <ArrowUpRight size={13} /></Link></div>
      </div>

      <Panel title="Preview validation" icon={ShieldAlert}>
        <CsvMetricImportValidator />
      </Panel>
    </section>
  </main>;
}
