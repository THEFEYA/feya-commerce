'use client';
import Link from 'next/link';
import { Search, ShoppingBag, User, Menu, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FeyaMark } from '@/components/FeyaMark';

const NAV = [
  ['/', 'Home'],
  ['/shop', 'Shop'],
  ['/shop?world=festival', 'Festival'],
  ['/shop?world=stage', 'Stage'],
  ['/shop?world=desert', 'Desert'],
  ['/shop?world=editorial', 'Editorial'],
  ['/admin', 'Atelier OS'],
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const readBag = () => setCount(Number(window.localStorage.getItem('feya_visual_bag') || '0'));
    onScroll();
    readBag();
    window.addEventListener('scroll', onScroll, { passive: true });
    const timer = window.setInterval(readBag, 700);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <header data-testid="site-header" className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${scrolled ? 'backdrop-blur-xl bg-[rgba(7,7,10,0.78)] border-b border-[rgba(216,214,211,0.18)]' : 'bg-transparent'}`}>
      <div className={`overflow-hidden transition-all duration-500 ${scrolled ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'}`}>
        <div className="bg-gradient-to-r from-transparent via-[rgba(212,178,106,0.10)] to-transparent text-center py-2 text-[10px] tracking-[0.32em] uppercase text-silver">Express DHL · Worldwide shipping · Made to order in our atelier</div>
      </div>
      <div className="container-feya flex items-center justify-between py-3 lg:py-3.5">
        <Link href="/" data-testid="logo-link" className="flex items-center gap-2.5 group"><FeyaMark variant="chrome" width={84} className="transition-transform duration-500 group-hover:scale-[1.03]" /></Link>
        <nav className="hidden lg:flex items-center gap-5 xl:gap-6" data-testid="primary-nav">
          {NAV.map(([href, label]) => <Link key={href + label} href={href} className="relative text-[10.5px] tracking-[0.22em] uppercase font-medium transition-colors duration-300 text-[#C8C2B5] hover:text-white">{label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <button aria-label="Search" className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full border border-transparent text-[#C8C2B5] hover:text-white hover:border-[rgba(216,214,211,0.4)] transition-all"><Search size={15} strokeWidth={1.4} /></button>
          <button aria-label="Wishlist" className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full border border-transparent text-[#C8C2B5] hover:text-white hover:border-[rgba(216,214,211,0.4)] transition-all"><Heart size={15} strokeWidth={1.4} /></button>
          <button aria-label="Account" className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full border border-transparent text-[#C8C2B5] hover:text-white hover:border-[rgba(216,214,211,0.4)] transition-all"><User size={15} strokeWidth={1.4} /></button>
          <Link href="/cart" aria-label="Bag" className={`relative flex items-center gap-2 px-3.5 h-9 rounded-full border transition-all ${count > 0 ? 'border-[var(--gold)] text-white bg-[rgba(212,178,106,0.10)]' : 'border-[rgba(216,214,211,0.4)] text-white'}`}>
            <ShoppingBag size={14} strokeWidth={1.4} />
            <span className="text-[10.5px] tracking-[0.22em] uppercase hidden md:inline">Bag</span>
            <span className="text-[10px] text-silver">·</span>
            <span className={`text-[11px] tabular-nums font-semibold ${count > 0 ? 'text-[var(--gold-warm)]' : ''}`}>{count}</span>
          </Link>
          <button aria-label="Menu" className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full border border-[rgba(216,214,211,0.18)] text-white"><Menu size={16} /></button>
        </div>
      </div>
    </header>
  );
}
