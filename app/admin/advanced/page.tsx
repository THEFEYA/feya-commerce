import Link from 'next/link';

const GROUPS = [
  {
    title: 'Товары и контент',
    items: [
      ['/admin/review', 'Старые очереди проверки'],
      ['/admin/product-facts-review', 'Проверка фактов о товарах'],
      ['/admin/content-briefs', 'Готовность контентных заданий'],
      ['/admin/content-qa', 'Диагностика контроля качества'],
      ['/admin/business-truth', 'Правила бизнеса'],
    ],
  },
  {
    title: 'Поиск',
    items: [
      ['/admin/seo-keywords', 'Ключевые слова'],
      ['/admin/seo-keyword-review', 'Проверка ключевых слов'],
      ['/admin/seo-clusters', 'Группы запросов'],
      ['/admin/seo-cluster-proposals', 'Предложения групп запросов'],
      ['/admin/seo-ownership-proposals', 'Предложения ответственности страниц'],
      ['/admin/seo-portfolio', 'Портфель поисковых страниц'],
      ['/admin/seo-indexability', 'Допуск к индексации'],
    ],
  },
  {
    title: 'Growth OS',
    items: [
      ['/admin/advanced/signals', 'Сырые сигналы'],
      ['/admin/owner-attention', 'Очередь решений владельца'],
      ['/admin/strategy', 'Стратегия и инициативы'],
      ['/admin/opportunities', 'Возможности'],
      ['/admin/experiments', 'Эксперименты'],
      ['/admin/learning', 'Реестр выводов'],
      ['/admin/roles', 'Состояние ролей'],
    ],
  },
  {
    title: 'Надёжность и выполнение',
    items: [
      ['/admin/system-readiness', 'Возможности системы'],
      ['/admin/launch-readiness', 'Готовность к запуску'],
      ['/admin/data-authority', 'Источники истины'],
      ['/admin/data-health', 'Состояние данных'],
      ['/admin/incidents', 'Сбои и блокировки изменений'],
      ['/admin/execution-map', 'Карта разрешённых действий'],
      ['/admin/executions', 'История выполнения'],
      ['/admin/scenario-tests', 'Проверки надёжности'],
      ['/admin/metrics', 'Реестр метрик'],
    ],
  },
] as const;

export default function AdminAdvancedPage() {
  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Инженерная глубина</div>
            <h1>Технические детали</h1>
            <p>Старые диагностические экраны сохранены для проверки системы. Здесь могут встречаться внутренние коды и инженерные термины — они не являются основным интерфейсом владельца.</p>
          </div>
        </header>

        <div className="owner-grid two">
          {GROUPS.map((group) => (
            <section className="owner-card" key={group.title}>
              <h2 className="owner-card-title">{group.title}</h2>
              <div className="owner-list" style={{ marginTop: '12px' }}>
                {group.items.map(([href, label]) => (
                  <Link href={href} className="owner-list-row" key={href}>
                    <div className="owner-list-row-main"><h3>{label}</h3></div>
                    <div className="owner-list-row-side"><span>Открыть →</span></div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
