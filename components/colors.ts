export const COLOR_HEX: Record<string, string> = {
  Gold: 'linear-gradient(135deg,#F0DCAA 0%,#D4B26A 55%,#8C6F36 100%)',
  Silver: 'linear-gradient(135deg,#F4F4F4 0%,#C7C7C9 55%,#7A7B7F 100%)',
  Chrome: 'linear-gradient(135deg,#F4F4F4 0%,#BFC1C5 55%,#6E6F73 100%)',
  Mirror: 'linear-gradient(135deg,#FFFFFF 0%,#BFC1C5 55%,#7A7B7F 100%)',
  Black: '#0A0A0E',
  White: '#F2EFE6',
  Red: '#A02038',
  Ruby: '#A02038',
  Holographic: 'conic-gradient(from 180deg at 50% 50%, #FFD1F0, #B5C7FF, #C6FFE3, #FFEEC2, #FFD1F0)',
  Iridescent: 'conic-gradient(from 180deg at 50% 50%, #FFD1F0, #B5C7FF, #C6FFE3, #FFEEC2, #FFD1F0)'
};

export function colorStyle(name?: string | null) {
  if (!name) return { background: '#7A7B7F' };
  const key = Object.keys(COLOR_HEX).find((k) => name.toLowerCase().includes(k.toLowerCase()));
  const value = key ? COLOR_HEX[key] : '#7A7B7F';
  return value.includes('gradient(') ? { backgroundImage: value } : { background: value };
}
