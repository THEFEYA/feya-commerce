import Link from 'next/link';
import { BarChart3, Bot, PackageSearch, Search, Settings2, TrendingUp } from 'lucide-react';

const ITEMS = [
  {
    href: '/admin/company/growth',
    title: 'Рост',
    copy: 'Спрос, возможности, поисковая структура и техническое состояние роста.',
    icon: TrendingUp,
  },
  {
    href: '/admin/company/results',
    title: 'Результаты',
    copy: 'Эксперименты, изменения, измерение эффекта и подтверждённые выводы.',
    icon: BarChart3,
  },
  {
    href: '/admin/company/system',
    title: 'Система',
    copy: 'Источники данных, готовность, права, автоматизация и ограничения.',
    icon: Settings2,
  },
  {
    href: '/admin/roles',
    title: 'Команда FEYA',
    copy: 'Логические роли, фактическая активность и предел самостоятельности.',
    icon: Bot,
  },
  {
    href: '/admin/company/search',
    title: 'Поиск',
    copy: 'Найти товар, страницу, ключевой запрос, работу или сигнал.',
    icon: Search,
  },
  {
    href: '/admin',
    title: 'Товарная админка',
    copy: 'Вернуться в утверждённый Product OS для ежедневной работы с товарами.',
    icon: PackageSearch,
  },
] as const;

export default function OwnerMorePage() {
  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Навигация</div>
            <h1>Ещё</h1>
            <p>Разделы, которые на мобильном экране не должны занимать постоянное место в нижней панели.</p>
          </div>
        </header>

        <section className="owner-grid two" style={{ marginTop: 0 }}>
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} className="owner-card owner-more-card" key={item.href}>
                <div className="owner-more-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.8} /></div>
                <h2 className="owner-card-title">{item.title}</h2>
                <p className="owner-card-copy">{item.copy}</p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
