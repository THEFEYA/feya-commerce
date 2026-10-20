import type { CSSProperties } from 'react';
import { colorStyle } from '@/components/colors';

/**
 * Shared V13-compatible jewel swatch: color label stays in accessible control,
 * visual contains color only. Selected ring is outside the jewel surface.
 */
export function FeyaColorSwatch({
  color, size=28, selected=false,
}: {color:string;size?:number;selected?:boolean}) {
  return <span
    aria-hidden="true"
    className={`relative inline-flex shrink-0 items-center justify-center rounded-full transition-[box-shadow,transform] duration-200 ${selected
      ? 'ring-[1.5px] ring-[#dfc07c] ring-offset-[3px] ring-offset-[#101015] shadow-[0_0_16px_rgba(219,179,93,.22)]'
      : 'group-hover:shadow-[0_0_10px_rgba(220,198,155,.15)]'}`}
    style={{width:size,height:size} as CSSProperties}>
    <span className="absolute inset-0 overflow-hidden rounded-full border border-white/[0.12] shadow-[inset_0_1px_1px_rgba(255,255,255,.24),inset_0_-2px_4px_rgba(0,0,0,.22)]" style={colorStyle(color)}/>
    <span className="pointer-events-none absolute inset-[1px] rounded-full bg-[radial-gradient(circle_at_28%_19%,rgba(255,255,255,.30),transparent_38%)]"/>
  </span>;
}
