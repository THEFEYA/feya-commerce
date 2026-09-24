import type { StorefrontProduct } from './types.ts';
import { categoryLabel, colorLabel, mainRegularPrice, productTitle } from './storefront.ts';
import { getPublicCollection, productMatchesCollection } from './public-collections.ts';

export const SHOP_PAGE_SIZE = 20;
export const CATEGORIES = ['All', 'Corsets', 'Harness', 'Masks', 'Armor', 'Bodysuits', 'Stage Looks', 'Skirts', 'Accessories'];
export const COLORS = ['Gold', 'Silver', 'Black', 'White', 'Red', 'Holographic'];
export const SIZES = ['XS','S','M','L','XL','XXL','XXXL','Custom'];
export const MATERIALS = ['Mirror Acrylic', 'Vegan Leather', 'Mirror Chrome', 'Holographic Vinyl', 'Resin'];
export const OCCASIONS = ['Festival', 'Stage', 'Burning Man', 'Editorial', 'Carnival'];
export const STYLES = ['Desert', 'Rave', 'Stage', 'Editorial', 'Futuristic', 'Goddess', 'Warrior'];
export const PRODUCTION_TIMES = ['7–10 days', '14–21 days', '21–28 days', '30+ days'];
export const SORTS = ['Editorial pick', 'Best sellers', 'Price · low to high', 'Price · high to low', 'Newest'];

export type ShopFilters = {
  category: string; priceMin: number; priceMax: number; color: string; size: string;
  material: string; occasion: string[]; style: string[]; productionTime: string;
  search: string; sort: string; collection: string;
};
export const defaultShopFilters = (): ShopFilters => ({ category: 'All', priceMin: 0, priceMax: 1000,
  color: '', size: '', material: '', occasion: [], style: [], productionTime: '', search: '', sort: SORTS[0], collection: '' });
export type ShopNavigation = { page: number; filters: ShopFilters };
const allowed = (value: string, values: string[]) => values.find(v => v.toLowerCase() === value.toLowerCase()) ?? '';

export function parseShopNavigation(params: Record<string, string | string[] | undefined>): ShopNavigation | null {
  const scalar = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
  const known = ['page','category','min','max','color','size','material','occasion','style','production','search','sort','collection'];
  if (known.some(k => Array.isArray(params[k]))) return null;
  const rawPage = scalar('page');
  if (rawPage && !/^[1-9][0-9]*$/.test(rawPage)) return null;
  const page = rawPage ? Number(rawPage) : 1;
  if (!Number.isSafeInteger(page)) return null;
  const filters = defaultShopFilters();
  for (const [key, values] of Object.entries({category:CATEGORIES,color:COLORS,size:SIZES,material:MATERIALS,sort:SORTS})) {
    const value = scalar(key);
    if (value && !allowed(value,values)) return null;
    if (value) (filters as unknown as Record<string, unknown>)[key] = allowed(value,values);
  }
  for (const [key, values] of Object.entries({occasion:OCCASIONS,style:STYLES})) {
    const value = scalar(key);
    const list = value ? value.split(',').map(v => allowed(v, values)) : [];
    if (list.some(v => !v)) return null;
    (filters as unknown as Record<string, unknown>)[key] = [...new Set(list)];
  }
  for (const [param, key] of [['min','priceMin'],['max','priceMax']] as const) {
    const value = scalar(param);
    if (value && (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) > 100000)) return null;
    if (value) filters[key] = Number(value);
  }
  if (filters.priceMin > filters.priceMax) return null;
  filters.productionTime = scalar('production');
  if (filters.productionTime && !PRODUCTION_TIMES.includes(filters.productionTime)) return null;
  filters.search = scalar('search').trim();
  if (filters.search.length > 160) return null;
  filters.collection = scalar('collection');
  if (filters.collection && !getPublicCollection(filters.collection)) return null;
  return {page,filters};
}

export function shopPageHref(page: number, filters: ShopFilters = defaultShopFilters()) {
  const p = new URLSearchParams();
  if (filters.collection) p.set('collection',filters.collection);
  if (filters.category !== 'All') p.set('category',filters.category);
  if (filters.priceMin !== 0) p.set('min',String(filters.priceMin));
  if (filters.priceMax !== 1000) p.set('max',String(filters.priceMax));
  for (const key of ['color','size','material','search'] as const) if (filters[key]) p.set(key,filters[key]);
  if (filters.occasion.length) p.set('occasion',filters.occasion.join(','));
  if (filters.style.length) p.set('style',filters.style.join(','));
  if (filters.productionTime) p.set('production',filters.productionTime);
  if (filters.sort !== SORTS[0]) p.set('sort',filters.sort);
  if (page > 1) p.set('page',String(page));
  return `/shop${p.size ? '?' + p.toString() : ''}`;
}

function contains(p: StorefrontProduct, q: string) {
  return `${productTitle(p)} ${p.meta_description || ''} ${p.material || ''} ${p.color || ''} ${p.product_type || ''} ${p.production_profile || ''} ${p.shipping_profile || ''}`.toLowerCase().includes(q.toLowerCase());
}
function matchesProduction(p: StorefrontProduct, value: string) {
  const text = `${p.production_profile || ''} ${p.shipping_profile || ''} ${p.meta_description || ''}`.toLowerCase();
  if (value === '7–10 days') return /7|10|express/.test(text);
  if (value === '14–21 days') return /14|21|standard|ups|made/.test(text) || !text.trim();
  if (value === '21–28 days') return /21|28/.test(text);
  if (value === '30+ days') return /30|month/.test(text);
  return true;
}

/** Shared server/client behavior. Existing filters remain review-only, not DNA landing eligibility. */
export function filterShopProducts(products: StorefrontProduct[], f: ShopFilters) {
  const collection = f.collection ? getPublicCollection(f.collection) : null;
  let list = products.filter(p => {
    const price = mainRegularPrice(p) || 0;
    if (collection && !productMatchesCollection(p,collection)) return false;
    if (f.category !== 'All' && categoryLabel(p) !== f.category) return false;
    if ((f.priceMin !== 0 || f.priceMax !== 1000) && (price < f.priceMin || price > f.priceMax)) return false;
    if (f.color && colorLabel(p) !== f.color) return false;
    if (f.size === 'Custom' && p.size_mode !== 'custom') return false;
    if (f.material && !contains(p,f.material.replace('Mirror ',''))) return false;
    if (f.occasion.length && !f.occasion.some(o => contains(p,o))) return false;
    if (f.style.length && !f.style.some(s => contains(p,s))) return false;
    if (f.productionTime && !matchesProduction(p,f.productionTime)) return false;
    return !f.search || contains(p,f.search);
  });
  if (f.sort === 'Price · low to high') list = list.sort((a,b)=>(mainRegularPrice(a)||0)-(mainRegularPrice(b)||0));
  if (f.sort === 'Price · high to low') list = list.sort((a,b)=>(mainRegularPrice(b)||0)-(mainRegularPrice(a)||0));
  if (f.sort === 'Newest') list = list.reverse();
  return list;
}
