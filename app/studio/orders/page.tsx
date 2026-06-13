import Link from 'next/link';

export default function StudioOrdersPage() {
  return <main className="relative min-h-screen">
    <section className="container-feya pt-[170px] pb-20">
      <div className="glass rounded-2xl p-8">
        <div className="eyebrow-gold mb-3">Orders moved</div>
        <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,68px)' }}>Admin orders</h1>
        <p className="mt-4 text-[var(--bone-dim)] max-w-xl">Order draft review now lives inside the FEYA Control Tower.</p>
        <Link href="/admin/orders" className="btn-chrome mt-6">Open admin orders</Link>
      </div>
    </section>
  </main>;
}
