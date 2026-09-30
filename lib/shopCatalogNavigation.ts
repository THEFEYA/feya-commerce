import type { StorefrontProduct } from './types.ts';
import { mainRegularPrice, productTitle } from './storefront.ts';

export const SHOP_PAGE_SIZE = 20;

export const BODY_AREA_TREE = [
  { part: 'Full Body', pieces: ['Bodysuit', 'Dress', 'Full Body Harness'] },
  { part: 'Upper Body', pieces: ['Tops & Bras', 'Corset', 'Harness'] },
  { part: 'Arms', pieces: ['Shoulder', 'Bracelet / Cuff', 'Glove', 'Full Arm'] },
  { part: 'Lower Body', pieces: ['Skirt', 'Belt', 'Panties / Bottom'] },
  { part: 'Head & Face', pieces: ['Mask', 'Headpiece', 'Horns', 'Crown', 'Choker / Collar'] },
  { part: 'Legs', pieces: ['Leg Covers', 'Garter', 'Full Leg'] },
  { part: 'Special', pieces: ['Wings', 'Tail', 'Spine'] },
] as const;

export const PIECES = [
  'Full Look',
  ...BODY_AREA_TREE.flatMap((group) => group.pieces),
];

export const PARTS = BODY_AREA_TREE.map((group) => group.part);
export const COLORS = ['Gold', 'Silver', 'Black', 'White', 'Red', 'Holographic'];
export const EVENTS = ['Festival', 'Rave', 'Burning Man', 'Halloween', 'Pride', 'Cosplay'];
export const PERFORMANCE = ['Stage & Fashion', 'Showgirl', 'Drag Queen'];
export const DANCE = ['Go-Go Dancer', 'Pole Dancer'];
export const STYLES = ['Glam', 'Futuristic', 'Sci-Fi', 'Cyberpunk', 'Post-Apocalyptic', 'Fantasy', 'Goth', 'Punk', 'Burlesque', 'Classic'];
export const PERSONAS = ['Warrior', 'Queen', 'Robot', 'Witch', 'Maleficent', 'Alien', 'Demon', 'Goddess', 'Angel', 'Cleopatra', 'Bunny'];
export const AUDIENCES = ['Women', 'Men', 'Unisex', 'Couples'];
export const MATERIALS = ['Vegan Leather', 'Natural Leather', 'Fabric / Textile', 'Acrylic / Mirror Plastic'];
export const EFFECTS = ['Mirror', 'Metallic', 'Iridescent'];
export const SORTS = ['Recommended', 'Price · low to high', 'Price · high to low'];

export const FILTER_SECTION_ORDER = [
  'Audience',
  'Body Area',
  'Price',
  'Color',
  'Event',
  'Performance',
  'Style',
  'Persona',
  'Material',
  'Visual Effect',
] as const;

export type ShopFilters = {
  piece: string[];
  part: string[];
  priceMin: number;
  priceMax: number;
  color: string;
  event: string[];
  performance: string[];
  dance: string[];
  style: string[];
  persona: string[];
  audience: string[];
  material: string[];
  effect: string[];
  search: string;
  sort: string;
};

export const defaultShopFilters = (): ShopFilters => ({
  piece: [],
  part: [],
  priceMin: 0,
  priceMax: 1000,
  color: '',
  event: [],
  performance: [],
  dance: [],
  style: [],
  persona: [],
  audience: [],
  material: [],
  effect: [],
  search: '',
  sort: SORTS[0],
});

export type ShopNavigation = { page: number; filters: ShopFilters };

export const SHOP_FILTER_PARAM_ORDER = [
  'piece','part','min','max','color','event','performance','dance',
  'style','persona','audience','material','effect','search','sort','page',
] as const;

const SHOP_TRACKING_PARAM_EXACT = new Set([
  'gclid','dclid','gbraid','wbraid','fbclid','msclkid',
]);

export function isShopTrackingParam(key: string) {
  const normalized=String(key||'').trim().toLowerCase();
  return normalized.startsWith('utm_') || SHOP_TRACKING_PARAM_EXACT.has(normalized);
}

const allowed = (value: string, values: readonly string[]) =>
  values.find((item) => item.toLowerCase() === value.toLowerCase()) ?? '';

function listParam(raw: string, values: readonly string[]) {
  if (!raw) return [];
  const list = raw.split(',').map((value) => allowed(value, values));
  if (list.some((value) => !value)) return null;
  return [...new Set(list)];
}

export function parseShopNavigation(params: Record<string, string | string[] | undefined>): ShopNavigation | null {
  const scalar = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
  const known = SHOP_FILTER_PARAM_ORDER;
  if (Object.keys(params).some((key) => !known.includes(key as typeof known[number]) && !isShopTrackingParam(key))) return null;
  if (known.some((key) => Array.isArray(params[key]))) return null;

  const rawPage = scalar('page');
  if (rawPage && !/^[1-9][0-9]*$/.test(rawPage)) return null;
  const page = rawPage ? Number(rawPage) : 1;
  if (!Number.isSafeInteger(page)) return null;

  const filters = defaultShopFilters();

  const piece = listParam(scalar('piece'), PIECES);
  const part = listParam(scalar('part'), PARTS);
  const event = listParam(scalar('event'), EVENTS);
  const performance = listParam(scalar('performance'), PERFORMANCE);
  const dance = listParam(scalar('dance'), DANCE);
  const style = listParam(scalar('style'), STYLES);
  const persona = listParam(scalar('persona'), PERSONAS);
  const audience = listParam(scalar('audience'), AUDIENCES);
  const material = listParam(scalar('material'), MATERIALS);
  const effect = listParam(scalar('effect'), EFFECTS);

  if ([piece, part, event, performance, dance, style, persona, audience, material, effect].some((value) => value == null)) return null;

  filters.piece = piece!;
  filters.part = part!;
  filters.event = event!;
  filters.performance = performance!;
  filters.dance = dance!;
  filters.style = style!;
  filters.persona = persona!;
  filters.audience = audience!;
  filters.material = material!;
  filters.effect = effect!;

  const color = scalar('color');
  if (color) {
    const value = allowed(color, COLORS);
    if (!value) return null;
    filters.color = value;
  }

  for (const [param, key] of [['min','priceMin'],['max','priceMax']] as const) {
    const value = scalar(param);
    if (value && (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) > 100000)) return null;
    if (value) filters[key] = Number(value);
  }
  if (filters.priceMin > filters.priceMax) return null;

  filters.search = scalar('search').trim();
  if (filters.search.length > 160) return null;

  const sort = scalar('sort');
  if (sort) {
    const value = allowed(sort, SORTS);
    if (!value) return null;
    filters.sort = value;
  }

  return { page, filters };
}

export function shopPageHref(page: number, filters: ShopFilters = defaultShopFilters()) {
  const params = new URLSearchParams();
  if (filters.piece.length) params.set('piece', filters.piece.join(','));
  if (filters.part.length) params.set('part', filters.part.join(','));
  if (filters.priceMin !== 0) params.set('min', String(filters.priceMin));
  if (filters.priceMax !== 1000) params.set('max', String(filters.priceMax));
  if (filters.color) params.set('color', filters.color);
  if (filters.event.length) params.set('event', filters.event.join(','));
  if (filters.performance.length) params.set('performance', filters.performance.join(','));
  if (filters.dance.length) params.set('dance', filters.dance.join(','));
  if (filters.style.length) params.set('style', filters.style.join(','));
  if (filters.persona.length) params.set('persona', filters.persona.join(','));
  if (filters.audience.length) params.set('audience', filters.audience.join(','));
  if (filters.material.length) params.set('material', filters.material.join(','));
  if (filters.effect.length) params.set('effect', filters.effect.join(','));
  if (filters.search) params.set('search', filters.search);
  if (filters.sort !== SORTS[0]) params.set('sort', filters.sort);
  if (page > 1) params.set('page', String(page));
  return `/shop${params.size ? '?' + params.toString() : ''}`;
}

export function shopNavigationHasUtilityState(navigation: ShopNavigation) {
  return navigation.page > 1 || shopPageHref(1, navigation.filters) !== '/shop';
}

export function shopNavigationNeedsNormalization(
  params: Record<string, string | string[] | undefined>,
  navigation: ShopNavigation,
) {
  const actual=new URLSearchParams();
  for (const key of SHOP_FILTER_PARAM_ORDER) {
    const value=params[key];
    if (typeof value==='string' && value) actual.set(key,value);
  }
  const expected=new URL(shopPageHref(navigation.page,navigation.filters),'https://thefeya.invalid').searchParams;
  return actual.toString()!==expected.toString();
}

export function shopHrefWithTracking(
  href: string,
  params: Record<string, string | string[] | undefined>,
) {
  const target=new URL(href,'https://thefeya.invalid');
  for (const [key,value] of Object.entries(params)) {
    if (!isShopTrackingParam(key)) continue;
    if (Array.isArray(value)) {
      for (const entry of value) if (entry) target.searchParams.append(key,entry);
    } else if (typeof value==='string' && value) {
      target.searchParams.append(key,value);
    }
  }
  return target.pathname+(target.searchParams.size?'?'+target.searchParams.toString():'');
}

function searchContains(product: StorefrontProduct, query: string) {
  return `${productTitle(product)} ${product.meta_description || ''} ${product.product_type || ''}`
    .toLowerCase()
    .includes(query.toLowerCase());
}

function hasFacet(values: string[] | undefined, value: string) {
  return Boolean(value && values?.includes(value));
}

function pieceMatches(values: string[] | undefined, value: string) {
  if (value === 'Tops & Bras') return Boolean(values?.includes('Top') || values?.includes('Bra'));
  return hasFacet(values, value);
}

function matchesAny(selected: string[], values: string[] | undefined) {
  return !selected.length || selected.some((value) => hasFacet(values, value));
}

function matchesAnyPiece(selected: string[], values: string[] | undefined) {
  return !selected.length || selected.some((value) => pieceMatches(values, value));
}

export function filterShopProducts(products: StorefrontProduct[], filters: ShopFilters) {
  let list = products.filter((product) => {
    const price = mainRegularPrice(product) || 0;
    const facets = product.facets;

    if (!matchesAnyPiece(filters.piece, facets?.subtypes)) return false;
    if (!matchesAny(filters.part, facets?.parts)) return false;
    if ((filters.priceMin !== 0 || filters.priceMax !== 1000) && (price < filters.priceMin || price > filters.priceMax)) return false;

    if (filters.color) {
      const canonical = facets?.colors?.length ? facets.colors : (product.canonical_color_label ? [product.canonical_color_label] : []);
      if (!canonical.includes(filters.color)) return false;
    }

    if (!matchesAny(filters.event, facets?.events)) return false;
    if (!matchesAny(filters.performance, facets?.performance)) return false;
    if (!matchesAny(filters.dance, facets?.dance)) return false;
    if (!matchesAny(filters.style, facets?.styles)) return false;
    if (!matchesAny(filters.persona, facets?.personas)) return false;
    if (!matchesAny(filters.audience, facets?.audience)) return false;
    if (!matchesAny(filters.material, facets?.materials)) return false;
    if (!matchesAny(filters.effect, facets?.effects)) return false;

    return !filters.search || searchContains(product, filters.search);
  });

  if (filters.sort === 'Price · low to high') list = [...list].sort((a,b)=>(mainRegularPrice(a)||0)-(mainRegularPrice(b)||0));
  if (filters.sort === 'Price · high to low') list = [...list].sort((a,b)=>(mainRegularPrice(b)||0)-(mainRegularPrice(a)||0));

  return list;
}
