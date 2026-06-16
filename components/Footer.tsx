import Link from 'next/link';
import { Instagram, Mail, Music2 } from 'lucide-react';
import { FeyaMark } from '@/components/FeyaMark';

const FOOTER_COLUMNS = [
  {
    title: 'Atelier',
    links: [
      ['Shop all', '/shop'],
      ['Festival looks', '/shop?world=festival'],
      ['Stage pieces', '/shop?world=stage'],
      ['Desert / Burning Man', '/shop?world=desert'],
      ['Editorial', '/shop?world=editorial'],
    ],
  },
  {
    title: 'Studio',
    links: [
      ['Custom sizing', '/shop'],
      ['Made to order', '/shop'],
      ['Production time', '/shop'],
      ['Express DHL', '/shop'],
      ['Shipping & returns', '/shop'],
    ],
  },
  {
    title: 'House',
    links: [
      ['About TheFEYA', '/'],
      ['Press / Editorial', '/shop?world=editorial'],
      ['Wholesale', '/'],
      ['Atelier OS', '/admin'],
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative border-t border-[rgba(216,214,211,0.12)] bg-[rgba(7,7,10,0.72)] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_10%_0%,rgba(212,178,106,0.12),transparent_32%),radial-gradient(circle_at_90%_70%,rgba(216,214,211,0.10),transparent_35%)]" />
      <div className="container-feya relative z-10 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        <div className="lg:col-span-4">
          <Link href="/" aria-label="FEYA home" className="inline-flex">
            <FeyaMark variant="chrome" width={96} />
          </Link>
          <p className="editorial-italic mt-7 max-w-sm text-[19px] leading-relaxed text-[var(--bone-dim)]">
            Stage, festival and desert fashion pieces. Hand-made in mirror acrylic, brushed chrome and patinated brass.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link href="/" aria-label="Instagram" className="w-11 h-11 rounded-full border border-[rgba(216,214,211,0.18)] flex items-center justify-center text-[var(--bone-dim)] hover:text-white hover:border-[rgba(216,214,211,0.45)] transition-all"><Instagram size={17} strokeWidth={1.4} /></Link>
            <Link href="/" aria-label="TikTok" className="w-11 h-11 rounded-full border border-[rgba(216,214,211,0.18)] flex items-center justify-center text-[var(--bone-dim)] hover:text-white hover:border-[rgba(216,214,211,0.45)] transition-all"><Music2 size={17} strokeWidth={1.4} /></Link>
            <Link href="/" aria-label="Email" className="w-11 h-11 rounded-full border border-[rgba(216,214,211,0.18)] flex items-center justify-center text-[var(--bone-dim)] hover:text-white hover:border-[rgba(216,214,211,0.45)] transition-all"><Mail size={17} strokeWidth={1.4} /></Link>
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-10">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <div className="eyebrow text-[10.5px] mb-6">{column.title}</div>
              <div className="space-y-4">
                {column.links.map(([label, href]) => (
                  <Link key={label} href={href} className="block text-[15px] text-[var(--bone-dim)] hover:text-white transition-colors">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="relative z-10 border-t border-[rgba(216,214,211,0.10)] bg-[rgba(7,7,10,0.65)]">
        <div className="container-feya py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-[10px] tracking-[0.34em] uppercase text-[rgba(200,194,181,0.58)]">
          <span>© TheFEYA Atelier · Berlin · Visual concept</span>
          <span>Design preview · sampled data · no checkout active</span>
        </div>
      </div>
    </footer>
  );
}
