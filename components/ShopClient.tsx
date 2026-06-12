// @ts-nocheck
'use client';

import { useMemo, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { categoryLabel, colorLabel, mainRegularPrice, materialMatches, productTitle } from '@/lib/storefront';

const categories = ['All', 'Corsets', 'Harness', 'Masks', 'Armor', 'Bodysuits', 'Stage Looks', 'Skirts', 'Accessories'];
const colors = ['Gold', 'Silver', 'Black', 'White', 'Red', 'Holographic'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Custom'];
const materials = ['Mirror Acrylic', 'Vegan Leather', 'Mirror Chrome', 'Holographic Vinyl', 'Resin'];
const occasions = ['Festival', 'Stage', 'Burning Man', 'Editorial', 'Carnival'];
const sortOptions = ['Editorial pick', 'Newest', 'Price low to high', 'Price high to low', 'Best sellers'];

function includesText(product, query) {
  if (!query.trim()) return true;
  const haystack = [productTitle(product), product.meta_description, product.material, product.color, product.product_type]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function textHas(product, value) {
  return [productTitle(product), product.meta_description, product.material, product.color, product.product_type]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(value.toLowerCase());
}

export function ShopClient({ products, error }) {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedOccasion, setSelectedOccasion] = useState(null);
  const [sort, setSort] = useState('Editorial pick');

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      const price = mainRegularPrice(product) || 0;
      if (!includesText(product, search)) return false;
      if (category !== 'All' && categoryLabel(product) !== category) return false;
      if (price < minPrice || price > maxPrice) return false;
      if (selectedColor && colorLabel(product) !== selectedColor) return false;
      if (selectedSize === 'Custom' && product.size_mode !== 'custom') return false;
      if (selectedMaterial && !materialMatches(product, selectedMaterial)) return false;
      if (selectedOccasion && !textHas(product, selectedOccasion)) return false;
      return true;
    });

    return [...result].sort((a, b) => {
      const priceA = mainRegularPrice(a) || 0;
      const priceB = mainRegularPrice(b) || 0;
      if (sort === 'Price low to high') return priceA - priceB;
      if (sort === 'Price high to low') return priceB - priceA;
      if (sort === 'Newest') return String(b.matched_etsy_listing_id || '').localeCompare(String(a.matched_etsy_listing_id || ''));
      if (sort === 'Best sellers') return Number(Boolean(b.storefront_candidate_flag)) - Number(Boolean(a.storefront_candidate_flag));
      return 0;
    });
  }, [products, search, category, minPrice, maxPrice, selectedColor, selectedSize, selectedMaterial, selectedOccasion, sort]);

  const clearFilters = () => {
    setCategory('All');
    setSearch('');
    setMinPrice(0);
    setMaxPrice(1000);
    setSelectedColor(null);
    setSelectedSize(null);
    setSelectedMaterial(null);
    setSelectedOccasion(null);
    setSort('Editorial pick');
  };

  return (
    <>
      <nav className="feya-category-bar" aria-label="Product categories">
        {categories.map((item) => (
          <button key={item} className={`feya-category-link ${category === item ? 'active' : ''}`} type="button" onClick={() => setCategory(item)}>{item}</button>
        ))}
        <label className="feya-sort feya-sort-select">Sort ·<select value={sort} onChange={(event) => setSort(event.target.value)}>{sortOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
      </nav>

      <section className="feya-shop-layout">
        <aside className="feya-filter-panel">
          <div className="feya-filter-title">Refine</div>
          <div className="feya-filter-group"><h4>Search</h4><input className="feya-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search atelier…" /></div>
          <div className="feya-filter-group"><h4>Price</h4><div className="feya-price-range"><div className="feya-filter-values"><span>€{minPrice}</span><span>€{maxPrice}+</span></div><input className="feya-range-input" type="range" min="0" max="1000" step="10" value={minPrice} onChange={(event) => setMinPrice(Math.min(Number(event.target.value), maxPrice - 10))} /><input className="feya-range-input" type="range" min="0" max="1000" step="10" value={maxPrice} onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), minPrice + 10))} /><div className="feya-filter-values"><input value={minPrice} onChange={(event) => setMinPrice(Number(event.target.value) || 0)} /><span>to</span><input value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value) || 1000)} /></div></div></div>
          <div className="feya-filter-group"><h4>Color</h4><div className="feya-filter-swatches">{colors.map((color) => <button type="button" className={`feya-filter-swatch ${selectedColor === color ? 'active' : ''}`} key={color} onClick={() => setSelectedColor(selectedColor === color ? null : color)}><i className={`feya-swatch-${color.toLowerCase()}`} /><span>{color}</span></button>)}</div></div>
          <div className="feya-filter-group"><h4>Size</h4><div className="feya-size-grid">{sizes.map((size) => <button type="button" className={selectedSize === size ? 'active' : ''} key={size} onClick={() => setSelectedSize(selectedSize === size ? null : size)}>{size}</button>)}</div></div>
          <div className="feya-filter-group"><h4>Material</h4>{materials.map((m) => <button className={`feya-filter-check ${selectedMaterial === m ? 'active' : ''}`} type="button" key={m} onClick={() => setSelectedMaterial(selectedMaterial === m ? null : m)}><span />{m}</button>)}</div>
          <div className="feya-filter-group"><h4>Occasion / Event</h4>{occasions.map((m) => <button className={`feya-filter-check ${selectedOccasion === m ? 'active' : ''}`} type="button" key={m} onClick={() => setSelectedOccasion(selectedOccasion === m ? null : m)}><span />{m}</button>)}</div>
          <button className="feya-clear-filters" type="button" onClick={clearFilters}>Clear all</button>
        </aside>

        <div>
          <div className="feya-shop-main-head"><span>{filtered.length} of {products.length} pieces</span><span className="feya-sort">{sort}</span></div>
          {error ? <div className="notice">{error}</div> : null}
          {!error && products.length === 0 ? <div className="notice">No products returned from Supabase yet.</div> : null}
          {!error && products.length > 0 && filtered.length === 0 ? <div className="notice">No products match these filters. Clear filters or widen the price range.</div> : null}
          <section className="feya-grid">{filtered.map((product, index) => <ProductCard key={product.canonical_product_id} product={product} priority={index < 4} />)}</section>
        </div>
      </section>
    </>
  );
}
