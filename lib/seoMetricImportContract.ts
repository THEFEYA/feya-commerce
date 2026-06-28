export type SeoMetricImportSourceId = 'google_ads' | 'csv_manual' | 'erank' | 'dataforseo' | 'google_trends' | 'search_console_future';

export type SeoMetricImportColumn = {
  key: string;
  label: string;
  required: boolean;
  purpose: string;
};

export type SeoMetricImportSource = {
  id: SeoMetricImportSourceId;
  label: string;
  role: string;
  trust: 'primary' | 'fallback' | 'supporting' | 'future';
  allowedForScoring: boolean;
};

export type SeoMetricImportRule = {
  label: string;
  severity: 'blocker' | 'warning';
  rule: string;
};

export type SeoMetricImportStep = {
  status: string;
  label: string;
  meaning: string;
  nextStep: string;
};

export type SeoMetricImportSampleRow = {
  keyword: string;
  bucket: string;
  region: string;
  language: 'en';
  metric_source: SeoMetricImportSourceId;
  avg_monthly_searches: number | null;
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  low_bid: number | null;
  high_bid: number | null;
  trend: string | null;
  seasonality: string | null;
  last_checked: string | null;
  import_status: 'template_only';
};

export type SeoMetricImportContract = {
  status: 'contract_ready_no_writes';
  proposedTable: string;
  writeMode: 'disabled_in_current_phase';
  uniqueKey: string[];
  sources: SeoMetricImportSource[];
  requiredColumns: SeoMetricImportColumn[];
  optionalColumns: SeoMetricImportColumn[];
  validationRules: SeoMetricImportRule[];
  statusFlow: SeoMetricImportStep[];
  sampleRows: SeoMetricImportSampleRow[];
};

export function buildSeoMetricImportContract(keywords: string[]): SeoMetricImportContract {
  const sampleKeywords = Array.from(new Set(keywords.filter(Boolean))).slice(0, 8);

  return {
    status: 'contract_ready_no_writes',
    proposedTable: 'feya_commerce_seo_keyword_metric_snapshots_v1',
    writeMode: 'disabled_in_current_phase',
    uniqueKey: ['keyword', 'region', 'language', 'metric_source', 'last_checked'],
    sources: [
      { id: 'google_ads', label: 'Google Ads API', role: 'Главный источник спроса и конкуренции для Google search intent.', trust: 'primary', allowedForScoring: true },
      { id: 'csv_manual', label: 'CSV / ручной импорт', role: 'Безопасный первый fallback: проверить фразы снаружи и вернуть файл обратно.', trust: 'fallback', allowedForScoring: true },
      { id: 'erank', label: 'eRank', role: 'Дополнительный marketplace/Etsy signal.', trust: 'supporting', allowedForScoring: true },
      { id: 'dataforseo', label: 'DataForSEO', role: 'Платный API-адаптер, если Google Ads API ограничен.', trust: 'supporting', allowedForScoring: true },
      { id: 'google_trends', label: 'Google Trends', role: 'Сезонность и направление тренда, но не абсолютный volume.', trust: 'supporting', allowedForScoring: false },
      { id: 'search_console_future', label: 'Search Console позже', role: 'Фактическая органика после индексации.', trust: 'future', allowedForScoring: false },
    ],
    requiredColumns: [
      { key: 'keyword', label: 'Ключевая фраза', required: true, purpose: 'Связать метрику с фразой из validation package.' },
      { key: 'region', label: 'Регион', required: true, purpose: 'Не смешивать спрос разных рынков.' },
      { key: 'language', label: 'Язык', required: true, purpose: 'Публичный SEO-контент TheFEYA строится на английском.' },
      { key: 'metric_source', label: 'Источник метрик', required: true, purpose: 'Запретить финальный scoring без provenance.' },
      { key: 'avg_monthly_searches', label: 'Средний спрос', required: true, purpose: 'Оценить реальный demand без фантазий.' },
      { key: 'competition', label: 'Конкуренция', required: true, purpose: 'Понять шанс пройти конкуренцию.' },
      { key: 'last_checked', label: 'Дата проверки', required: true, purpose: 'Не использовать старые метрики как свежие.' },
    ],
    optionalColumns: [
      { key: 'low_bid', label: 'Нижняя ставка', required: false, purpose: 'Коммерческая ценность ключа.' },
      { key: 'high_bid', label: 'Верхняя ставка', required: false, purpose: 'Коммерческая ценность и конкуренция.' },
      { key: 'trend', label: 'Тренд', required: false, purpose: 'Растёт, падает или стабилен спрос.' },
      { key: 'seasonality', label: 'Сезонность', required: false, purpose: 'Связка с фестивалями и сезонными пиками.' },
      { key: 'notes', label: 'Заметки', required: false, purpose: 'Ручное объяснение спорного сигнала.' },
    ],
    validationRules: [
      { label: 'Источник обязателен', severity: 'blocker', rule: 'Без metric_source фраза не переходит в ready_for_scoring.' },
      { label: 'Дата обязательна', severity: 'blocker', rule: 'Без last_checked метрики нельзя считать актуальными.' },
      { label: 'Регион обязателен', severity: 'blocker', rule: 'Метрики без региона не смешиваются с US/UK/EU/CA/AU.' },
      { label: 'Спрос не отрицательный', severity: 'blocker', rule: 'avg_monthly_searches должен быть числом >= 0.' },
      { label: 'Конкуренция нормализуется', severity: 'blocker', rule: 'competition должен быть LOW / MEDIUM / HIGH.' },
      { label: 'Trends не заменяет volume', severity: 'warning', rule: 'Google Trends помогает seasonality, но не заменяет search volume.' },
    ],
    statusFlow: [
      { status: 'needs_metrics', label: 'Нужны метрики', meaning: 'Фраза релевантна, но ещё не доказана данными.', nextStep: 'Отправить на проверку.' },
      { status: 'metrics_imported', label: 'Метрики импортированы', meaning: 'Данные вернулись, но не прошли проверку.', nextStep: 'Проверить формат и source.' },
      { status: 'ready_for_scoring', label: 'Готово к scoring', meaning: 'Метрики валидны.', nextStep: 'Применить scoring contract.' },
      { status: 'scored', label: 'Оценено', meaning: 'Ключ получил балл и роль.', nextStep: 'Собрать портфель.' },
      { status: 'approved_for_draft', label: 'Одобрено для черновика', meaning: 'Оператор подтвердил стратегию.', nextStep: 'Создать SEO-черновик.' },
    ],
    sampleRows: sampleKeywords.map((keyword) => ({
      keyword,
      bucket: 'from_validation_package',
      region: 'US',
      language: 'en',
      metric_source: 'csv_manual',
      avg_monthly_searches: null,
      competition: null,
      low_bid: null,
      high_bid: null,
      trend: null,
      seasonality: null,
      last_checked: null,
      import_status: 'template_only',
    })),
  };
}
