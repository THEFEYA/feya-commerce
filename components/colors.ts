import { BONANZA_COLOR_PARTS, colorChoiceLabel, colorChoiceStyle } from '@/lib/bonanzaColorChoices';

export const COLOR_HEX: Record<string, string> = {
  Gold: 'linear-gradient(135deg,#F0DCAA 0%,#D4B26A 55%,#8C6F36 100%)',
  Silver: 'linear-gradient(135deg,#F4F4F4 0%,#C7C7C9 55%,#7A7B7F 100%)',
  Chrome: 'linear-gradient(135deg,#F4F4F4 0%,#BFC1C5 55%,#6E6F73 100%)',
  Mirror: 'linear-gradient(135deg,#FFFFFF 0%,#BFC1C5 55%,#7A7B7F 100%)',
  Black: '#0A0A0E',
  White: '#F2EFE6',
  Red: '#A02038',
  Brown: '#936950',
  Green: '#40876e',
  Pink: '#e883b7',
  Blue: '#4e78b2',
  Ruby: '#A02038',
  Holographic: 'conic-gradient(from 10deg,#08bddd,#4167ee,#b044ef,#ef38b1,#fc9969,#f6cf64,#22c99c,#08bddd)',
  Iridescent: 'conic-gradient(from 10deg,#08bddd,#4167ee,#b044ef,#ef38b1,#fc9969,#f6cf64,#22c99c,#08bddd)'
};

export function colorStyle(name?: string | null) {
  if (!name) return { background: '#7A7B7F' };
  const exactCode = Object.keys(BONANZA_COLOR_PARTS).find((code) => colorChoiceLabel(code).toLowerCase() === name.trim().toLowerCase());
  if (exactCode) return colorChoiceStyle(exactCode);
  const key = Object.keys(COLOR_HEX).find((k) => name.toLowerCase().includes(k.toLowerCase()));
  const value = key ? COLOR_HEX[key] : '#7A7B7F';
  return value.includes('gradient(') ? { backgroundImage: value } : { background: value };
}
