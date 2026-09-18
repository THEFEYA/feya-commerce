import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { absoluteSiteUrl, isSearchIndexingEnabled, isStructuredDataEnabled } from '@/lib/siteConfig';
import type { SeoPagePortfolioRow, StorefrontConfiguration, StorefrontProduct } from '@/lib/types';

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function getProduct(slug: string): Promise<{
  product: StorefrontProduct | null;
  portfolio: SeoPagePortfolioRow | null;
  error?: string;
}> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return { product: null, portfolio: null, error: getMissingSupabaseEnvMessage() };
  }

  const productResult = await supabase
    .from('feya_commerce_v_step7_storefront_products_api')
    .select('*')
    .eq('product_slug', slug)
    .maybeSingle();

  if (productResult.error) {
    return { product: null, portfolio: null, error: productResult.error.message };
  }

  const product = productResult.data as StorefrontProduct | null;
  if (!product) return { product: null, portfolio: null };

  const portfolioResult = await supabase
    .from('feya_commerce_v_seo_page_portfolio_safe_v1')
    .select('*')
    .eq('canonical_product_id', product.canonical_product_id)
    .eq('page_type', 'product')
    .eq('portfolio_status', 'active')
    .maybeSingle();

  return {
    product,
    portfolio: portfolioResult.error ? null : (portfolioResult.data as SeoPagePortfolioRow | null),
  };
}

function formatMoney(amount: number | null | undefined, currency = 'USD') {
  if (amount == null) return null;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPrice(product: StorefrontProduct) {
  const currency = product.currency || 'USD';
  const min = product.min_price;
  const max = product.max_price;

  if (min == null && max == null) return 'Price under review';

  if (min != null && max != null && min !== max) {
    return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
  }

  return formatMoney(min ?? max ?? 0, currency);
}

function getConfigurations(product: StorefrontProduct): StorefrontConfiguration[] {
  if (!Array.isArray(product.configurations)) return [];
  return product.configurations as StorefrontConfiguration[];
}

function getConfigurationLabel(configuration: StorefrontConfiguration, index: number) {
  return String(
    configuration.configuration_label ||
      configuration.configuration_name ||
      configuration.option_value ||
      configuration.raw_option_value ||
      configuration.title ||
      configuration.label ||
      `Configuration ${index + 1}`,
  );
}

function isProductIndexable(product: StorefrontProduct, portfolio: SeoPagePortfolioRow | null) {
  return Boolean(
    isSearchIndexingEnabled() &&
      product.storefront_candidate_flag &&
      portfolio?.indexation_intent === 'indexable' &&
      portfolio?.portfolio_status === 'active',
  );
}

function getProductName(product: StorefrontProduct) {
  return product.h1 || product.card_title || 'TheFEYA product';
}

function buildProductStructuredData(product: StorefrontProduct, canonicalUrl: string, indexable: boolean) {
  if (!isStructuredDataEnabled() || !indexable) return null;
  if (product.has_fallback_price) return null;
  if (product.min_price == null || product.max_price == null || product.min_price !== product.max_price) return null;
  if (!product.currency || !product.primary_image_url) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonicalUrl}#product`,
    name: getProductName(product),
    image: [product.primary_image_url],
    ...(product.meta_description ? { description: product.meta_description } : {}),
    ...(product.material ? { material: product.material } : {}),
    ...(product.color ? { color: product.color } : {}),
    brand: {
      '@type': 'Brand',
      name: 'TheFEYA',
    },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: product.currency,
      price: product.min_price,
    },
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product, portfolio } = await getProduct(slug);

  if (!product) {
    return {
      title: 'Product not found',
      robots: { index: false, follow: false },
    };
  }

  const canonicalUrl = absoluteSiteUrl(`/shop/${slug}`);
  const indexable = isProductIndexable(product, portfolio);
  const title = product.seo_title || product.h1 || product.card_title || 'TheFEYA product';
  const description = product.meta_description || undefined;

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: indexable,
      follow: indexable,
      nocache: !indexable,
    },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      title,
      ...(description ? { description } : {}),
      ...(product.primary_image_url
        ? { images: [{ url: product.primary_image_url, alt: product.primary_image_alt || title }] }
        : {}),
    },
    twitter: {
      card: product.primary_image_url ? 'summary_large_image' : 'summary',
      title,
      ...(description ? { description } : {}),
      ...(product.primary_image_url ? { images: [product.primary_image_url] } : {}),
    },
  };
}

function getConfigurationPrice(configuration: StorefrontConfiguration, fallbackCurrency: string | null) {
  const currency = configuration.currency || fallbackCurrency || 'USD';
  const single = configuration.price_amount ?? configuration.price ?? configuration.amount;

  if (single != null) return formatMoney(single, currency);

  const min = configuration.min_price;
  const max = configuration.max_price;

  if (min != null && max != null && min !== max) {
    return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
  }

  if (min != null || max != null) return formatMoney(min ?? max, currency);

  return 'Price under review';
}

export default async function ProductPreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, portfolio, error } = await getProduct(slug);
  const configurations = product ? getConfigurations(product).slice(0, 8) : [];
  const canonicalUrl = absoluteSiteUrl(`/shop/${slug}`);
  const indexable = product ? isProductIndexable(product, portfolio) : false;
  const structuredData = product ? buildProductStructuredData(product, canonicalUrl, indexable) : null;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/" className="brand-mark">TheFEYA</Link>
          <div className="nav-links">
            <Link href="/shop">Shop</Link>
            <Link href="/admin">Admin</Link>
          </div>
        </nav>

        {error ? <div className="notice">{error}</div> : null}

        {!error && !product ? <div className="notice">Product not found.</div> : null}

        {product ? (
          <>
            {structuredData ? (
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
                }}
              />
            ) : null}
            <section className="grid pdp-grid">
              <ProductCard product={product} />
              <div className="card pdp-panel">
                <p className="badge">Read-only PDP preview</p>
                <h1>{product.h1 || product.card_title || 'Untitled product'}</h1>
                <p className="muted">{product.meta_description || 'Description draft is not approved yet.'}</p>
                <div className="pdp-price">{formatPrice(product)}</div>
                <div className="badge-row">
                  {product.material ? <span className="badge">{product.material}</span> : null}
                  {product.color ? <span className="badge">{product.color}</span> : null}
                  {product.size_mode ? <span className="badge">{product.size_mode}</span> : null}
                  {product.public_configuration_count ? <span className="badge">{product.public_configuration_count} configurations</span> : null}
                  {product.has_fallback_price ? <span className="badge">Fallback price review</span> : null}
                  {product.handmade_flag ? <span className="badge">Handmade</span> : null}
                </div>
                <div className="notice" style={{ marginTop: '24px' }}>
                  Product options are read-only in Phase B. Configuration selector and Add to Bag will be added only after review flows are stable.
                </div>
              </div>
            </section>

            <section className="section-head">
              <div>
                <h2>Configurations</h2>
                <p className="muted">Read-only view of available set/option logic from Supabase.</p>
              </div>
            </section>

            {configurations.length > 0 ? (
              <div className="configuration-list">
                {configurations.map((configuration, index) => (
                  <div className="configuration-card" key={`${getConfigurationLabel(configuration, index)}-${index}`}>
                    <div className="section-head" style={{ margin: 0 }}>
                      <h3>{getConfigurationLabel(configuration, index)}</h3>
                      <span className="status-pill warning">{getConfigurationPrice(configuration, product.currency)}</span>
                    </div>
                    <p>
                      Future selector row. Components, size/color/material options and exact buy-box behavior will be reviewed in Product Builder before checkout is added.
                    </p>
                    {configuration.has_fallback_price ? <div className="badge-row"><span className="badge">Fallback price review</span></div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="notice">No configuration payload available yet. Treat this as a whole-product draft until Product Builder review.</div>
            )}

            <section className="grid pdp-section-grid">
              <div className="card pdp-info-block">
                <h3>What’s included</h3>
                <p>Will be generated from component/configuration data. Must clearly state what is included and what is not included.</p>
              </div>
              <div className="card pdp-info-block">
                <h3>Materials & care</h3>
                <p>Will use canonical material data and TheFEYA snippet rules. Avoid wrong material claims.</p>
              </div>
              <div className="card pdp-info-block">
                <h3>Sizing & fit</h3>
                <p>Will explain adjustable/custom sizing, measurements and fit notes before launch.</p>
              </div>
              <div className="card pdp-info-block">
                <h3>Production time</h3>
                <p>Default handmade production logic will be shown here after content approval.</p>
              </div>
              <div className="card pdp-info-block">
                <h3>Shipping & returns</h3>
                <p>Short commercial summary with detailed policy links later. No tax/customs promises without policy review.</p>
              </div>
              <div className="card pdp-info-block">
                <h3>Handmade / styled imagery note</h3>
                <p>Will explain handmade variation and styled/AI-assisted imagery flags where relevant.</p>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
