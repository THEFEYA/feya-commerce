import Image from 'next/image';
import Link from 'next/link';
import type { StorefrontProduct } from '@/lib/types';
import { categoryLabel, colorLabel, mainRegularPrice, money, salePrice, slugFor, productTitle } from '@/lib/storefront';

export function ProductCard({ product, priority = false }: { product: StorefrontProduct; priority?: boolean }) {
  const slug = slugFor(product);
  const title = productTitle(product);
  const primary = product.primary_image_url;
  const hover = product.hover_image_url || product.secondary_image_url || primary;
  const currency = product.currency || 'EUR';
  const regular = mainRegularPrice(product);
  const sale = salePrice(regular);
  const hasManyOptions = Boolean(product.has_multiple_pdp_options || (product.pdp_option_count || 0) > 1);
  const color = colorLabel(product);

  return (
    <Link className="feya-product-card" href={`/shop/${slug}`}>
      <div className="feya-card-media">
        {primary ? (
          <>
            <Image
              className="feya-card-img feya-card-img-primary"
              src={primary}
              alt={product.primary_image_alt || title}
              fill
              priority={priority}
              sizes="(max-width: 740px) 92vw, (max-width: 1200px) 31vw, 25vw"
            />
            {hover && hover !== primary ? (
              <Image
                className="feya-card-img feya-card-img-hover"
                src={hover}
                alt=""
                fill
                sizes="(max-width: 740px) 92vw, (max-width: 1200px) 31vw, 25vw"
              />
            ) : null}
          </>
        ) : (
          <div className="feya-missing-image">Missing image</div>
        )}
        <span className="feya-card-shadow" />
        <span className="feya-sale-ribbon">−20% off</span>
        <span className="feya-quick-action">{hasManyOptions ? 'Choose options' : 'Add to bag'}</span>
      </div>

      <div className="feya-card-info">
        <h3 className="feya-card-title">{title}</h3>
        <div className="feya-card-meta">
          <span>{categoryLabel(product)} · {color}</span>
          <span className={`feya-swatch feya-swatch-${color.toLowerCase().replace(/[^a-z]+/g, '')}`} aria-label={color} />
        </div>
        <div className="feya-card-divider" />
        <div className="feya-price-row">
          <span className="feya-sale-price">{money(sale, currency) || 'Atelier price'}</span>
          {regular ? <span className="feya-old-price">{money(regular, currency)}</span> : null}
          <span className="feya-sale-chip">−20%</span>
          <span className="feya-view-link">View ↗</span>
        </div>
      </div>
    </Link>
  );
}
