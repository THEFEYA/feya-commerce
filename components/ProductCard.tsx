import Image from 'next/image';
import Link from 'next/link';
import type { StorefrontProduct } from '@/lib/types';

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

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const slug = product.product_slug || product.canonical_product_id;
  const title = product.card_title || product.h1 || 'Untitled product';
  const imageUrl = product.primary_image_url;

  return (
    <Link className="card" href={`/shop/${slug}`}>
      <div style={{ position: 'relative', aspectRatio: '4 / 5', background: '#171720' }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.primary_image_alt || title}
            fill
            sizes="(max-width: 700px) 100vw, 260px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'grid', height: '100%', placeItems: 'center', color: '#aaa2a0' }}>
            Missing image
          </div>
        )}
      </div>
      <div className="card-body">
        <h3>{title}</h3>
        <div className="muted">{formatPrice(product)}</div>
        <div className="badge-row">
          {product.material ? <span className="badge">{product.material}</span> : null}
          {product.color ? <span className="badge">{product.color}</span> : null}
          {product.public_configuration_count ? <span className="badge">{product.public_configuration_count} options</span> : null}
          {product.has_fallback_price ? <span className="badge">Price review</span> : null}
        </div>
      </div>
    </Link>
  );
}
