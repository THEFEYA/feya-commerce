import Link from 'next/link';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type {
  AdminProductBuilderDetail,
  ProductBuilderConfiguration,
  ProductBuilderContentItem,
  ProductBuilderMatchItem,
  ProductBuilderMediaItem,
  ProductBuilderPrice,
} from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

async function getProduct(id: string): Promise<{ product: AdminProductBuilderDetail | null; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return { product: null, error: getMissingSupabaseEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_step6_product_builder_detail')
    .select('*')
    .eq('canonical_product_id', id)
    .maybeSingle();

  if (error) {
    return { product: null, error: error.message };
  }

  return { product: data as AdminProductBuilderDetail | null };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function getStatusClass(value: unknown) {
  const normalized = asText(value, '').toLowerCase();

  if (normalized.includes('ready') || normalized.includes('approved') || normalized.includes('matched') || normalized.includes('ok')) {
    return 'ok';
  }

  if (normalized.includes('block') || normalized.includes('missing') || normalized.includes('error') || normalized.includes('reject')) {
    return 'danger';
  }

  return 'warning';
}

function formatMoney(value: number | null | undefined, currency?: string | null) {
  if (value == null) return '—';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} ${currency || ''}`.trim();
  }
}

function getConfigurations(product: AdminProductBuilderDetail): ProductBuilderConfiguration[] {
  return Array.isArray(product.configurations) ? product.configurations : [];
}

function getMedia(product: AdminProductBuilderDetail): ProductBuilderMediaItem[] {
  return Array.isArray(product.media_items) ? product.media_items : [];
}

function getContent(product: AdminProductBuilderDetail): ProductBuilderContentItem[] {
  return Array.isArray(product.content_items) ? product.content_items : [];
}

function getMatches(product: AdminProductBuilderDetail): ProductBuilderMatchItem[] {
  return Array.isArray(product.match_items) ? product.match_items : [];
}

function getPrices(configuration: ProductBuilderConfiguration): ProductBuilderPrice[] {
  return Array.isArray(configuration.prices) ? configuration.prices : [];
}

function yesNo(value: boolean | null | undefined) {
  if (value == null) return '—';
  return value ? 'Yes' : 'No';
}

function Fact({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="card pdp-info-block">
      <h3>{label}</h3>
      <p>{asText(value)}</p>
    </div>
  );
}

export default async function AdminProductBuilderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { product, error } = await getProduct(id);

  if (error) {
    return (
      <main className="page-shell">
        <div className="container">
          <nav className="top-nav">
            <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
            <div className="nav-links">
              <Link href="/admin/products">Products</Link>
              <Link href="/admin/review">Review</Link>
              <Link href="/admin/seo-keywords">SEO Keywords</Link>
            </div>
          </nav>
          <div className="notice">{error}</div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="page-shell">
        <div className="container">
          <nav className="top-nav">
            <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
            <div className="nav-links"><Link href="/admin/products">Products</Link></div>
          </nav>
          <div className="notice">Product not found.</div>
        </div>
      </main>
    );
  }

  const configurations = getConfigurations(product);
  const media = getMedia(product);
  const content = getContent(product);
  const matches = getMatches(product);

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/review">Review</Link>
            <Link href="/admin/seo-keywords">SEO Keywords</Link>
            <Link href="/shop">Shop</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Product Builder · read-only truth surface</div>
          <h1>{product.card_title || product.draft_site_title || product.h1 || 'Untitled product'}</h1>
          <p>
            This page reads the existing safe Product Builder aggregate. It does not edit Product Truth, pricing, media, SEO or publication state.
          </p>
          <div className="badge-row">
            <span className={`status-pill ${getStatusClass(product.readiness_status)}`}>{asText(product.readiness_status, 'unknown readiness')}</span>
            <span className={`status-pill ${getStatusClass(product.publish_status)}`}>{asText(product.publish_status, 'draft')}</span>
            {product.do_not_publish_flag ? <span className="status-pill danger">Do not publish</span> : null}
            {product.handmade_flag ? <span className="badge">Handmade</span> : null}
            {product.styled_imagery_flag ? <span className="badge">Styled imagery</span> : null}
          </div>
        </section>

        <section className="section-head">
          <div>
            <h2>Identity & source</h2>
            <p className="muted">Canonical identity stays separate from Etsy/source identifiers.</p>
          </div>
        </section>

        <section className="grid pdp-section-grid">
          <Fact label="Canonical product ID" value={product.canonical_product_id} />
          <Fact label="Source shop" value={product.source_shop_code} />
          <Fact label="Etsy listing ID" value={product.matched_etsy_listing_id} />
          <Fact label="Primary source listing ID" value={product.primary_source_listing_id} />
        </section>

        {product.source_url ? (
          <div className="notice" style={{ marginTop: '18px' }}>
            Source evidence: <a href={product.source_url} target="_blank" rel="noreferrer">{product.source_url}</a>
          </div>
        ) : null}

        <section className="section-head">
          <div>
            <h2>Current product facts</h2>
            <p className="muted">Read-only operational facts currently available to the Product OS.</p>
          </div>
        </section>

        <section className="grid pdp-section-grid">
          <Fact label="Product type" value={product.product_type} />
          <Fact label="Material" value={product.material} />
          <Fact label="Color" value={product.color} />
          <Fact label="Size mode" value={product.size_mode} />
          <Fact label="Production profile" value={product.production_profile} />
          <Fact label="Shipping profile" value={product.shipping_profile} />
          <Fact label="Handmade" value={yesNo(product.handmade_flag)} />
          <Fact label="Styled imagery" value={yesNo(product.styled_imagery_flag)} />
        </section>

        <section className="section-head">
          <div>
            <h2>Content & SEO draft</h2>
            <p className="muted">Current draft values only. No automatic rewriting on this screen.</p>
          </div>
        </section>

        <section className="grid pdp-section-grid">
          <Fact label="Draft site title" value={product.draft_site_title} />
          <Fact label="Card title" value={product.card_title} />
          <Fact label="H1" value={product.h1} />
          <Fact label="SEO title" value={product.seo_title} />
          <Fact label="Meta description" value={product.meta_description} />
          <Fact label="Internal notes" value={product.notes} />
        </section>

        <section className="section-head">
          <div>
            <h2>Configurations & prices</h2>
            <p className="muted">{configurations.length} configuration rows from the existing Product Builder contract.</p>
          </div>
        </section>

        {configurations.length ? (
          <div className="configuration-list">
            {configurations.map((configuration, index) => {
              const prices = getPrices(configuration);
              return (
                <div className="configuration-card" key={configuration.sellable_configuration_id || `configuration-${index}`}>
                  <div className="section-head" style={{ margin: 0 }}>
                    <div>
                      <h3>{configuration.configuration_name || configuration.normalized_key || `Configuration ${index + 1}`}</h3>
                      <p>{asText(configuration.normalized_key)}</p>
                    </div>
                    <span className={`status-pill ${getStatusClass(configuration.review_status)}`}>{asText(configuration.review_status, 'not reviewed')}</span>
                  </div>
                  <div className="badge-row">
                    {configuration.is_public_candidate ? <span className="badge">Public candidate</span> : <span className="badge">Not public</span>}
                    {configuration.is_sampler ? <span className="status-pill warning">Sampler</span> : null}
                    {configuration.is_default_whole_product ? <span className="badge">Whole product</span> : null}
                  </div>
                  <div className="configuration-list">
                    {prices.length ? prices.map((price, priceIndex) => (
                      <div className="configuration-card" key={price.configuration_price_id || `price-${priceIndex}`}>
                        <strong>{formatMoney(price.public_price_amount ?? price.manual_override_amount ?? price.source_amount, price.source_currency)}</strong>
                        <div className="badge-row">
                          <span className={`status-pill ${getStatusClass(price.review_status)}`}>{asText(price.review_status, 'not reviewed')}</span>
                          {price.fallback_flag ? <span className="status-pill warning">Fallback</span> : null}
                          {price.sampler_excluded_flag ? <span className="badge">Sampler excluded</span> : null}
                          {price.confidence != null ? <span className="badge">Confidence {price.confidence}</span> : null}
                        </div>
                      </div>
                    )) : <div className="notice">No price rows.</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className="notice">No configurations available.</div>}

        <section className="section-head">
          <div>
            <h2>Media</h2>
            <p className="muted">{media.length} media draft rows. This is readiness evidence, not a media editor.</p>
          </div>
        </section>

        {media.length ? (
          <div className="configuration-list">
            {media.map((item, index) => (
              <div className="configuration-card" key={item.media_draft_id || `media-${index}`}>
                <div className="section-head" style={{ margin: 0 }}>
                  <h3>Image {item.source_image_order ?? index + 1}</h3>
                  <span className={`status-pill ${getStatusClass(item.readiness_status)}`}>{asText(item.readiness_status, 'not started')}</span>
                </div>
                <p>{item.alt_text_draft || 'No alt draft.'}</p>
                <div className="badge-row">
                  {item.assigned_role ? <span className="badge">{item.assigned_role}</span> : null}
                  {item.ai_styled_image_flag ? <span className="badge">Styled / AI flag</span> : null}
                  {item.use_publicly_flag ? <span className="badge">Public candidate</span> : null}
                  <span className={`status-pill ${getStatusClass(item.review_status)}`}>{asText(item.review_status, 'not reviewed')}</span>
                </div>
                {item.source_image_url ? (
                  <p style={{ marginTop: '12px' }}>
                    <a href={item.source_image_url} target="_blank" rel="noreferrer">Open source image</a>
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : <div className="notice">No media rows.</div>}

        <section className="section-head">
          <div>
            <h2>Content drafts</h2>
            <p className="muted">{content.length} language/content rows.</p>
          </div>
        </section>

        {content.length ? (
          <div className="configuration-list">
            {content.map((item, index) => (
              <div className="configuration-card" key={item.content_draft_id || `content-${index}`}>
                <div className="section-head" style={{ margin: 0 }}>
                  <h3>{item.content_language || 'unknown language'}</h3>
                  <span className={`status-pill ${getStatusClass(item.review_status)}`}>{asText(item.review_status, 'not started')}</span>
                </div>
                <p><strong>H1:</strong> {asText(item.h1)}</p>
                <p><strong>SEO title:</strong> {asText(item.seo_title)}</p>
                <p><strong>Meta:</strong> {asText(item.meta_description)}</p>
                <div className="badge-row">
                  <span className="badge">AI: {asText(item.ai_content_status, 'not started')}</span>
                  <span className="badge">Snippets: {asText(item.snippet_status, 'not started')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="notice">No content draft rows.</div>}

        <section className="section-head">
          <div>
            <h2>Source matching</h2>
            <p className="muted">{matches.length} evidence rows connecting imported listings/prices to this canonical product.</p>
          </div>
        </section>

        {matches.length ? (
          <div className="configuration-list">
            {matches.map((item, index) => (
              <div className="configuration-card" key={item.listing_match_id || `match-${index}`}>
                <div className="section-head" style={{ margin: 0 }}>
                  <h3>{asText(item.match_status, 'match')}</h3>
                  <span className={`status-pill ${getStatusClass(item.review_status)}`}>{asText(item.review_status, 'not reviewed')}</span>
                </div>
                <p>{asText(item.notes)}</p>
                <div className="badge-row">
                  {item.match_confidence != null ? <span className="badge">Confidence {item.match_confidence}</span> : null}
                  {item.do_not_import_flag ? <span className="status-pill danger">Do not import</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : <div className="notice">No source matching rows.</div>}

        <section className="section-head">
          <div>
            <h2>Restricted SEO truth diagnostics</h2>
            <p className="muted">Not exposed on this open read-only admin route.</p>
          </div>
        </section>

        <div className="notice">
          SEO Product Truth v4 exists in Supabase but is intentionally not queried here because the current public read client has no SELECT permission on that view. It will be connected only after a protected admin boundary exists.
        </div>
      </div>
    </main>
  );
}
