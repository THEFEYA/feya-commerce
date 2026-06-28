import Link from 'next/link';
import { ProductDetailClient } from '@/components/ProductDetailClient';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { STOREFRONT_CARD_SELECT, STOREFRONT_PDP_SELECT, STOREFRONT_VIEW_V3 } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

type PageProps = { params: Promise<{ slug: string }> };

async function getProduct(slug: string): Promise<{ product: StorefrontProduct | null; related: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: null, related: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from(STOREFRONT_VIEW_V3)
    .select(STOREFRONT_PDP_SELECT)
    .eq('product_slug', slug)
    .maybeSingle();

  if (error) return { product: null, related: [], error: error.message };

  const { data: related } = await supabase
    .from(STOREFRONT_VIEW_V3)
    .select(STOREFRONT_CARD_SELECT)
    .limit(8);

  return { product: data as StorefrontProduct | null, related: (related || []) as StorefrontProduct[] };
}

export default async function ProductPreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, related, error } = await getProduct(slug);

  if (error) {
    return <main className="page-shell"><div className="feya-content"><div className="notice">{error}</div></div></main>;
  }
  if (!product) {
    return <main className="page-shell"><div className="feya-content"><div className="notice">Product not found.</div><Link className="feya-sort" href="/shop">Back to shop</Link></div></main>;
  }

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
      <ProductDetailClient product={product} related={related} />
    </main>
  );
}
