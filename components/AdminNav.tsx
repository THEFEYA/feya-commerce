'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Boxes, ClipboardList, FileImage, FileSearch, FileText, GitBranch, Home, ImageIcon, Layers3, ListTree, PackageSearch, Rocket, Tags, WalletCards } from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Overview', note: 'Control cockpit', icon: Home },
  { href: '/admin/products', label: 'Products', note: 'v4 catalog table', icon: PackageSearch },
  { href: '/admin/launch', label: 'Launch Pipeline', note: 'ready / blocked', icon: Rocket },
  { href: '/admin/indexation', label: 'Indexation', note: 'search readiness', icon: FileSearch },
  { href: '/admin/seo-lab', label: 'SEO Lab', note: 'rule scoring', icon: BarChart3 },
  { href: '/admin/content', label: 'Content Pipeline', note: 'copy readiness', icon: FileText },
  { href: '/admin/graph', label: 'Product Graph', note: 'SEO candidates', icon: GitBranch },
  { href: '/admin/collections', label: 'Collections', note: 'SEO planning', icon: ListTree },
  { href: '/admin/review/labels', label: 'Label Review', note: 'buyer-facing labels', icon: Tags },
  { href: '/admin/review/prices', label: 'Price Review', note: 'confidence & sums', icon: WalletCards },
  { href: '/admin/review/components', label: 'Components', note: 'full set / bundle', icon: Boxes },
  { href: '/admin/media', label: 'Media QA', note: 'hover & gallery', icon: ImageIcon },
  { href: '/admin/media-seo', label: 'Media SEO', note: 'image readiness', icon: FileImage },
  { href: '/admin/seo', label: 'SEO Readiness', note: 'graph & feeds', icon: Layers3 },
  { href: '/admin/orders', label: 'Orders', note: 'draft review queue', icon: ClipboardList },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname() || '/admin';

  return <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[292px] border-r border-[rgba(216,214,211,.12)] bg-[linear-gradient(180deg,rgba(7,7,10,.94),rgba(17,16,22,.94))] backdrop-blur-xl lg:block">
    <div className="flex h-full flex-col p-5">
      <Link href="/admin" className="rounded-2xl border border-[rgba(216,214,211,.13)] bg-[rgba(255,255,255,.035)] p-4 hover:border-[rgba(212,178,106,.35)] transition-colors">
        <div className="eyebrow-gold mb-2">FEYA</div>
        <div className="font-tall text-[32px] leading-none text-bone">Control Tower</div>
        <div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">Internal admin · v4 quality layer</div>
      </Link>

      <nav className="mt-5 space-y-1.5 overflow-y-auto pr-1">
        {NAV.map(({ href, label, note, icon: Icon }) => {
          const active = isActive(pathname, href);
          return <Link key={href} href={href} className={`group grid grid-cols-[32px_1fr] gap-3 rounded-xl border px-3 py-3 transition-all ${active ? 'border-[rgba(212,178,106,.45)] bg-[rgba(212,178,106,.075)] text-white shadow-[0_0_28px_rgba(212,178,106,.08)]' : 'border-transparent text-[var(--bone-dim)] hover:border-[rgba(216,214,211,.16)] hover:bg-white/[.035] hover:text-white'}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${active ? 'border-[rgba(212,178,106,.40)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.10)] text-[var(--smoke)] group-hover:text-[var(--bone)]'}`}><Icon size={15} /></div>
            <div>
              <div className="text-[13px] leading-tight">{label}</div>
              <div className="mt-1 text-[10px] leading-tight text-[var(--smoke)]">{note}</div>
            </div>
          </Link>;
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/20 p-4">
        <div className="flex items-center gap-2 eyebrow-dim mb-2"><BarChart3 size={13} /> Mode</div>
        <div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">Internal control mode. Payment remains off until the launch checklist is ready.</div>
      </div>
    </div>
  </aside>;
}
