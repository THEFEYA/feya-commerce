import { ProductCard } from '@/components/ProductCard';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { StorefrontProduct } from '@/lib/types';

async function getProducts(): Promise<{ products: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return { products: [], error: getMissingSupabaseEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_step7_storefront_products_api')
    .select('*')
    .limit(60);

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
          <a href="/" className="brand-mark">TheFEYA</a>
          <div className="nav-links">
            <a href="/admin">Admin</a>
          </div>
        </nav>

        <section className="section-head">
          <div>
            <h2>Shop preview</h2>
            <p className="muted">Read-only storefront candidates from the safe Supabase API view.</p>
          </div>
          <p className="muted">{products.length} loaded</p>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <section className="grid product-grid">
          {products.map((product) => (
            <ProductCard key={product.canonical_product_id} product={product} />
          ))}
        </section>
      </div>
    </main>
  );
}
