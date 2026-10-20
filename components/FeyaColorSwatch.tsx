import type { CSSProperties } from 'react';
import { colorStyle } from '@/components/colors';

/** One circular swatch for filters, catalog cards, PDP and partner sets.
 * The numerical diameter is preserved by each existing caller.
 * A 1px white rim is inside that diameter; selection adds an outer gold halo.
 */
export function FeyaColorSwatch({
  color, size = 28, selected = false,
}: { color: string; size?: number; selected?: boolean }) {
  const holo = /holographic|iridescent/i.test(color);
  return <span
    aria-hidden="true"
    className={'relative inline-flex shrink-0 items-center justify-center rounded-full transition-[box-shadow,transform] duration-200 ' +
      (selected
        ? 'ring-[1.5px] ring-[#dfc07c] ring-offset-[3px] ring-offset-[#101015] shadow-[0_0_16px_rgba(219,179,93,.22)]'
        : 'group-hover:shadow-[0_0_10px_rgba(220,198,155,.15)]')}
    style={{ width: size, height: size } as CSSProperties}>
    <span className="absolute inset-0 overflow-hidden rounded-full border border-white/[.68] shadow-[inset_0_1px_1px_rgba(255,255,255,.22),inset_0_-2px_4px_rgba(0,0,0,.20)]"
      style={colorStyle(color)} />
    <span className={'pointer-events-none absolute inset-[1px] overflow-hidden rounded-full ' +
      (holo
        ? 'bg-[radial-gradient(ellipse_at_25%_16%,rgba(255,255,255,.17),transparent_48%)]'
        : 'bg-[radial-gradient(ellipse_at_27%_16%,rgba(255,255,255,.24),transparent_43%)]')} />
  </span>;
}
