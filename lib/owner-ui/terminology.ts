export type OwnerTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const ROLE_LABELS: Record<string, string> = {
  GROWTH_DIRECTOR: 'Директор по росту',
  OSPM: 'Стратег органического поиска',
  CPIM: 'Аналитик товаров и продаж',
  GMEL: 'Аналитик результатов и экспериментов',
  SCO: 'Редактор SEO-контента',
  CQA: 'Контроль качества контента',
  TSEO: 'Специалист по техническому SEO',
  GDAE: 'Инженер данных и аналитики',
  HUMAN_OWNER: 'Владелец',
  CORE: 'Система FEYA',
};

const STATUS_LABELS: Record<string, string> = {
  INACTIVE: 'Не активирован',
  SHADOW: 'Режим наблюдения',
  ACTIVE: 'Активен',
  PAUSED: 'Приостановлен',
  OPEN: 'Открыто',
  ACKNOWLEDGED: 'Принято к рассмотрению',
  QUEUED: 'В очереди',
  RUNNING: 'В работе',
  WAITING: 'Ожидает',
  WAITING_FOR_DATA: 'Ждёт данных',
  WAITING_FOR_CONDITION: 'Ждёт условия',
  WAITING_FOR_OWNER: 'Ждёт вашего решения',
  BLOCKED: 'Заблокировано',
  COMPLETED: 'Работа завершена',
  MEASURING: 'Измеряем результат',
  LEARNING: 'Формируем вывод',
  CLOSED: 'Закрыто',
  CANCELLED: 'Отменено',
  AVAILABLE: 'Работает',
  HEALTHY: 'Работает',
  AVAILABLE_WITH_LIMITATIONS: 'Работает с ограничениями',
  DEGRADED: 'Работает нестабильно',
  UNAVAILABLE: 'Недоступно',
  NOT_OBSERVABLE: 'Недостаточно данных',
  STALE: 'Данные устарели',
  NOT_RUN: 'Ещё не проверено',
  PASS: 'Проверка пройдена',
  WARN: 'Нужно проверить',
  FAIL: 'Проверка не пройдена',
  ERROR: 'Ошибка проверки',
  PRE_LAUNCH: 'Подготовка к запуску',
};

const ATTENTION_TYPE_LABELS: Record<string, string> = {
  APPROVAL: 'Нужно подтверждение',
  STRATEGY_DECISION: 'Нужно стратегическое решение',
  HUMAN_ACTION: 'Нужно ваше действие',
  CRITICAL_INCIDENT: 'Критичная проблема',
  EXPIRING_OPPORTUNITY: 'Возможность с ограниченным сроком',
  POLICY_DECISION: 'Нужно подтвердить правило',
};

const SCOPE_LABELS: Record<string, string> = {
  PUBLIC_SITE: 'Сайт',
  SEARCH_INDEXING: 'Поиск',
  COMMERCE: 'Продажи',
  MEASUREMENT: 'Измерение результатов',
};

const PRIORITY_LABELS: Record<string, string> = {
  P0: 'Критично',
  P1: 'Важно',
  P2: 'Требует внимания',
  P3: 'Для сведения',
};

const SOURCE_LABELS: Record<string, string> = {
  BEHAVIORAL_ANALYTICS: 'Поведение пользователей (GA4)',
  BUSINESS_OPERATIONAL_POLICY: 'Правила бизнеса',
  COMMERCE_ORDER_TRUTH: 'Подтверждённые заказы',
  COMMERCE_REVENUE_TRUTH: 'Выручка и возвраты',
  DERIVED_GROWTH_SIGNALS: 'Сигналы FEYA',
  EXTERNAL_KEYWORD_DEMAND: 'Спрос на ключевые слова',
  LEGACY_MARKETPLACE_HISTORY: 'Исторические данные маркетплейсов',
  ORGANIC_SEARCH_PERFORMANCE: 'Органический поиск (Search Console)',
  PRODUCT_FACTS: 'Факты о товарах',
  SEO_PAGE_PORTFOLIO_AUTHORITY: 'Поисковые страницы и их ответственность',
};

const SIGNAL_COPY: Record<string, { title: string; summary: string; action: string }> = {
  OSPM_KEYWORD_CLEANUP_BACKLOG: {
    title: 'Разобрать очередь ключевых слов',
    summary: 'Проверка ключевых слов ещё не завершена, поэтому группы запросов пока нельзя закреплять как канонические.',
    action: 'Продолжить проверку ключевых слов и только после этого формировать группы запросов.',
  },
  LAUNCH_PUBLIC_SITE_ADMIN_DATA_BOUNDARY: {
    title: 'Закрыть внутренние данные админки',
    summary: 'Внутренние экраны пока доступны в режиме предварительного просмотра до включения защищённого входа.',
    action: 'Сначала проверить вход владельца, затем закрыть прямой доступ к внутренним данным.',
  },
  LAUNCH_PUBLIC_SITE_ADMIN_SECURITY: {
    title: 'Включить защищённый вход в админку',
    summary: 'Механизм входа и список разрешённых аккаунтов уже подготовлены, но ещё не включены.',
    action: 'Подтвердить аккаунт владельца, включить защиту и проверить вход, выход и блокировку посторонних.',
  },
  LAUNCH_PUBLIC_SITE_PRODUCTION_DOMAIN: {
    title: 'Подключить основной домен сайта',
    summary: 'Проект пока работает только на технических адресах Vercel.',
    action: 'Подключить и проверить zofeya.com перед публичным запуском.',
  },
  LAUNCH_PUBLIC_SITE_RETURN_POLICY_CANON: {
    title: 'Подтвердить правила возврата',
    summary: 'Для сайта пока нет подтверждённого текста правил возврата.',
    action: 'Подтвердить актуальные правила возврата перед публикацией.',
  },
  LAUNCH_SEARCH_INDEXING_CONTENT_PUBLISH_READINESS: {
    title: 'Довести контент до готовности к публикации',
    summary: 'Сейчас нет материалов, которые прошли все проверки и готовы к публикации.',
    action: 'Завершить автоматические проверки, человеческую проверку и независимый контроль качества.',
  },
  LAUNCH_SEARCH_INDEXING_INDEXABLE_PAGE_PORTFOLIO: {
    title: 'Подтвердить страницы для индексации',
    summary: 'Ни одна страница пока не разрешена к индексации автоматически.',
    action: 'Сначала завершить проверку поисковой структуры и вручную подтвердить подходящие страницы.',
  },
  LAUNCH_SEARCH_INDEXING_PRODUCTION_DOMAIN: {
    title: 'Подготовить основной домен для поиска',
    summary: 'Поисковая индексация не должна включаться до подключения основного домена.',
    action: 'Подключить и проверить zofeya.com, затем отдельно решать вопрос индексации.',
  },
  LAUNCH_SEARCH_INDEXING_QUERY_PAGE_OWNERSHIP: {
    title: 'Закрепить поисковые запросы за страницами',
    summary: 'Основные группы запросов пока не закреплены за конкретными страницами.',
    action: 'Завершить проверку ключевых слов, группировку запросов и назначение основной страницы.',
  },
  LAUNCH_COMMERCE_COMMERCE_CHECKOUT: {
    title: 'Определиться с оформлением заказа',
    summary: 'В приложении пока нет реального оформления заказа и оплаты.',
    action: 'До появления реальной оплаты не включать аналитику покупок и возвратов.',
  },
  LAUNCH_COMMERCE_COMMERCE_ORDER_TRUTH: {
    title: 'Подключить достоверные данные о заказах',
    summary: 'Черновики заказов нельзя считать подтверждёнными продажами или выручкой.',
    action: 'Подключить реальный источник завершённых заказов до расчёта коммерческих результатов.',
  },
  LAUNCH_COMMERCE_RETURN_POLICY_CANON: {
    title: 'Подтвердить правила возврата для продаж',
    summary: 'Правила возврата пока не подтверждены для будущего оформления заказа.',
    action: 'Подтвердить актуальные правила возврата до запуска продаж.',
  },
  LAUNCH_MEASUREMENT_GA4_COLLECTION: {
    title: 'Подключить Google Analytics 4',
    summary: 'Сбор реальных пользовательских событий с сайта пока не настроен.',
    action: 'Подключить рабочий поток GA4 и проверить события после публичного запуска сайта.',
  },
  LAUNCH_MEASUREMENT_GSC_BULK_EXPORT: {
    title: 'Подключить данные Search Console',
    summary: 'Автоматический экспорт поисковых данных ещё не настроен.',
    action: 'После запуска и подтверждения сайта подключить Search Console и экспорт данных.',
  },
  LAUNCH_MEASUREMENT_MEASUREMENT_ENGINE: {
    title: 'Запустить измерение результатов',
    summary: 'Система измерения не должна делать выводы, пока нет реальных данных сайта, поиска и заказов.',
    action: 'Сначала подключить реальные источники данных, затем включать расчёт результатов.',
  },
  SCO_SHADOW_DRAFT_OPPORTUNITY: {
    title: 'Есть товары, для которых уже можно готовить черновики',
    summary: 'Данных достаточно для безопасной подготовки черновиков, но ещё недостаточно для автоматической публикации.',
    action: 'Готовить небольшими партиями, сохраняя проверки фактов и качества.',
  },
  GDAE_GOOGLE_ADS_KEYWORD_METRICS_DEGRADED: {
    title: 'Google Ads пока не отдаёт данные по спросу',
    summary: 'Подключение и хранение данных готовы, но доступ к планировщику ключевых слов пока ограничен со стороны Google.',
    action: 'Дождаться внешнего подтверждения доступа и затем проверить небольшой реальный запрос.',
  },
  CQA_INDEPENDENT_REVIEW_QUEUE: {
    title: 'Есть материалы для независимой проверки качества',
    summary: 'Часть черновиков уже прошла предыдущие проверки и ждёт независимого контроля качества.',
    action: 'Сначала провести проверку в безопасном режиме без публикации.',
  },
  LAUNCH_SEARCH_INDEXING_TECHNICAL_SEARCH_FOUNDATION: {
    title: 'Техническая основа поиска подготовлена',
    summary: 'Robots, sitemap, canonical и защитные правила уже реализованы, но глобальная индексация пока выключена.',
    action: 'Оставить индексацию выключенной до готовности домена, страниц и поисковой структуры.',
  },
};

const GATE_COPY: Record<string, { title: string; summary?: string }> = {
  ADMIN_DATA_BOUNDARY: { title: 'Защитить внутренние данные админки' },
  ADMIN_SECURITY: { title: 'Включить защищённый вход в админку' },
  PRODUCT_CATALOG: { title: 'Каталог товаров готов' },
  PRODUCTION_DOMAIN: { title: 'Подключить основной домен сайта' },
  RETURN_POLICY_CANON: { title: 'Подтвердить правила возврата' },
  CONTENT_PUBLISH_READINESS: { title: 'Подготовить контент к публикации' },
  INDEXABLE_PAGE_PORTFOLIO: { title: 'Подтвердить страницы для индексации' },
  QUERY_PAGE_OWNERSHIP: { title: 'Закрепить поисковые запросы за страницами' },
  TECHNICAL_SEARCH_FOUNDATION: { title: 'Техническая основа поиска' },
  GA4_COLLECTION: { title: 'Подключить Google Analytics 4' },
  GSC_BULK_EXPORT: { title: 'Подключить экспорт Search Console' },
  MEASUREMENT_ENGINE: { title: 'Запустить измерение результатов' },
  MEASUREMENT_SPEC_REGISTRY: { title: 'Правила измерения результатов готовы' },
  COMMERCE_CHECKOUT: { title: 'Добавить реальное оформление заказа' },
  COMMERCE_ORDER_TRUTH: { title: 'Подключить достоверные данные о заказах' },
};

export function roleLabel(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  return ROLE_LABELS[key] || humanizeCode(key || '—');
}

export function statusLabel(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  return STATUS_LABELS[key] || humanizeCode(key || '—');
}

export function attentionTypeLabel(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  return ATTENTION_TYPE_LABELS[key] || 'Требует вашего решения';
}

export function admissionLabel(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  if (key === 'OWNER_DECISION_REQUIRED' || key === 'OWNER_ATTENTION') return 'Нужно ваше решение';
  if (key === 'WORK_QUEUE') return 'Можно передать в работу';
  if (key === 'IMPLEMENTATION_ACTION') return 'Требуется изменение системы';
  if (key === 'DEFER_UNTIL_ACTIVE_OBJECTIVE' || key === 'DEFER') return 'Отложено до нужного этапа';
  if (key === 'MONITOR') return 'Наблюдаем';
  if (key === 'CASE_CANDIDATE') return 'Можно создать рабочую ситуацию';
  return 'Для сведения';
}

export function scopeLabel(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  return SCOPE_LABELS[key] || humanizeCode(key || '—');
}

export function priorityLabel(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  return PRIORITY_LABELS[key] || 'Обычный приоритет';
}

export function sourceLabel(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  return SOURCE_LABELS[key] || humanizeCode(key || '—');
}

export function sourceHealthSummary(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  const copy: Record<string, string> = {
    BEHAVIORAL_ANALYTICS: 'GA4 пока не подключён к production-данным.',
    BUSINESS_OPERATIONAL_POLICY: 'Основные бизнес-правила доступны; правила возврата ещё требуют подтверждения владельца.',
    COMMERCE_ORDER_TRUTH: 'Достоверный источник завершённых заказов пока не подключён.',
    COMMERCE_REVENUE_TRUTH: 'Достоверные данные выручки и возвратов пока не подключены.',
    DERIVED_GROWTH_SIGNALS: 'Сигналы FEYA формируются из текущего состояния системы.',
    EXTERNAL_KEYWORD_DEMAND: 'Исторические данные спроса есть, но живой доступ Google Ads пока ограничен.',
    LEGACY_MARKETPLACE_HISTORY: 'Исторические данные маркетплейсов ещё не приведены к одному проверенному источнику.',
    ORGANIC_SEARCH_PERFORMANCE: 'Search Console пока не подключён к production-сайту.',
    PRODUCT_FACTS: 'Факты о товарах доступны и используются как основной источник для контента.',
    SEO_PAGE_PORTFOLIO_AUTHORITY: 'Портфель поисковых страниц доступен; группы запросов и ответственность страниц ещё не завершены.',
  };
  return copy[key] || 'Состояние источника требует технической проверки.';
}

export function capabilityOwnerSummary(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  const copy: Record<string, string> = {
    GOOGLE_ADS_KEYWORD_METRICS: 'Хранение данных подготовлено, но живой доступ к планировщику ключевых слов Google пока не подтверждён.',
    GSC_BULK_EXPORT: 'Подключение Search Console и автоматического экспорта возможно после запуска и подтверждения публичного сайта.',
    SEO_KEYWORD_CLEANUP: 'Очередь ключевых слов работает, но значительная часть ещё требует проверки перед группировкой.',
    QUERY_CLUSTER_REVIEW_QUEUE: 'Механика группировки запросов готова, но канонические группы не создаются без проверенных входных данных.',
    SEO_PAGE_PORTFOLIO: 'Портфель страниц создан; индексация и ответственность за запросы пока подтверждаются отдельно.',
    SEARCH_LAUNCH_GATE: 'Техническая защита индексации работает, глобальный запуск поиска намеренно выключен.',
    MEASUREMENT_ENGINE: 'Измерение бизнес-эффекта выключено до подключения реальных GA4, Search Console и данных заказов.',
    MEASUREMENT_SPEC_REGISTRY: 'Правила измерения можно задавать и фиксировать, но реальных outcome-расчётов пока нет.',
    EXPERIMENT_REGISTRY: 'Эксперименты можно описывать и контролировать, но результат нельзя считать без реальных измерительных данных.',
    LEARNING_REGISTRY: 'Выводы можно сохранять только после достаточного подтверждения; единичный результат не становится правилом.',
    CHANGE_EVENT_REGISTRY: 'История изменений фиксируется и может связываться с будущими измерениями результата.',
    ADMIN_AUTH: 'Защищённый вход подготовлен, но ещё не включён для владельца.',
    ADMIN_DATA_BOUNDARY: 'Внутренние экраны зарегистрированы для последующего закрытия прямого доступа после проверки входа.',
    AI_RUNTIME_USAGE_METERING: 'Расход токенов и время AI-вызовов измеряются; жёсткий денежный лимит пока не задан владельцем.',
  };
  return copy[key] || 'Возможность системы доступна в текущем техническом состоянии.';
}

export function ownerToneForStatus(value: unknown): OwnerTone {
  const key = String(value || '').trim().toUpperCase();
  if (['FAIL', 'ERROR', 'BLOCKED', 'UNAVAILABLE'].includes(key)) return 'danger';
  if (['WARN', 'DEGRADED', 'AVAILABLE_WITH_LIMITATIONS', 'STALE', 'WAITING_FOR_OWNER'].includes(key)) return 'warning';
  if (['PASS', 'AVAILABLE', 'ACTIVE', 'COMPLETED', 'CLOSED'].includes(key)) return 'success';
  if (['RUNNING', 'QUEUED', 'WAITING', 'MEASURING', 'LEARNING', 'SHADOW'].includes(key)) return 'info';
  return 'neutral';
}

export function ownerToneForPriority(value: unknown): OwnerTone {
  const key = String(value || '').trim().toUpperCase();
  if (key === 'P0') return 'danger';
  if (key === 'P1' || key === 'P2') return 'warning';
  return 'neutral';
}

export function signalCopy(code: unknown, fallback?: { title?: unknown; summary?: unknown; action?: unknown }) {
  const key = String(code || '').trim();
  const known = SIGNAL_COPY[key];
  return {
    title: known?.title || asReadableText(fallback?.title) || 'Новый сигнал',
    summary: known?.summary || asReadableText(fallback?.summary) || 'Система обнаружила изменение, которое стоит проверить.',
    action: known?.action || asReadableText(fallback?.action) || 'Открыть детали и определить следующий шаг.',
  };
}

export function gateTitle(code: unknown, fallback?: unknown) {
  const key = String(code || '').trim().toUpperCase();
  return GATE_COPY[key]?.title || asReadableText(fallback) || humanizeCode(key);
}

export function dataFreshnessLabel(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  if (['HEALTHY', 'FRESH', 'CURRENT', 'AVAILABLE'].includes(key)) return 'Данные актуальны';
  if (['DEGRADED', 'DELAYED'].includes(key)) return 'Данные обновляются с задержкой';
  if (key === 'AGING') return 'Данные постепенно устаревают';
  if (key === 'STALE') return 'Данные устарели';
  if (key === 'NOT_APPLICABLE') return 'Обновление не требуется';
  if (key === 'UNKNOWN') return 'Свежесть данных не определена';
  if (['UNAVAILABLE', 'NOT_OBSERVABLE', 'MISSING'].includes(key)) return 'Недостаточно данных для вывода';
  return 'Состояние обновления не определено';
}

export function humanizeCode(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '—';
  return text
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function asReadableText(value: unknown) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return text;
}
