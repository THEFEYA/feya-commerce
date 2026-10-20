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
  return {
    ...product,
    color_choices: unique,
    default_color_choice: primary,
    color_filter_values: filters,
    color_choice_source: 'bonanza-owner-confirmed-20261011',
    // The existing facets remain the source for ALL unrelated SEO/category axes.
    facets: product.facets ? {...product.facets, colors: filters} : product.facets,
  };
}

const SWATCH: Record<string, string> = {
  Gold: '#d8ae58', Silver: '#bec8ce', Black: '#15171c', White: '#f5f4ed',
  Red: '#b82e46', Pink: '#e883b7', Green: '#40876e', Blue: '#4e78b2', Brown: '#936950',
};
const HOLO = ['#9be2eb','#ddb6f4','#f7c6e2','#b0e4c7'];
export function colorChoiceStyle(code: string): {background?: string; backgroundImage?: string} {
  const parts = CHOICES[code];
  if (!parts) return {background:'#7A7B7F'};
  if (parts.length === 1 && parts[0] === 'Holographic') {
    return {backgroundImage:'conic-gradient(#9be2eb,#ddb6f4,#f7c6e2,#b0e4c7,#9be2eb)'};
  }
  if (parts.length === 1) return {background: SWATCH[parts[0]] || '#7A7B7F'};
  const stops: string[]=[];
  parts.forEach((part,i)=>{
    const start = i * 100 / parts.length, end = (i+1) * 100 / parts.length;
    const pieces = part === 'Holographic' ? HOLO : [SWATCH[part] || '#7A7B7F'];
    pieces.forEach((shade,j)=>{
      stops.push(shade+' '+(start+(end-start)*j/pieces.length).toFixed(2)+'% '+(start+(end-start)*(j+1)/pieces.length).toFixed(2)+'%');
    });
  });
  return {backgroundImage:'linear-gradient(135deg,'+stops.join(',')+')'};
}

export function productColorChoices(product: StorefrontProduct): {code:string;label:string}[] {
  const values = product.color_choices || [];
  const ordered = product.default_color_choice && values.includes(product.default_color_choice)
    ? [product.default_color_choice, ...values.filter((code)=>code!==product.default_color_choice)] : values;
  return ordered.map((code)=>({code,label:colorChoiceLabel(code)}));
}
