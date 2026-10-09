import Link from 'next/link';
import { Mail } from 'lucide-react';
import { FeyaMark } from '@/components/FeyaMark';
import { isSellerOnlinePaymentsEnabled, SELLER_ONLINE_PROVIDER } from '@/lib/sellerOnlineProvider';

const FOOTER_COLUMNS = [
  {
    title: 'Shop',
    links: [
      ['Shop all', '/shop'],
      ['Bodysuits', '/collections/bodysuits'],
      ['Shoulders', '/collections/shoulder-armor'],
      ['Masks', '/collections/costume-masks'],
      ['Headpieces', '/collections/costume-headpieces'],
      ['Belts', '/collections/costume-belts'],
    ],
  },
  {
    title: 'Events & performance',
    links: [
      ['Festival', '/collections/festival-outfits'],
      ['Rave', '/collections/rave-outfits'],
      ['Burning Man', '/collections/burning-man-outfits'],
      ['Stage & Fashion', '/collections/performance-costumes'],
      ['Festival skirts', '/collections/festival-skirts'],
    ],
  },
  {
    title: 'Help & studio',
    links: [
      ['Measurements & sizing', '/size-guide'],
      ['Shipping & payment', '/shipping'],
      ['Care & storage', '/care'],
      ['Returns & exchanges', '/returns'],
      ['About TheFEYA', '/about'],
      ['Contact', '/contact'],
      ['Collections', '/collections'],
    ],
  },
];

export function Footer() {
  const sellerOnlineEnabled=isSellerOnlinePaymentsEnabled();
  return (
    <footer className="relative border-t border-[rgba(216,214,211,0.12)] bg-[rgba(7,7,10,0.72)] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_10%_0%,rgba(212,178,106,0.12),transparent_32%),radial-gradient(circle_at_90%_70%,rgba(216,214,211,0.10),transparent_35%)]" />
      <div className="container-feya relative z-10 py-10 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        <div className="lg:col-span-4">
          <Link href="/" aria-label="FEYA home" className="inline-flex">
            <FeyaMark variant="chrome" width={96} />
          </Link>
          <p className="editorial-italic mt-4 max-w-sm text-[17px] leading-relaxed text-[var(--bone-dim)]">
            Handmade stage, festival and performance pieces in mirror acrylic and vegan leather, with product-specific materials shown on each design.
          </p>
          <div className="mt-5 flex items-center gap-4">
            <Link
              href="mailto:manager.feya@gmail.com"
              aria-label="Email"
              className="w-11 h-11 rounded-full border border-[rgba(216,214,211,0.18)] flex items-center justify-center text-[var(--bone-dim)] hover:text-white hover:border-[rgba(216,214,211,0.45)] transition-all"
            >
              <Mail size={17} strokeWidth={1.4} />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-10">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <div className="eyebrow text-[10.5px] mb-4">{column.title}</div>
              <div className="space-y-3">
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
        <div className="container-feya pt-4 text-[11px] leading-5 text-[rgba(200,194,181,0.68)]">
          <p>
            {sellerOnlineEnabled ? 'Payment Processing & Shipping Operator: ' : 'Planned Payment Processing & Shipping Operator (activation pending): '}
            {SELLER_ONLINE_PROVIDER.legalName}, {SELLER_ONLINE_PROVIDER.contactAddress.line1},
            {' '}{SELLER_ONLINE_PROVIDER.contactAddress.city}, {SELLER_ONLINE_PROVIDER.contactAddress.region} {SELLER_ONLINE_PROVIDER.contactAddress.postalCode}, {SELLER_ONLINE_PROVIDER.contactAddress.country}.
          </p>
          {!sellerOnlineEnabled && <p>Online payment is not active. No payment is processed by Seller-Online LLC on this catalog website at this stage.</p>}
        </div>
        <div className="container-feya py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-[10px] tracking-[0.34em] uppercase text-[rgba(200,194,181,0.58)]">
          <span>© TheFEYA Atelier · Made to order</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <span>· Checkout not active</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
