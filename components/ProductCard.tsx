'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { categoryLabel, colorOptions, mainRegularPrice, money, salePrice, slugFor, productTitle } from '@/lib/storefront';

function addVisualBagItem() {
  const key = 'feya_visual_bag';
  const current = Number.parseInt(window.localStorage?.getItem(key) || '0', 10) || 0;
  window.localStorage?.setItem(key, String(current + 1));
  window.dispatchEvent(new CustomEvent('feya-bag-updated', { detail: current + 1 }));
}

export function ProductCard({ product, priority = false }) {
  const [added, setAdded] = useState(false);
  const slug = slugFor(product);
  const title = productTitle(product);
  const primary = product.primary_image_url;
  const hover = product.hover_image_url || product.secondary_image_url || primary;
  const currency = product.currency || 'EUR';
  const regular = mainRegularPrice(product);
  const sale = salePrice(regular);
  const hasManyOptions = Boolean(product.has_multiple_pdp_options || (product.pdp_option_count || 0) > 1);
  const colors = useMemo(() => colorOptions(product).slice(0, 4), [product]);

  const quickAction = () => {
    if (hasManyOptions) {
      window.location.href = `/shop/${slug}`;
      return;
    }
    addVisualBagItem();
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <article className="feya-product-card">
      <Link className="feya-card-link" href={`/shop/${slug}`} aria-label={`View ${title}`}>
        <div className="feya-card-media">
          {primary ? (
            <>
              <Image className="feya-card-img feya-card-img-primary" src={primary} alt={product.primary_image_alt || title} fill priority={priority} sizes="(max-width: 740px) 92vw, (max-width: 1200px) 31vw, 25vw" />
              {hover && hover !== primary ? <Image className="feya-card-img feya-card-img-hover" src={hover} alt="" fill sizes="(max-width: 740px) 92vw, (max-width: 1200px) 31vw, 25vw" /> : null}
            </>
          ) : <div className="feya-missing-image">Missing image</div>}
          <span className="feya-card-shadow" />
        </div>

        <div className="feya-card-info">
          <h3 className="feya-card-title">{title}</h3>
          <div className="feya-card-meta">
            <span>{categoryLabel(product)}</span>
            <span className="feya-card-swatches">
              {colors.map((color) => <i key={color} className={`feya-swatch feya-swatch-${color.toLowerCase().replace(/[^a-z]+/g, '')}`} aria-label={color} />)}
            </span>
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
      <button className="feya-quick-action" type="button" onClick={quickAction}>{added ? 'Added' : hasManyOptions ? 'Choose options' : 'Add to bag'}</button>
    </article>
  );
}
