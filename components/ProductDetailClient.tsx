// @ts-nocheck
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { asConfigurations, asMediaGallery, categoryLabel, colorLabel, colorOptions, mainRegularPrice, money, optionLabel, optionPrice, salePrice, splitTitle } from '@/lib/storefront';

function fallbackMedia(product) {
  const gallery = asMediaGallery(product).filter((item) => item.url);
  if (gallery.length > 0) return gallery;
  return product.primary_image_url ? [{ url: product.primary_image_url, alt: product.primary_image_alt, media_type: 'image', is_primary: true }] : [];
}

function sortedOptions(product) {
  return asConfigurations(product).slice().sort((a, b) => {
    const sortA = Number(a.sort_order || 0);
    const sortB = Number(b.sort_order || 0);
    if (sortA !== sortB) return sortA - sortB;
    return (optionPrice(a) || 0) - (optionPrice(b) || 0);
  });
}

function optionKey(option, index) {
  return String(option.configuration_id || option.configuration_price_id || option.source_price_row_id || option.sellable_configuration_id || index);
}

function getDefaultOption(options) {
  return options.find((option, index) => /full\s*set|complete/i.test(optionLabel(option, index))) || options[0] || null;
}

function storeBag(product, qty, option, size, delivery) {
  const key = 'feya_visual_bag_items';
  const current = JSON.parse(window.localStorage?.getItem(key) || '[]');
  current.push({ id: `${product.canonical_product_id}-${Date.now()}`, product_id: product.canonical_product_id, title: product.card_title || product.h1, qty, option: option ? optionLabel(option) : null, size, delivery });
  window.localStorage?.setItem(key, JSON.stringify(current));
  window.localStorage?.setItem('feya_visual_bag', String(current.length));
  window.dispatchEvent(new CustomEvent('feya-bag-updated', { detail: current.length }));
}

export function ProductDetailClient({ product, related }) {
  const media = useMemo(() => fallbackMedia(product), [product]);
  const options = useMemo(() => sortedOptions(product), [product]);
  const defaultOption = useMemo(() => getDefaultOption(options), [options]);
  const [selectedKey, setSelectedKey] = useState(defaultOption ? optionKey(defaultOption, options.indexOf(defaultOption)) : '');
  const [selectedMedia, setSelectedMedia] = useState(0);
  const [size, setSize] = useState('M');
  const [delivery, setDelivery] = useState('standard');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const selectedOption = options.find((option, index) => optionKey(option, index) === selectedKey) || defaultOption;
  const regular = optionPrice(selectedOption) ?? mainRegularPrice(product);
  const sale = salePrice(regular);
  const currency = selectedOption?.currency || product.currency || 'EUR';
  const deliveryPrice = delivery === 'express' ? 45 : 0;
  const total = sale != null ? sale * qty + deliveryPrice : null;
  const { title, subtitle } = splitTitle(product);
  const category = categoryLabel(product);
  const colors = colorOptions(product).slice(0, 5);
  const visibleRelated = related.filter((item) => item.canonical_product_id !== product.canonical_product_id).slice(0, 4);
  const hasFullSet = Boolean(options.find((option, index) => /full\s*set|complete/i.test(optionLabel(option, index))));
  const selectedImage = media[selectedMedia]?.url || product.primary_image_url;

  const addToBag = () => {
    storeBag(product, qty, selectedOption || null, size, delivery);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <section className="feya-pdp">
      <div className="feya-breadcrumb"><span>Atelier</span><span>›</span><Link href="/shop">Shop</Link><span>›</span><span>{category}</span><span>›</span><span>{title}</span></div>
      <div className="feya-pdp-top">
        <div className="feya-gallery">
          <div className="feya-thumbs">
            {media.map((item, index) => <button className={`feya-thumb ${selectedMedia === index ? 'active' : ''}`} key={`${item.url}-${index}`} type="button" onClick={() => setSelectedMedia(index)}><Image src={String(item.url)} alt={String(item.alt || title)} fill sizes="120px" /></button>)}
          </div>
          <div className="feya-main-photo">{selectedImage ? <Image src={String(selectedImage)} alt={product.primary_image_alt || title} fill priority sizes="(max-width: 900px) 92vw, 52vw" /> : <div className="feya-missing-image">Missing image</div>}<span className="feya-gallery-count">{selectedMedia + 1} / {media.length || 1}</span></div>
        </div>

        <aside className="feya-buybox">
          <h1>{title}</h1>
          {subtitle ? <p className="feya-subtitle">{subtitle}</p> : null}
          <div className="feya-pdp-price"><span className="feya-pdp-sale">{money(sale, currency) || 'Atelier price'}</span>{regular ? <span className="feya-pdp-old">{money(regular, currency)}</span> : null}<span className="feya-sale-chip">−20%</span>{product.min_price && product.max_price ? <span className="feya-pdp-range">Range {money(product.min_price, product.currency || currency)} – {money(product.max_price, product.currency || currency)}</span> : null}</div>

          <div className="feya-form-block"><div className="feya-label-row"><span>Configuration</span><span>{product.pdp_option_count || options.length} options</span></div><select className="feya-select" value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>{options.map((option, index) => <option key={optionKey(option, index)} value={optionKey(option, index)}>{optionLabel(option, index)}</option>)}</select></div>
          {hasFullSet ? <div className="feya-value-note">✦ Best value for the complete look<br /><span>Full Set is styled as the best bundle option. Savings logic will be finalized in the pricing module.</span></div> : null}

          <div className="feya-form-block"><div className="feya-label-row"><span>Color · {colorLabel(product)}</span><span>{colors.length} shade{colors.length > 1 ? 's' : ''}</span></div><div className="feya-color-row">{colors.map((color) => <button key={color} type="button" className="feya-filter-swatch"><i className={`feya-swatch-${color.toLowerCase().replace(/[^a-z]+/g, '')}`} /><span>{color}</span></button>)}</div></div>
          <div className="feya-form-block"><div className="feya-label-row"><span>Size · {size}</span><a href="#sizing">Size guide</a></div><div className="feya-size-row">{['XS','S','M','L','XL','XXL','XXXL','Custom'].map((item) => <button type="button" className={`feya-size-pill ${item === size ? 'active' : ''}`} key={item} onClick={() => setSize(item)}>{item}</button>)}</div></div>
          <div className="feya-form-block"><div className="feya-label-row"><span>Delivery</span></div><div className="feya-delivery-row"><button type="button" className={`feya-delivery-card ${delivery === 'standard' ? 'active' : ''}`} onClick={() => setDelivery('standard')}><strong>Standard UPS</strong><span>14–21 business days · Included</span></button><button type="button" className={`feya-delivery-card ${delivery === 'express' ? 'active' : ''}`} onClick={() => setDelivery('express')}><strong>Express DHL</strong><span>7–10 business days · +$45</span></button></div><p className="muted">Production time is calculated before shipping. Made to order.</p></div>

          <div className="feya-timeline"><div><span>Ordered</span><strong>Jun 12</strong></div><div><span>Ready</span><strong>Jun 26 – Jul 03</strong></div><div><span>Delivered</span><strong>{delivery === 'express' ? 'Jul 03 – Jul 10' : 'Jul 10 – Jul 24'}</strong></div></div>
          <div className="feya-total-row"><span>Total · {qty} × {money(sale, currency)}{delivery === 'express' ? ' + DHL' : ''}</span><strong>{money(total, currency)}</strong></div>
          <div className="feya-cta-row"><div className="feya-qty"><button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span>{qty}</span><button type="button" onClick={() => setQty(qty + 1)}>+</button></div><button className="feya-add" type="button" onClick={addToBag}>{added ? 'Added' : 'Add to bag'}</button></div>
          <button className="feya-buy" type="button" onClick={addToBag}>Buy it now ↗</button>
          <div className="feya-policy-row"><a href="#save">♡ Save</a><a href="#share">↗ Share</a><a href="#shipping">▱ Shipping</a><a href="#returns">↻ Returns</a><a href="#policies">▧ Store policies</a></div>
        </aside>
      </div>

      <section className="feya-description"><div><div className="feya-kicker">About this piece</div><h2>{title}</h2><p>{product.meta_description || `${title} is a made-to-order TheFEYA statement piece for festivals, stage performance and editorial looks.`}</p><p>Made for performers, dancers, DJs, drag queens, stylists and festival guests who want a reflective look with strong presence. Each piece is prepared by hand and styled to work as a centerpiece or part of a full look.</p><p>Production is made to order in our atelier. We ship worldwide, tracked and insured, with standard and express delivery options shown above.</p></div><div className="feya-detail-list"><div><h3>What’s included</h3><p>Selected configuration, care note, and atelier packaging. Full set includes every listed component where available.</p></div><div id="sizing"><h3>Sizing & fit</h3><p>Available in XS–XXXL standard sizing with custom sizing option.</p></div><div id="shipping"><h3>Shipping & delivery</h3><p>Standard UPS 14–21 business days or Express DHL 7–10 business days after production.</p></div><div id="returns"><h3>Returns & exchanges</h3><p>Standard-size pieces follow store policy. Custom-sized pieces are final sale after production begins.</p></div><div><h3>Handmade variation</h3><p>Each TheFEYA piece is handmade. Small differences in finish and fit are part of the signature, not a flaw.</p></div></div></section>
      <section className="section-head"><div><div className="feya-kicker">Complete the look</div><h2>Same world.</h2></div><Link href="/shop" className="feya-sort">View all ↗</Link></section>
      <section className="feya-grid">{visibleRelated.map((item) => <ProductCard key={item.canonical_product_id} product={item} />)}</section>
    </section>
  );
}
