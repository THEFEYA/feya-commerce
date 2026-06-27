import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PHASE_A_STOREFRONT_LIMIT = 250;

async function getProducts(): Promise<{ products: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return { products: [], error: getMissingSupabaseEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_step7_storefront_products_api')
    .select('*')
    .limit(PHASE_A_STOREFRONT_LIMIT);

  if (error) {
    return { products: [], error: error.message };
  }

  return { products: (data || []) as StorefrontProduct[] };
}

export default async function ShopPage() {
  const { products, error } = await getProducts();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/" className="brand-mark">TheFEYA</Link>
          <div className="nav-links">
            <Link href="/admin">Admin</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Phase A read-only preview</div>
          <p>
            Live storefront preview connected to safe Supabase views. The next design pass will improve the visual system without replacing real data.
          </p>
        </section>

        <section className="section-head">
          <div>
            <h2>Shop preview</h2>
            <p className="muted">Read-only storefront candidates from the safe Supabase API view.</p>
          </div>
          <p className="muted">{products.length} loaded</p>
        </section>

        <div className="toolbar" aria-label="Planned storefront filters">
          <span className="filter-chip">All pieces</span>
          <span className="filter-chip">Festival</span>
          <span className="filter-chip">Stage</span>
          <span className="filter-chip">Armor</span>
          <span className="filter-chip">Acrylic</span>
          <span className="filter-chip">Needs final UX</span>
        </div>

        {error ? <div className="notice">{error}</div> : null}

        {!error && products.length === 0 ? (
          <div className="notice">
            No products returned from Supabase yet. Check that the safe storefront view has rows and that anon read access is enabled for this view.
          </div>
        ) : null}

        <section className="grid product-grid">
          {products.map((product) => (
            <ProductCard key={product.canonical_product_id} product={product} />
          ))}
        </section>
      </div>
    </main>
  );
}
