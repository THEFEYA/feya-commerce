import type { StorefrontProduct } from './types.ts';

/**
 * Visual merchandising only: combinations are inseparable selectable colorways.
 * The constituent basic colors supply OR facets for the catalog.
 * No source price, SEO copy, SKU or media is edited here.
 */
export const BONANZA_COLOR_PARTS = {
  gold: ['Gold'],
  silver: ['Silver'],
  black: ['Black'],
  white: ['White'],
  brown: ['Brown'],
  green: ['Green'],
  pink: ['Pink'],
  red: ['Red'],
  black_gold: ['Black', 'Gold'],
  black_silver: ['Black', 'Silver'],
  white_gold: ['White', 'Gold'],
  white_silver: ['White', 'Silver'],
  gold_silver: ['Gold', 'Silver'],
  gold_silver_black: ['Gold', 'Silver', 'Black'],
  white_gold_silver: ['White', 'Gold', 'Silver'],
  holographic: ['Holographic'],
  holographic_white: ['Holographic', 'White'],
  holographic_black: ['Holographic', 'Black'],
  blue_black: ['Blue', 'Black'],
  black_red: ['Black', 'Red'],
} as const;

export type BonanzaColorCode = keyof typeof BONANZA_COLOR_PARTS;
const CHOICES = BONANZA_COLOR_PARTS as Record<string, readonly string[]>;
const BASE_COLORS = ['Gold', 'Silver', 'Black', 'White', 'Red', 'Pink', 'Green', 'Blue', 'Brown', 'Holographic'] as const;

export function isBonanzaColorCode(code: string): code is BonanzaColorCode {
  return Object.prototype.hasOwnProperty.call(CHOICES, code);
}

export function colorChoiceLabel(code: string): string {
  const parts = CHOICES[code];
  return parts ? parts.join(' + ') : code;
}

export function constituentColors(codes: readonly string[]): string[] {
  const found = new Set<string>();
  for (const code of codes) {
    if (!isBonanzaColorCode(code)) throw new Error('UNKNOWN_BONANZA_COLOR_CHOICE');
    for (const component of BONANZA_COLOR_PARTS[code]) found.add(component);
  }
  return BASE_COLORS.filter((color) => found.has(color));
}

const COLOR_PATTERNS: Record<string, RegExp> = {
  Gold: /\b(gold|golden)\b/i,
  Silver: /\b(silver|chrome)\b/i,
  Black: /\bblack\b/i,
  White: /\bwhite\b/i,
  Red: /\b(red|ruby)\b/i,
  Pink: /\bpink\b/i,
  Green: /\bgreen\b/i,
  Blue: /\bblue\b/i,
  Brown: /\bbrown\b/i,
  Holographic: /\b(holographic|holo|iridescent)\b/i,
};

/** Explicitly a title-based suggestion, NOT proof of the photographed shade. */
export function inferredDefaultColorCode(title: string, codes: readonly string[]): string | null {
  if (!codes.length) return null;
  const mentioned = BASE_COLORS.filter((color) => COLOR_PATTERNS[color].test(title));
  if (!mentioned.length) return codes[0];
  const exact = codes.find((code) => {
    const parts = CHOICES[code] || [];
    return parts.length === mentioned.length && parts.every((part) => mentioned.includes(part as typeof BASE_COLORS[number]));
  });
  if (exact) return exact;
  const ranked = codes.map((code, order) => {
    const parts = CHOICES[code] || [];
    return {code, order, score: parts.filter((part) => mentioned.includes(part as typeof BASE_COLORS[number])).length * 10 - parts.filter((part) => !mentioned.includes(part as typeof BASE_COLORS[number])).length * 3};
  }).sort((a, b) => b.score - a.score || a.order - b.order);
  return ranked[0]?.score > 0 ? ranked[0].code : codes[0];
}

export const PHOTOGRAPHED_MIXED_COUPLE_COLORS = {
  // Explicit owner-described example: female in Gold, male in Silver.
  'f012a88f-44db-4e17-ba57-7f60bb7b5719': {women:'gold',men:'silver'},
} as const;
export type OwnerColorChoices = {colors: string[]; held: boolean; primary?: string | null; filter_colors?: string[] | null};
export function enrichStorefrontProductColors(product: StorefrontProduct, decision: OwnerColorChoices | null | undefined): StorefrontProduct {
  if (!decision || decision.held) return product;
  const unique = [...new Set(decision.colors)];
  if (!unique.length || unique.some((code) => !isBonanzaColorCode(code))) throw new Error('BONANZA_COLOR_SOURCE_INVALID');
  const primary = decision.primary && unique.includes(decision.primary)
    ? decision.primary
    : inferredDefaultColorCode(String(product.card_title || product.h1 || ''), unique);
  const filters = decision.filter_colors === undefined || decision.filter_colors === null
    ? constituentColors(unique)
    : [...new Set(decision.filter_colors)];
  const eligible = constituentColors(unique);
  if (filters.some((color) => !eligible.includes(color))) throw new Error('BONANZA_COLOR_FILTER_OUTSIDE_AVAILABLE_CHOICES');
  const pair = PHOTOGRAPHED_MIXED_COUPLE_COLORS[product.canonical_product_id as keyof typeof PHOTOGRAPHED_MIXED_COUPLE_COLORS];
  const photographed = pair && unique.includes(pair.women) && unique.includes(pair.men)
    ? constituentColors([pair.women,pair.men])
    : primary ? constituentColors([primary]) : [];
  return {
    ...product,
    color_choices: unique,
    default_color_choice: primary,
    color_filter_values: filters,
    photo_color_filter_values: photographed,
    color_choice_source: 'bonanza-owner-confirmed-20261011',
    // The existing facets remain the source for ALL unrelated SEO/category axes.
    facets: product.facets ? {...product.facets, colors: filters} : product.facets,
  };
}

const BASE_TONES: Record<string,string> = {
  Gold: '#d2aa58', Silver: '#b5bec9', Black: '#191b21', White: '#f5f2e9',
  Red: '#ba3045', Pink: '#e88bb8', Green: '#478a6c', Blue: '#457ab7', Brown: '#946949', Holographic: '#bdc9f0',
};

/** Tiny jewelry-like metallic/iridescent finishes; no graphic file, no new image request. */
export function colorChoiceStyle(code: string): {backgroundImage?: string; background?: string} {
  const parts = CHOICES[code];
  if (!parts) return {background:'#55575d'};
  const glint = 'linear-gradient(130deg, rgba(255,255,255,.52) 0%, rgba(255,255,255,.06) 34%, transparent 49%, rgba(0,0,0,.31) 100%)';
  const holo = 'conic-gradient(from 10deg,#b1e7f0 0%,#dcbded 17%,#ffe5ad 31%,#a7e3cb 48%,#b9c5f7 64%,#ffc6da 83%,#b1e7f0 100%)';
  if (parts.length===1) {
    const base: Record<string,string> = {
      Gold: 'linear-gradient(128deg,#76511f 0%,#d9b160 25%,#fff0b0 43%,#b18131 59%,#edcf8b 79%,#826029 100%)',
      Silver: 'linear-gradient(128deg,#5f6875 0%,#c6d0dc 25%,#fefeff 44%,#929caa 63%,#e3e7ec 80%,#707987 100%)',
      Black: 'linear-gradient(126deg,#020305 0%,#2b2e38 35%,#484851 51%,#111216 70%,#030406 100%)',
      White: 'linear-gradient(125deg,#cfcfd0,#ffffff 39%,#f1f0e9 62%,#c6c7c5)',
      Red: 'linear-gradient(128deg,#611324,#e34b60 42%,#7b1b31 69%,#cc4254)',
      Pink: 'linear-gradient(126deg,#ba557e,#ffd0e5 46%,#e889b6 68%,#9c4c77)',
      Green: 'linear-gradient(126deg,#174f3c,#77c7a0 45%,#276a51 65%,#174b39)',
      Blue: 'linear-gradient(125deg,#1d447e,#79b5e8 41%,#24588e 65%,#172f5e)',
      Brown: 'linear-gradient(126deg,#4c2c1e,#bc8a60 42%,#794a36 67%,#3c261d)',
    };
    return {backgroundImage:parts[0]==='Holographic'?glint+','+holo:glint+','+(base[parts[0]]||base.Black)};
  }
  // Conic sectors remain one inseparable colorway. Brightness/reflection is a
  // separate overlay so Silver/Gold do not read as flat gray/yellow chips.
  let cursor=0;const stops:string[]=[];
  for(const part of parts){
    const start=cursor, end=cursor+100/parts.length;cursor=end;
    const tone=BASE_TONES[part]||'#888888';
    stops.push(tone+' '+start.toFixed(2)+'%',tone+' '+end.toFixed(2)+'%');
  }
  const overlay='radial-gradient(circle at 25% 18%,rgba(255,255,255,.45),transparent 35%)';
  return {backgroundImage:glint+','+overlay+',conic-gradient(from 225deg,'+stops.join(',')+')'};
}

export function productColorChoices(product: StorefrontProduct): {code:string;label:string}[] {
  const values = product.color_choices || [];
  const ordered = product.default_color_choice && values.includes(product.default_color_choice)
    ? [product.default_color_choice, ...values.filter((code)=>code!==product.default_color_choice)] : values;
  return ordered.map((code)=>({code,label:colorChoiceLabel(code)}));
}
