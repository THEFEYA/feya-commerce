import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { AdminCreateSeoBriefBySlugForm } from '@/components/AdminCreateSeoBriefBySlugForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SeoEngineBriefsPage() {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">Админка · SEO Engine</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>SEO-брифы</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Практический экран для создания первого SEO-брифа из сохранённых ключевых фраз. Финальный контент будет на английском, но управление и проверка остаются на русском.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/seo-engine" className="btn-ghost">SEO Engine <ArrowUpRight size={13} /></Link>
          <Link href="/admin/seo-lab" className="btn-ghost">SEO Lab <ArrowUpRight size={13} /></Link>
        </div>
      </div>
      <AdminCreateSeoBriefBySlugForm />
      <div className="mt-6 rounded-2xl border border-[rgba(216,214,211,.12)] bg-black/20 p-5 text-[13px] leading-relaxed text-[var(--bone-dim)]">
        Порядок: сначала открой товар в SEO Lab, нажми «Сохранить ключевые фразы», затем вставь product_slug здесь и создай SEO-бриф. Следующий шаг после этого — создать первый англоязычный content asset draft из брифа.
      </div>
    </section>
  </main>;
}
