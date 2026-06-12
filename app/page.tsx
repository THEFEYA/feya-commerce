import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_CARD_SELECT, STOREFRONT_VIEW_V3 } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getProducts() {
  const supabase = getSupabaseReadClient();
  if (!supabase) return [] as StorefrontProduct[];
  const { data } = await supabase.from(STOREFRONT_VIEW_V3).select(STOREFRONT_CARD_SELECT).limit(12);
  return (data || []) as StorefrontProduct[];
}

export default async function HomePage() {
  const products = await getProducts();
  const best = products.slice(0, 4);
  const fresh = products.slice(4, 8);
  const sale = products.slice(8, 12);

  return (
    <main className="page-shell">
      <div className="feya-announcement">Express DHL · Worldwide shipping · Made to order in our atelier</div>
      <header className="feya-header">
        <Link href="/" className="feya-logo">FEYA</Link>
        <nav className="feya-nav">
          <Link href="/">Home</Link><Link href="/shop">Shop</Link><Link href="/shop">Festival</Link><Link href="/shop">Stage</Link><Link href="/shop">Desert</Link><Link href="/shop">Editorial</Link><Link href="/admin">Atelier OS</Link>
        </nav>
        <div className="feya-actions"><span>⌕</span><span>♡</span><span>♙</span><span className="feya-bag">Bag · 0</span></div>
      </header>

      <section className="feya-hero">
        <div className="feya-kicker">Atelier · Berlin · Est. 2018 — Made to order</div>
        <h1>20% off every <em>made-to-order</em> piece.</h1>
        <p>Limited window across configurations. Bundle the Full Set for the best value. Hand-cut mirror acrylic, vegan leather harnesses and armor for festivals, performances and the desert sun.</p>
        <div className="feya-hero-actions"><Link className="feya-cta" href="/shop">Shop the sale ↗</Link><Link className="feya-cta secondary" href="/shop">Express ready in 7d ›</Link></div>
      </section>

      <div className="feya-content">
        <section className="section-head"><div><div className="feya-kicker">Best sellers · Editorial picks</div><h2>Stage-ready, made-to-order.</h2></div><Link href="/shop" className="feya-sort">All {products.length || 200} pieces ↗</Link></section>
        <section className="feya-grid">{best.map((product, index) => <ProductCard key={product.canonical_product_id} product={product} priority={index < 4} />)}</section>

        <section className="section-head"><div><div className="feya-kicker">Just dropped · New arrivals</div><h2>New for the desert run.</h2></div><Link href="/shop" className="feya-sort">View all ↗</Link></section>
        <section className="feya-grid">{fresh.map((product) => <ProductCard key={product.canonical_product_id} product={product} />)}</section>

        <section className="section-head"><div><div className="feya-kicker">Atelier special · −20% storewide</div><h2>Complete the look for less.</h2></div><Link href="/shop" className="feya-sort">Shop offers ↗</Link></section>
        <section className="feya-grid">{sale.map((product) => <ProductCard key={product.canonical_product_id} product={product} />)}</section>
      </div>
    </main>
  );
}
