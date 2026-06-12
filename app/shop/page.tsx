import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_VIEW_V3 } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STOREFRONT_LIMIT = 250;
const categories = ['All', 'Corsets', 'Harness', 'Masks', 'Armor', 'Bodysuits', 'Stage Looks', 'Skirts', 'Accessories'];
const colors = ['Gold', 'Silver', 'Black', 'White', 'Red', 'Holographic'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Custom'];
const materials = ['Mirror Acrylic', 'Vegan Leather', 'Mirror Chrome', 'Holographic Vinyl', 'Resin'];

async function getProducts(): Promise<{ products: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) return { products: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V3)
    .select('*')
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

      <nav className="feya-category-bar" aria-label="Product categories">
        {categories.map((category, index) => <Link key={category} href="/shop" className={`feya-category-link ${index === 0 ? 'active' : ''}`}>{category}</Link>)}
        <span className="feya-sort">Sort · Editorial pick ⌄</span>
      </nav>

      <section className="feya-shop-layout">
        <aside className="feya-filter-panel">
          <div className="feya-filter-title">Refine</div>
          <div className="feya-filter-group"><h4>Search</h4><input className="feya-search" placeholder="Search atelier…" /></div>
          <div className="feya-filter-group"><h4>Price</h4><div className="feya-price-range"><div className="feya-filter-values"><span>$0</span><span>$1000+</span></div><div className="feya-price-track" /><div className="feya-filter-values"><span>0</span><span>1000</span></div></div></div>
          <div className="feya-filter-group"><h4>Color</h4><div className="feya-filter-swatches">{colors.map((color) => <span className="feya-filter-swatch" key={color}><i className={`feya-swatch-${color.toLowerCase()}`} /><br />{color}</span>)}</div></div>
          <div className="feya-filter-group"><h4>Size</h4><div className="feya-size-grid">{sizes.map((size) => <span key={size}>{size}</span>)}</div></div>
          <div className="feya-filter-group"><h4>Material</h4>{materials.map((m) => <label className="feya-filter-check" key={m}><span />{m}</label>)}</div>
          <div className="feya-filter-group"><h4>Occasion / Event</h4>{['Festival', 'Stage', 'Burning Man', 'Editorial', 'Carnival'].map((m) => <label className="feya-filter-check" key={m}><span />{m}</label>)}</div>
        </aside>

        <div>
          <div className="feya-shop-main-head">
            <span>{products.length} of {products.length} pieces</span>
            <span className="feya-sort">Best sellers · Price · Newest</span>
          </div>
          {error ? <div className="notice">{error}</div> : null}
          {!error && products.length === 0 ? <div className="notice">No products returned from Supabase yet.</div> : null}
          <section className="feya-grid">
            {products.map((product, index) => <ProductCard key={product.canonical_product_id} product={product} priority={index < 4} />)}
          </section>
        </div>
      </section>
    </main>
  );
}
