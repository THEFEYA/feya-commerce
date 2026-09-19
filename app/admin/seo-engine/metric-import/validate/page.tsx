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
  return <main className="owner-page">
    <div className="owner-page-inner">
      <header className="owner-page-head">
        <div>
          <div className="owner-eyebrow">SEO · метрики Google</div>
          <h1>Проверка CSV метрик</h1>
          <p>Вставь CSV или загрузи файл. Сначала только проверяем формат, источник и проблемные строки; запись в Supabase на этом экране не выполняется.</p>
        </div>
        <div className="owner-actions" style={{ marginTop: 0 }}>
          <Link href="/admin/seo-engine/metric-import" className="owner-button">Импорт метрик <ArrowUpRight size={13} /></Link>
          <Link href="/admin/seo-engine/scoring" className="owner-button">Оценка ключей <ArrowUpRight size={13} /></Link>
        </div>
      </header>

      <section className="owner-section" style={{ marginTop: 0 }}>
        <Panel title="Предварительная проверка" icon={ShieldAlert}>
          <CsvMetricImportValidator />
        </Panel>
      </section>
    </div>
  </main>;
}
