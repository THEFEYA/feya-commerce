'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Boxes, CheckCircle2, ClipboardList, FileImage, FileSearch, FileText, GitBranch, Home, ImageIcon, Layers3, ListChecks, ListTree, PackageSearch, Rocket, Scale, ShieldCheck, Tags, Upload, WalletCards } from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Обзор', note: 'Панель контроля', icon: Home },
  { href: '/admin/products', label: 'Товары', note: 'Таблица v4-каталога', icon: PackageSearch },
  { href: '/admin/launch', label: 'Запуск', note: 'готово / заблокировано', icon: Rocket },
  { href: '/admin/indexation', label: 'Индексация', note: 'готовность к поиску', icon: FileSearch },
  { href: '/admin/seo-lab', label: 'SEO-лаборатория', note: 'оценка правил', icon: BarChart3 },
  { href: '/admin/seo-engine/metric-import/validate', label: 'CSV метрики', note: 'проверка Google-файлов', icon: Upload },
  { href: '/admin/seo-engine/scoring', label: 'Scoring ключей', note: 'баллы и роли ключей', icon: Scale },
  { href: '/admin/seo-engine/briefs', label: 'SEO-бриф', note: 'товар + ключи + черновик', icon: ListChecks },
  { href: '/admin/seo-engine/angle-advisor', label: 'Советник угла', note: 'развести похожие товары', icon: ShieldCheck },
  { href: '/admin/seo-keywords', label: 'SEO-ключи', note: 'очередь keyword bank', icon: Tags },
  { href: '/admin/seo-approval', label: 'Проверка SEO', note: 'черновики на проверке', icon: CheckCircle2 },
  { href: '/admin/seo-export', label: 'SEO-экспорт', note: 'одобренные тексты', icon: FileText },
  { href: '/admin/seo-apply', label: 'Создать SEO-правки', note: 'предпросмотр изменений', icon: Layers3 },
  { href: '/admin/seo-change-sets', label: 'Очередь SEO-правок', note: 'строки на проверке', icon: FileText },
  { href: '/admin/seo-applied-values', label: 'SEO-значения', note: 'одобренные значения', icon: CheckCircle2 },
  { href: '/admin/seo-storefront-preview', label: 'SEO-предпросмотр', note: 'сравнение с витриной', icon: FileSearch },
  { href: '/admin/seo-gate', label: 'SEO-шлюз', note: 'статус процесса', icon: FileText },
  { href: '/admin/content', label: 'Контент', note: 'готовность текстов', icon: FileText },
  { href: '/admin/graph', label: 'Товарные связи', note: 'SEO-кандидаты', icon: GitBranch },
  { href: '/admin/collections', label: 'Коллекции', note: 'SEO-планирование', icon: ListTree },
  { href: '/admin/review/labels', label: 'Проверка названий', note: 'публичные названия', icon: Tags },
  { href: '/admin/review/prices', label: 'Проверка цен', note: 'точность и суммы', icon: WalletCards },
  { href: '/admin/review/components', label: 'Компоненты', note: 'комплект / набор', icon: Boxes },
  { href: '/admin/media', label: 'Проверка медиа', note: 'hover и галерея', icon: ImageIcon },
  { href: '/admin/media-seo', label: 'SEO медиа', note: 'готовность картинок', icon: FileImage },
  { href: '/admin/seo', label: 'SEO-готовность', note: 'связи и фиды', icon: Layers3 },
  { href: '/admin/orders', label: 'Заказы', note: 'черновики заказов', icon: ClipboardList },
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
        <div className="font-tall text-[32px] leading-none text-bone">Панель управления</div>
        <div className="mt-2 text-[11px] leading-relaxed text-[var(--bone-dim)]">Внутренняя админка · слой качества v4</div>
      </Link>

      <nav className="mt-5 space-y-1.5 overflow-y-auto pr-1">
        {NAV.map(({ href, label, note, icon: Icon }) => {
          const active = isActive(pathname, href);
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`group grid grid-cols-[32px_1fr] gap-3 rounded-xl border px-3 py-3 transition-all ${active ? 'border-[rgba(212,178,106,.62)] bg-[rgba(212,178,106,.12)] text-white shadow-[0_0_28px_rgba(212,178,106,.12)] ring-1 ring-[rgba(212,178,106,.18)]' : 'border-transparent text-[var(--bone-dim)] hover:border-[rgba(216,214,211,.16)] hover:bg-white/[.035] hover:text-white'}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${active ? 'border-[rgba(212,178,106,.55)] bg-[rgba(212,178,106,.10)] text-[var(--gold-warm)]' : 'border-[rgba(216,214,211,.10)] text-[var(--smoke)] group-hover:text-[var(--bone)]'}`}><Icon size={15} /></div>
            <div>
              <div className="flex items-center gap-2 text-[13px] leading-tight">{label}{active ? <span className="rounded-full border border-[rgba(212,178,106,.40)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.14em] text-[var(--gold-warm)]">сейчас</span> : null}</div>
              <div className={`mt-1 text-[10px] leading-tight ${active ? 'text-[rgba(232,226,217,.74)]' : 'text-[var(--smoke)]'}`}>{note}</div>
            </div>
          </Link>;
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-[rgba(216,214,211,.10)] bg-black/20 p-4">
        <div className="flex items-center gap-2 eyebrow-dim mb-2"><BarChart3 size={13} /> Режим</div>
        <div className="text-[12px] leading-relaxed text-[var(--bone-dim)]">Внутренний режим контроля. Оплата остаётся выключенной до готовности чеклиста запуска.</div>
      </div>
    </div>
  </aside>;
}
