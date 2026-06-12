import Link from 'next/link';
import { Header } from '@/components/Header';

export default function CartPage() {
  return (
    <main className="relative min-h-screen">
      <Header />
      <section className="container-feya pt-36 pb-20">
        <div className="eyebrow-gold mb-4">Visual bag</div>
        <h1 className="display-section text-bone mb-8" style={{ fontSize: 'clamp(48px,7vw,90px)' }}>Your atelier bag.</h1>
        <div className="glass rounded-2xl p-8">
          <p className="text-[var(--bone-dim)] mb-6">Checkout will be connected later. For now this page keeps the visual shopping flow in place.</p>
          <Link href="/shop" className="btn-chrome">Continue shopping</Link>
        </div>
      </section>
    </main>
  );
}
