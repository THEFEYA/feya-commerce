'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { FeyaColorSwatch } from '@/components/FeyaColorSwatch';
import { colorChoiceLabel } from '@/lib/bonanzaColorChoices';

type Partner = 'women' | 'men';

/** Small vector gender pictogram; use inline SVG to avoid Lucide version drift. */
function PartnerGlyph({ partner }: { partner: Partner }) {
  return <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
    className="shrink-0 text-[#e2c17e] drop-shadow-[0_0_4px_rgba(227,187,105,.42)]">
    {partner === 'women' ? <>
      <circle cx="12" cy="8" r="5.5" />
      <path d="M12 13.5V22M8 18h8" />
    </> : <>
      <circle cx="9.5" cy="14.5" r="5.5" />
      <path d="M13.5 10.5L21 3M15 3h6v6" />
    </>}
  </svg>;
}

type PairSizeProps = {
  partner: Partner;
  title: string;
  value: string;
  sizes: readonly string[];
  onChange: (partner: Partner, size: string) => void;
  invalid: boolean;
};

/**
 * FEYA's existing configuration controls, adapted for the two independently
 * sized outfits. Native <select> popups are OS-themed and cannot carry the
 * approved V13 dropdown design. This popover shares the original FEYA styles.
 */
function PairSizeDropdown({ partner, title, value, sizes, onChange, invalid }: PairSizeProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  function choose(size: string) {
    if (!sizes.includes(size)) return;
    onChange(partner, size);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const currentIndex = open ? highlighted : sizes.indexOf(value);
      setHighlighted(currentIndex < 0 ? (direction > 0 ? 0 : sizes.length - 1)
        : (currentIndex + direction + sizes.length) % sizes.length);
      setOpen(true);
      triggerRef.current?.focus();
      return;
    }
    if (open && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault();
      setHighlighted(event.key === 'Home' ? 0 : sizes.length - 1);
      triggerRef.current?.focus();
      return;
    }
    if (open && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      choose(sizes[highlighted]);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative min-w-0"
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={title + ' outfit size'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? listId + '-option-' + highlighted : undefined}
        aria-invalid={invalid || undefined}
        onClick={() => {
          if (!open) setHighlighted(Math.max(0, sizes.indexOf(value)));
          setOpen(!open);
        }}
        className="feya-config-trigger flex h-10 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-[13px] font-medium tracking-[.02em] text-[#f7f3ec] outline-none focus-visible:ring-2 focus-visible:ring-[#d4b474]"
      >
        <span className="truncate">{value || 'Size'}</span>
        <ChevronDown size={15} aria-hidden="true"
          className={'shrink-0 text-[#d5b777] transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open ? (
        <div id={listId} role="listbox" aria-label={title + ' outfit sizes'}
          className="feya-config-menu absolute left-0 right-0 top-full z-[110] mt-1 max-h-[272px] overflow-y-auto">
          {sizes.map((item, index) => (
            <button key={item} id={listId + '-option-' + index}
              type="button" role="option" tabIndex={-1}
              aria-selected={value === item}
              onPointerEnter={() => setHighlighted(index)}
              onClick={() => choose(item)}
              className={'feya-config-option block w-full rounded-md px-3 py-2 text-left text-[13px] font-medium tracking-[.02em] transition-colors ' +
                (value === item ? 'feya-config-option-active text-[var(--gold-warm)]' :
                  highlighted === index ? 'bg-white/[.07] text-white' : 'text-[var(--bone-dim)] hover:bg-white/[.05] hover:text-white')}>
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Independent partner colors / sizes on the existing priced Full Set;
 * swatches retain their approved original 20px diameter. */
export function CouplePartnerColorSelector({
  available, women, men, womenSize, menSize, sizes, onChange, onSizeChange, showSizeWarning = false,
}: {
  available: readonly string[];
  women: string; men: string;
  womenSize: string; menSize: string;
  sizes: readonly string[];
  onChange: (partner: Partner, code: string) => void;
  onSizeChange: (partner: Partner, size: string) => void;
  showSizeWarning?: boolean;
}) {
  return <section className="mt-3" aria-label="Couple colors and sizes">
    <div className="eyebrow mb-2 text-[10px]">Colors &amp; sizes · Paired set</div>
    <div className="divide-y divide-white/[0.07] rounded-lg border border-white/[0.10] bg-white/[0.018] px-2.5">
      {([
        { id: 'women' as Partner, title: 'Women', color: women, size: womenSize },
        { id: 'men' as Partner, title: 'Men', color: men, size: menSize },
      ]).map((partner) => <div key={partner.id}
        className="grid grid-cols-[60px_minmax(0,1fr)_128px] items-center gap-2 py-2 sm:grid-cols-[70px_minmax(0,1fr)_142px]">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[11px] font-medium text-[#f7f3ec]">
            <PartnerGlyph partner={partner.id} />
            <span>{partner.title}</span>
          </div>
          <div className="truncate text-[9px] text-[var(--smoke)]" title={colorChoiceLabel(partner.color)}>
            {colorChoiceLabel(partner.color)}
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1" role="radiogroup"
          aria-label={partner.title + ' outfit color'}>
          {available.map((code) => <button
            key={code} type="button" role="radio" aria-checked={partner.color === code}
            aria-label={partner.title + ' outfit: ' + colorChoiceLabel(code)}
            title={colorChoiceLabel(code)}
            onClick={() => onChange(partner.id, code)}
            className="group inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e3c887]">
            <FeyaColorSwatch color={colorChoiceLabel(code)} selected={partner.color === code} size={20} />
          </button>)}
        </div>
        <PairSizeDropdown
          partner={partner.id} title={partner.title} value={partner.size} sizes={sizes}
          onChange={onSizeChange} invalid={showSizeWarning && !partner.size} />
      </div>)}
    </div>
    {showSizeWarning ? <p role="alert" className="mt-2 text-[11px] text-[#e9bd95]">
      Select a size for both outfits to continue.
    </p> : null}
  </section>;
}
