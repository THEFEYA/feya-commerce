export type SeoSourceStatus = 'active' | 'manual_bridge' | 'planned' | 'future' | 'not_allowed_for_metrics';

export type SeoKeywordSourcePlanItem = {
  id: string;
  labelRu: string;
  status: SeoSourceStatus;
  roleRu: string;
  givesRu: string[];
  doesNotGiveRu: string[];
  nextStepRu: string;
};

export type SeoAgentNode = {
  id: string;
  labelRu: string;
  status: 'ready_contract' | 'partial_ui' | 'planned_backend' | 'future';
  responsibilityRu: string;
  inputRu: string[];
  outputRu: string[];
};

export const seoKeywordSources: SeoKeywordSourcePlanItem[] = [
  {
    id: 'product_dna_seed',
    labelRu: 'Product DNA seed',
    status: 'active',
    roleRu: 'Первичный внутренний источник фраз для конкретного товара.',
    givesRu: ['компоненты товара', 'цвет и материал', 'события', 'образ', 'точные длинные запросы'],
    doesNotGiveRu: ['search volume', 'competition', 'CPC', 'рыночный спрос'],
    nextStepRu: 'Использовать как стартовый seed, но не как финальный источник метрик.',
  },
  {
    id: 'old_etsy_memory',
    labelRu: 'Старые Etsy-паспорта и память бренда',
    status: 'active',
    roleRu: 'Семантическая память: кластеры, стиль, сниппеты, правила названий и анти-дубли.',
    givesRu: ['структуру смыслов', 'brand fit', 'словарь компонентов', 'правила TheFEYA tone'],
    doesNotGiveRu: ['свежие Google-метрики', 'актуальный спрос', 'конкуренцию в Google'],
    nextStepRu: 'Использовать как контроль релевантности и brand fit, а не как рынок.',
  },
  {
    id: 'csv_manual_keyword_planner',
    labelRu: 'CSV / ручной Keyword Planner bridge',
    status: 'manual_bridge',
    roleRu: 'Практический мост до полноценного Google Ads API доступа.',
    givesRu: ['avg monthly searches', 'competition', 'bid ranges', 'source/date provenance'],
    doesNotGiveRu: ['полную автоматизацию', 'ежедневное обновление', 'автоматический approval'],
    nextStepRu: 'Скачать CSV из Studio, заполнить метрики из внешнего источника и импортировать обратно.',
  },
  {
    id: 'google_ads_api',
    labelRu: 'Google Ads API / Keyword Planner',
    status: 'planned',
    roleRu: 'Главный официальный источник keyword ideas и исторических метрик.',
    givesRu: ['keyword ideas', 'avg monthly searches', 'competition', 'competition index', 'top-of-page bid ranges', 'location/language targeting'],
    doesNotGiveRu: ['гарантию органического ранжирования', 'готовый SEO-текст', 'brand fit без нашей логики'],
    nextStepRu: 'Подключить backend-only adapter после готовности Ads credentials и access.',
  },
  {
    id: 'dataforseo',
    labelRu: 'DataForSEO Google Ads Keywords Data',
    status: 'planned',
    roleRu: 'Платный fallback, если Google Ads API задерживается или нужен быстрый batch.',
    givesRu: ['search volume', 'keyword ideas', 'CPC', 'impressions/clicks для paid context'],
    doesNotGiveRu: ['бесплатный официальный источник', 'полную замену ручной проверки качества'],
    nextStepRu: 'Подключать только если нужен быстрый production batch до Google Ads API.',
  },
  {
    id: 'google_trends',
    labelRu: 'Google Trends',
    status: 'planned',
    roleRu: 'Только сезонность и направление интереса, не абсолютный volume.',
    givesRu: ['trend direction', 'seasonality', 'regional interest'],
    doesNotGiveRu: ['точный monthly search volume', 'competition', 'CPC'],
    nextStepRu: 'Использовать после метрик как сезонный слой для Burning Man, Halloween, Pride, festival season.',
  },
  {
    id: 'search_console',
    labelRu: 'Google Search Console',
    status: 'future',
    roleRu: 'Источник реальных impressions/clicks после индексации сайта.',
    givesRu: ['queries', 'impressions', 'clicks', 'CTR', 'average position'],
    doesNotGiveRu: ['данные до запуска и индексации', 'market demand до появления страниц'],
    nextStepRu: 'Подключать после публикации страниц и первых показов.',
  },
  {
    id: 'openai',
    labelRu: 'OpenAI',
    status: 'not_allowed_for_metrics',
    roleRu: 'Писатель, нормализатор, классификатор и QA-агент. Не источник метрик.',
    givesRu: ['нормализация DNA', 'расширение seed-фраз', 'классификация intents', 'черновики текстов', 'humanizer QA'],
    doesNotGiveRu: ['search volume', 'competition', 'CPC', 'реальный спрос'],
    nextStepRu: 'Использовать только после того, как метрики и product truth подтверждены.',
  },
];

export const seoAgentPipeline: SeoAgentNode[] = [
  {
    id: 'dna_normalizer',
    labelRu: 'Product DNA Normalizer',
    status: 'partial_ui',
    responsibilityRu: 'Понять, что реально продаётся: детали, цвет, материал, событие, запретные обещания.',
    inputRu: ['storefront product row', 'old passports', 'component vocabulary'],
    outputRu: ['product facts', 'semantic buckets', 'blockers'],
  },
  {
    id: 'keyword_research',
    labelRu: 'Keyword Research Agent',
    status: 'ready_contract',
    responsibilityRu: 'Собрать seed-фразы и отправить их во внешний источник метрик.',
    inputRu: ['Product DNA', 'semantic buckets', 'brand memory'],
    outputRu: ['keyword candidates', 'CSV/API request package'],
  },
  {
    id: 'metric_ingestion',
    labelRu: 'Metric Ingestion Agent',
    status: 'manual_bridge',
    responsibilityRu: 'Принять CSV/API-ответ и проверить источник, дату, регион, язык и поля метрик.',
    inputRu: ['CSV manual import', 'Google Ads API response', 'DataForSEO response'],
    outputRu: ['validated metric snapshots'],
  },
  {
    id: 'scoring',
    labelRu: 'Keyword Scoring Agent',
    status: 'partial_ui',
    responsibilityRu: 'Распределить ключи на главный, вторичный, supporting, long-tail, hold, reject.',
    inputRu: ['validated metrics', 'Product DNA', 'placement rules'],
    outputRu: ['scored keyword portfolio'],
  },
  {
    id: 'strategy',
    labelRu: 'SEO Strategy Agent',
    status: 'partial_ui',
    responsibilityRu: 'Выбрать уникальный угол товара и развести похожие товары по смыслу.',
    inputRu: ['keyword portfolio', 'similar products', 'brand rules'],
    outputRu: ['selected angle', 'placement plan'],
  },
  {
    id: 'writer',
    labelRu: 'Human SEO Writer Agent',
    status: 'planned_backend',
    responsibilityRu: 'Сгенерировать SEO Pack только по подтверждённым ключам и выбранному углу.',
    inputRu: ['selected angle', 'approved keywords', 'snippet library', 'product facts'],
    outputRu: ['title', 'H1', 'meta', 'description', 'FAQ', 'alt text', 'internal links'],
  },
  {
    id: 'humanizer_qa',
    labelRu: 'Humanizer / QA Agent',
    status: 'planned_backend',
    responsibilityRu: 'Проверить текст на водность, AI-шаблонность, повторы, keyword stuffing, правду товара и уникальность.',
    inputRu: ['SEO Pack draft', 'TheFEYA tone rules', 'existing product texts'],
    outputRu: ['QA blockers', 'rewrite suggestions', 'approval readiness'],
  },
  {
    id: 'approval',
    labelRu: 'Operator Approval Gate',
    status: 'future',
    responsibilityRu: 'Ничего не публиковать без ручного подтверждения оператора.',
    inputRu: ['QA-passed SEO Pack'],
    outputRu: ['approved SEO draft', 'future save payload'],
  },
];
