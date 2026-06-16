import Link from 'next/link';
import { ArrowUpRight, Gauge, Layers3 } from 'lucide-react';
import { SEO_STRATEGY_PROFILES } from '@/lib/seo-strategy-profiles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const WEIGHT_LABELS = {
  dna: 'ДНК товара',
  buyerIntent: 'Покупательский смысл',
  searchMetrics: 'Метрики поиска',
  seasonality: 'Сезонность',
  regionFit: 'Регион',
  antiCannibalization: 'Анти-каннибализация',
  experiment: 'Эксперимент',
};

function Chip({ children }) {
  return <span className="inline-flex rounded-full border border-[rgba(216,214,211,.16)] bg-black/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--bone-dim)]">{children}</span>;
}

function WeightRow({ label, value }) {
  return <div className="grid grid-cols-[1fr_54px] gap-3 items-center text-[12px]">
    <div className="text-[var(--bone-dim)]">{label}</div>
    <div className="text-right text-bone">{value}</div>
    <div className="col-span-2 h-1.5 rounded-full bg-black/40 overflow-hidden">
      <div className="h-full bg-[var(--gold-warm)]" style={{ width: `${Math.min(100, Math.max(0, value * 3))}%` }} />
    </div>
  </div>;
}

export default function SeoStrategyPage() {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · SEO Engine</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Стратегии ключей</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Это рабочие профили, которые будут управлять тем, какой SEO-угол выбирается для товара: часть товара, материал, событие, образ, картинки, покупательский intent или экспериментальная ниша.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/seo-engine" className="btn-ghost">SEO Engine <ArrowUpRight size={13} /></Link>
          <Link href="/admin/seo-lab" className="btn-ghost">SEO Lab <ArrowUpRight size={13} /></Link>
        </div>
      </div>

      <div className="rounded-2xl border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] p-5 text-[13px] leading-relaxed text-[var(--bone-dim)] mb-6">
        Смысл этого слоя: не плодить одинаковые товары под одни и те же слова. Один товар может быть “gold mirror corset”, другой — “goddess stage costume”, третий — “gold acrylic top for performers”. Так мы распределяем SEO-ядро и снижаем риск каннибализации.
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        {SEO_STRATEGY_PROFILES.map((profile) => <article key={profile.code} className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="eyebrow-gold mb-2">{profile.code}</div>
              <h2 className="text-bone text-[22px] leading-tight">{profile.nameRu}</h2>
            </div>
            <Layers3 size={18} className="text-[var(--gold-warm)]" />
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--bone-dim)] mb-5">{profile.descriptionRu}</p>
          <div className="grid md:grid-cols-2 gap-4 mb-5">
            <div>
              <div className="eyebrow-dim mb-2">Усиливаем</div>
              <div className="flex flex-wrap gap-1.5">{profile.primaryBuckets.map((bucket) => <Chip key={bucket}>{bucket}</Chip>)}</div>
            </div>
            <div>
              <div className="eyebrow-dim mb-2">Ограничиваем</div>
              <div className="flex flex-wrap gap-1.5">{profile.limitedBuckets.length ? profile.limitedBuckets.map((bucket) => <Chip key={bucket}>{bucket}</Chip>) : <Chip>нет жёсткого ограничения</Chip>}</div>
            </div>
          </div>
          <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
            <div className="flex items-center gap-2 eyebrow-dim mb-4"><Gauge size={14} /> Веса стратегии</div>
            <div className="space-y-3">{Object.entries(profile.weights).map(([key, value]) => <WeightRow key={key} label={WEIGHT_LABELS[key] || key} value={value as number} />)}</div>
          </div>
        </article>)}
      </div>
    </section>
  </main>;
}
