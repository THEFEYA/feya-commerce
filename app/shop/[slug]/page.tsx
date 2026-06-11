import { ProductCard } from '@/components/ProductCard';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { StorefrontProduct } from '@/lib/types';

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function getProduct(slug: string): Promise<{ product: StorefrontProduct | null; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return { product: null, error: getMissingSupabaseEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_step7_storefront_products_api')
    .select('*')
    .eq('product_slug', slug)
    .maybeSingle();

  if (error) {
    return { product: null, error: error.message };
  }

  return { product: data as StorefrontProduct | null };
}

function formatPrice(product: StorefrontProduct) {
  const currency = product.currency || 'USD';
  const min = product.min_price;
  const max = product.max_price;

  if (min == null && max == null) return 'Price under review';

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

  if (min != null && max != null && min !== max) {
    return `${formatter.format(min)} – ${formatter.format(max)}`;
  }

  return formatter.format(min ?? max ?? 0);
}

export default async function ProductPreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, error } = await getProduct(slug);

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <a href="/" className="brand-mark">TheFEYA</a>
          <div className="nav-links">
            <a href="/shop">Shop</a>
            <a href="/admin">Admin</a>
          </div>
        </nav>

        {error ? <div className="notice">{error}</div> : null}

        {!error && !product ? <div className="notice">Product not found.</div> : null}

        {product ? (
          <section className="grid" style={{ gridTemplateColumns: 'minmax(260px, 420px) 1fr', alignItems: 'start' }}>
            <ProductCard product={product} />
            <div className="card card-body">
              <p className="badge">Read-only PDP preview</p>
              <h1 style={{ fontSize: '48px', lineHeight: 1, letterSpacing: '-0.05em', margin: '18px 0' }}>
                {product.h1 || product.card_title || 'Untitled product'}
              </h1>
              <p className="muted">{product.meta_description || 'Description draft is not approved yet.'}</p>
              <h2>{formatPrice(product)}</h2>
              <div className="badge-row">
                {product.material ? <span className="badge">{product.material}</span> : null}
                {product.color ? <span className="badge">{product.color}</span> : null}
                {product.size_mode ? <span className="badge">{product.size_mode}</span> : null}
                {product.public_configuration_count ? <span className="badge">{product.public_configuration_count} configurations</span> : null}
                {product.has_fallback_price ? <span className="badge">Fallback price review</span> : null}
              </div>
              <div className="notice" style={{ marginTop: '24px' }}>
                Product options are read-only in Phase A. Configuration selector and Add to Bag will be added after review flows are stable.
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
