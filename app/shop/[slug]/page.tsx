import Image from 'next/image';
import Link from 'next/link';
import { ProductCard } from '@/components/ProductCard';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import { asConfigurations, asMediaGallery, categoryLabel, colorLabel, mainRegularPrice, money, optionLabel, optionPrice, salePrice, splitTitle, STOREFRONT_VIEW_V3 } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

type PageProps = { params: Promise<{ slug: string }> };

async function getProduct(slug: string): Promise<{ product: StorefrontProduct | null; related: StorefrontProduct[]; error?: string }> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { product: null, related: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase.from(STOREFRONT_VIEW_V3).select('*').eq('product_slug', slug).maybeSingle();
  if (error) return { product: null, related: [], error: error.message };

  const { data: related } = await supabase.from(STOREFRONT_VIEW_V3).select('*').limit(8);
  return { product: data as StorefrontProduct | null, related: (related || []) as StorefrontProduct[] };
}

function getMainOption(product: StorefrontProduct) {
  const options = asConfigurations(product);
  const full = options.find((option, index) => /full\s*set|complete/i.test(optionLabel(option, index)));
  return full || options[0] || null;
}

function getMedia(product: StorefrontProduct) {
  const gallery = asMediaGallery(product).filter((item) => item.url);
  if (gallery.length > 0) return gallery;
  return product.primary_image_url ? [{ url: product.primary_image_url, alt: product.primary_image_alt, media_type: 'image', is_primary: true }] : [];
}

export default async function ProductPreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, related, error } = await getProduct(slug);

  if (error) {
    return <main className="page-shell"><div className="feya-content"><div className="notice">{error}</div></div></main>;
  }
  if (!product) {
    return <main className="page-shell"><div className="feya-content"><div className="notice">Product not found.</div></div></main>;
  }

  const media = getMedia(product);
  const mainImage = media[0]?.url || product.primary_image_url;
  const { title, subtitle } = splitTitle(product);
  const options = asConfigurations(product).slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const selected = getMainOption(product);
  const regular = optionPrice(selected || {}) ?? mainRegularPrice(product);
  const sale = salePrice(regular);
  const currency = (selected?.currency || product.currency || 'EUR') as string;
  const color = colorLabel(product);
  const category = categoryLabel(product);
  const visibleRelated = related.filter((item) => item.canonical_product_id !== product.canonical_product_id).slice(0, 4);

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

      <section className="feya-pdp">
        <div className="feya-breadcrumb"><span>Atelier</span><span>›</span><span>Shop</span><span>›</span><span>{category}</span><span>›</span><span>{title}</span></div>
        <div className="feya-pdp-top">
          <div className="feya-gallery">
            <div className="feya-thumbs">
              {media.map((item, index) => (
                <div className="feya-thumb" key={`${item.url}-${index}`}>
                  <Image src={String(item.url)} alt={String(item.alt || title)} fill sizes="120px" />
                </div>
              ))}
            </div>
            <div className="feya-main-photo">
              {mainImage ? <Image src={mainImage} alt={product.primary_image_alt || title} fill priority sizes="(max-width: 900px) 92vw, 52vw" /> : <div className="feya-missing-image">Missing image</div>}
              <span className="feya-gallery-count">1 / {media.length || 1}</span>
            </div>
          </div>

          <aside className="feya-buybox">
            <h1>{title}</h1>
            {subtitle ? <p className="feya-subtitle">{subtitle}</p> : null}
            <div className="feya-pdp-price">
              <span className="feya-pdp-sale">{money(sale, currency) || 'Atelier price'}</span>
              {regular ? <span className="feya-pdp-old">{money(regular, currency)}</span> : null}
              <span className="feya-sale-chip">−20%</span>
              <span className="feya-pdp-range">Range {money(product.min_price, product.currency || currency)} – {money(product.max_price, product.currency || currency)}</span>
            </div>

            <div className="feya-form-block">
              <div className="feya-label-row"><span>Configuration</span><span>{product.pdp_option_count || options.length} options</span></div>
              <select className="feya-select" defaultValue={selected ? optionLabel(selected, 0) : ''}>
                {options.map((option, index) => <option key={`${option.configuration_id || option.source_price_row_id || index}`} value={optionLabel(option, index)}>{optionLabel(option, index)}</option>)}
              </select>
            </div>

            <div className="feya-value-note">✦ Best value for the complete look<br /><span>Bundle price — every piece styled to match.</span></div>

            <div className="feya-form-block">
              <div className="feya-label-row"><span>Color · {color}</span><span>1 shade</span></div>
              <div className="feya-color-row"><span className={`feya-filter-swatch`}><i className={`feya-swatch-${color.toLowerCase().replace(/[^a-z]+/g, '')}`} /></span></div>
            </div>

            <div className="feya-form-block">
              <div className="feya-label-row"><span>Size · M</span><span>Size guide</span></div>
              <div className="feya-size-row">{['XS','S','M','L','XL','XXL','XXXL','Custom'].map((size) => <span className={`feya-size-pill ${size === 'M' ? 'active' : ''}`} key={size}>{size}</span>)}</div>
            </div>

            <div className="feya-form-block">
              <div className="feya-label-row"><span>Delivery</span></div>
              <div className="feya-delivery-row"><div className="feya-delivery-card active"><strong>Standard UPS</strong><span>14–21 business days · Included</span></div><div className="feya-delivery-card"><strong>Express DHL</strong><span>7–10 business days · +$45</span></div></div>
              <p className="muted">Production time is calculated before shipping. Made to order.</p>
            </div>

            <div className="feya-timeline"><div><span>Ordered</span><strong>Jun 12</strong></div><div><span>Ready</span><strong>Jun 26 – Jul 03</strong></div><div><span>Delivered</span><strong>Jul 10 – Jul 24</strong></div></div>
            <div className="feya-total-row"><span>Total · 1 × {money(sale, currency)}</span><strong>{money(sale, currency)}</strong></div>
            <div className="feya-cta-row"><div className="feya-qty"><button>−</button><span>1</span><button>+</button></div><button className="feya-add">Add to bag</button></div>
            <button className="feya-buy">Buy it now ↗</button>
            <div className="feya-policy-row"><span>♡ Save</span><span>↗ Share</span><span>▱ Shipping</span><span>↻ Returns</span><span>▧ Store policies</span></div>
          </aside>
        </div>

        <section className="feya-description">
          <div>
            <div className="feya-kicker">About this piece</div>
            <h2>{title}</h2>
            <p>{product.meta_description || `${title} is a made-to-order TheFEYA statement piece for festivals, stage performance and editorial looks.`}</p>
            <p>Made for performers, dancers, DJs, drag queens, stylists and festival guests who want a reflective look with strong presence. Each piece is prepared by hand and styled to work as a centerpiece or part of a full look.</p>
            <p>Production is made to order in our atelier. We ship worldwide, tracked and insured, with standard and express delivery options shown above.</p>
          </div>
          <div className="feya-detail-list">
            <div><h3>What’s included</h3><p>Selected configuration, care note, and atelier packaging. Full set includes every listed component where available.</p></div>
            <div><h3>Sizing & fit</h3><p>Available in XS–XXXL standard sizing with custom sizing option.</p></div>
            <div><h3>Shipping & delivery</h3><p>Standard UPS 14–21 business days or Express DHL 7–10 business days after production.</p></div>
            <div><h3>Returns & exchanges</h3><p>Standard-size pieces follow store policy. Custom-sized pieces are final sale after production begins.</p></div>
            <div><h3>Handmade variation</h3><p>Each TheFEYA piece is handmade. Small differences in finish and fit are part of the signature, not a flaw.</p></div>
          </div>
        </section>

        <section className="section-head"><div><div className="feya-kicker">Complete the look</div><h2>Same world.</h2></div><Link href="/shop" className="feya-sort">View all ↗</Link></section>
        <section className="feya-grid">{visibleRelated.map((item) => <ProductCard key={item.canonical_product_id} product={item} />)}</section>
      </section>
    </main>
  );
}
