// @ts-nocheck
import { Gauge, Layers3 } from 'lucide-react';
import { recommendSeoStrategy } from '@/lib/seo-strategy-profiles';

type Props = {
  productText: string;
  keywordBuckets: string[];
  isWeakProduct?: boolean;
};

function Chip({ children }) {
  return <span className="inline-flex rounded-full border border-[rgba(216,214,211,.16)] bg-black/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--bone-dim)]">{children}</span>;
}

export function AdminSeoStrategyRecommendationCard({ productText, keywordBuckets, isWeakProduct }: Props) {
  const recommendation = recommendSeoStrategy({ productText, keywordBuckets, isWeakProduct });
  const { strategy } = recommendation;

  return <div className="rounded-2xl border border-[rgba(216,214,211,.12)] bg-[rgba(255,255,255,.025)] p-5">
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <div className="eyebrow-gold mb-2">Рекомендованная SEO-стратегия</div>
        <div className="text-bone text-[22px] leading-tight">{strategy.nameRu}</div>
      </div>
      <Layers3 size={18} className="text-[var(--gold-warm)]" />
    </div>
    <p className="text-[13px] leading-relaxed text-[var(--bone-dim)] mb-4">{recommendation.reasonRu}</p>
    <div className="grid md:grid-cols-2 gap-4 mb-4">
      <div>
        <div className="eyebrow-dim mb-2">Усиливаем</div>
        <div className="flex flex-wrap gap-1.5">{strategy.primaryBuckets.map((bucket) => <Chip key={bucket}>{bucket}</Chip>)}</div>
      </div>
      <div>
        <div className="eyebrow-dim mb-2">Ограничиваем</div>
        <div className="flex flex-wrap gap-1.5">{strategy.limitedBuckets.length ? strategy.limitedBuckets.map((bucket) => <Chip key={bucket}>{bucket}</Chip>) : <Chip>нет жёсткого ограничения</Chip>}</div>
      </div>
    </div>
    <div className="rounded-xl border border-[rgba(216,214,211,.10)] bg-black/15 p-4">
      <div className="flex items-center gap-2 eyebrow-dim mb-3"><Gauge size={14} /> Сигналы</div>
      <div className="flex flex-wrap gap-1.5">{recommendation.matchedSignals.map((signal) => <Chip key={signal}>{signal}</Chip>)}</div>
    </div>
  </div>;
}
