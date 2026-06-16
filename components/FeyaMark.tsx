'use client';
import React from 'react';

const WORDMARK_STOPS: Record<string, { o: string; c: string }[]> = {
  chrome: [{ o: '0%', c: '#FFFFFF' }, { o: '38%', c: '#E2E1DD' }, { o: '62%', c: '#B7B8BC' }, { o: '88%', c: '#7A7B7F' }, { o: '100%', c: '#C7C7C9' }],
  bone: [{ o: '0%', c: '#F4EFE2' }, { o: '100%', c: '#C8C2B5' }],
  gold: [{ o: '0%', c: '#F0DCAA' }, { o: '50%', c: '#D4B26A' }, { o: '100%', c: '#8C6F36' }],
};

export function FeyaMark({ variant = 'chrome', width = 96, className = '' }: { variant?: string; width?: number; className?: string }) {
  const uid = React.useId().replace(/[:]/g, '');
  const stops = WORDMARK_STOPS[variant] || WORDMARK_STOPS.chrome;
  return (
    <svg viewBox="0 0 200 56" width={width} height={(width * 56) / 200} className={className} role="img" aria-label="FEYA">
      <defs><linearGradient id={`feya-grad-${uid}`} x1="0" y1="0" x2="0" y2="1">{stops.map((s, i) => <stop key={i} offset={s.o} stopColor={s.c} />)}</linearGradient></defs>
      <text x="0" y="44" fontSize="52" letterSpacing="4" fill={`url(#feya-grad-${uid})`} style={{ fontFamily: 'Italiana, Cormorant Garamond, serif', fontWeight: 400 }}>FEYA</text>
    </svg>
  );
}

export function FeyaButterfly({ width = 34, className = '' }: { width?: number; className?: string }) {
  const uid = React.useId().replace(/[:]/g, '');
  const height = Math.round(width * 0.78);
  return (
    <svg viewBox="0 0 120 92" width={width} height={height} className={className} role="img" aria-label="FEYA butterfly mark">
      <defs>
        <linearGradient id={`butterfly-grad-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="45%" stopColor="#D8D6D3" />
          <stop offset="100%" stopColor="#8D8E93" />
        </linearGradient>
      </defs>
      <path d="M58 47C44 24 20 15 4 4c-1 25 11 48 39 55-18 2-30 10-37 27 25 0 43-7 51-25 1-3 2-7 1-14Z" fill="none" stroke={`url(#butterfly-grad-${uid})`} strokeWidth="5" strokeLinejoin="round" />
      <path d="M62 47C76 24 100 15 116 4c1 25-11 48-39 55 18 2 30 10 37 27-25 0-43-7-51-25-1-3-2-7-1-14Z" fill="none" stroke={`url(#butterfly-grad-${uid})`} strokeWidth="5" strokeLinejoin="round" />
      <circle cx="60" cy="29" r="6" fill={`url(#butterfly-grad-${uid})`} />
      <path d="M60 37c6 15-4 27-4 51m4-51c-6 15 4 27 4 51" stroke={`url(#butterfly-grad-${uid})`} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
