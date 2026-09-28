'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type HomePieceCarouselItem = {
  code: string;
  label: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
};

export function HomePieceCarousel({ items }: { items: HomePieceCarouselItem[] }) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  const move = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>('[data-piece-card]');
    const step = (card?.offsetWidth || 280) + 14;
    rail.scrollBy({ left: step * direction, behavior: 'smooth' });
  };

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches || paused || items.length < 2) return;

    const timer = window.setInterval(() => {
      const rail = railRef.current;
      if (!rail) return;

      const nearEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 32;
      if (nearEnd) {
        rail.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        move(1);
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [paused, items.length]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={railRef}
        className="home-piece-carousel -mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Shop by piece"
      >
        {items.map((item) => (
          <Link
            data-piece-card
            key={item.code}
            href={item.href}
            className="group relative aspect-[4/5] w-[clamp(250px,23vw,340px)] shrink-0 snap-start overflow-hidden rounded-[14px] border border-white/[0.07] bg-[rgba(255,255,255,.018)] shadow-[0_24px_55px_-36px_rgba(0,0,0,.85)]"
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.imageAlt}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_55%_20%,#28262d,#0d0d11)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
            <div className="visual-tile-label-band visual-piece-label-band absolute inset-x-0 bottom-0 flex items-center justify-center px-10 py-3.5 text-center">
              <span className="font-tall text-[21px] leading-none tracking-[.015em] text-[#f4f1ea]">{item.label}</span>
              <ArrowUpRight size={14} className="absolute right-4 shrink-0 text-[#d8b56d]" />
            </div>
          </Link>
        ))}
      </div>

      {items.length > 1 ? (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Previous categories"
            onClick={() => move(-1)}
            className="visual-carousel-button"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            type="button"
            aria-label="Next categories"
            onClick={() => move(1)}
            className="visual-carousel-button"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
