import Link from 'next/link';
import FirstRealDraftClient from './FirstRealDraftClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function FirstRealDraftPage() {
  return <main className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,rgba(212,178,106,.13),transparent_32%),linear-gradient(180deg,#07070A,#111016_45%,#07070A)]">
    <section className="container-feya pt-10 pb-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-[rgba(216,214,211,.12)] pb-7 mb-7">
        <div>
          <div className="eyebrow-gold mb-3">FEYA Commerce · controlled live generation</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Первый реальный SEO draft</h1>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">
            Практический тест всей цепочки: Product Focus, approved Keyword Bank с настоящими метриками, OpenAI, visual truth и детерминированный validator. Комплектация остаётся заблокированной отдельно и не мешает проверить остальные части карточки.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/seo-engine/draft-preview?product_id=b6e0171f-4d42-4d71-88b1-ee0d4e0e109e" className="btn-ghost">Обычный preview</Link>
          <Link href="/admin" className="btn-ghost">Админка</Link>
        </div>
      </div>

      <FirstRealDraftClient />
    </section>
  </main>;
}
