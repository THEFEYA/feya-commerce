import Link from 'next/link';
import { ShopClient } from '@/components/ShopClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_CARD_SELECT, STOREFRONT_VIEW_V3 } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STOREFRONT_LIMIT = 250;

async function getProducts(): Promise<{ products: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V3)
    .select(STOREFRONT_CARD_SELECT)
    .limit(STOREFRONT_LIMIT);

  if (error) return { products: [], error: error.message };
  return { products: (data || []) as StorefrontProduct[] };
}

export default async function ShopPage() {
  const { products, error } = await getProducts();

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

      <section className="feya-shop-hero">
        <div className="feya-kicker">Atelier collection · Festival/Stage 26</div>
        <h1>The <em>shop</em></h1>
        <p>{products.length || 200} pieces, made to be seen. Filter by world, material or stage-readiness.</p>
      </section>

      <ShopClient products={products} error={error} />
    </main>
  );
}
