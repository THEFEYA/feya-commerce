import { formatPrice, SALE_PERCENT } from '@/lib/storefront';

export function SalePrice({ regular, sale, currency = 'EUR', variant = 'card', testidPrefix = 'price' }: { regular?: number | null; sale?: number | null; currency?: string; variant?: 'card' | 'pdp' | 'cart'; testidPrefix?: string }) {
  const showSale = sale != null && regular != null && sale < regular;
  const sizes = {
    card: { sale: 'text-[22px] lg:text-[24px]', strike: 'text-[13px]' },
    pdp: { sale: 'text-[40px] lg:text-[44px]', strike: 'text-[16px]' },
    cart: { sale: 'text-[24px]', strike: 'text-[13px]' },
  }[variant];

  if (!showSale) {
    return <span className={`font-price text-bone tabular-nums ${sizes.sale}`} data-testid={`${testidPrefix}-regular`}>{formatPrice(regular, currency)}</span>;
  }

  return (
    <span className="inline-flex items-baseline gap-2.5" data-testid={`${testidPrefix}-sale-wrapper`}>
      <span className={`font-price text-[var(--gold-warm)] tabular-nums ${sizes.sale}`} data-testid={`${testidPrefix}-sale`}>{formatPrice(sale, currency)}</span>
      <span className={`font-price-strike text-[var(--smoke)] tabular-nums line-through ${sizes.strike}`} data-testid={`${testidPrefix}-was`}>{formatPrice(regular, currency)}</span>
      <span className="text-[10px] tracking-[0.16em] uppercase text-[var(--gold)]" data-testid={`${testidPrefix}-sale-note`}>({`−${SALE_PERCENT}%`})</span>
    </span>
  );
}
