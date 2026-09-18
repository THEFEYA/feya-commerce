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

const SIGNAL_COPY: Record<string, { title: string; summary: string; action: string }> = {
  LAUNCH_PUBLIC_SITE_RETURN_POLICY_CANON: {
    title: 'Подтвердить правила возврата',
    summary: 'Для сайта пока нет подтверждённого текста правил возврата.',
    action: 'Подтвердить актуальные правила возврата перед публикацией.',
  },
  LAUNCH_COMMERCE_RETURN_POLICY_CANON: {
    title: 'Подтвердить правила возврата для продаж',
    summary: 'Правила возврата пока не подтверждены для будущего оформления заказа.',
    action: 'Подтвердить актуальные правила возврата до запуска продаж.',
  },
  LAUNCH_COMMERCE_COMMERCE_CHECKOUT: {
    title: 'Определиться с оформлением заказа',
    summary: 'В приложении пока нет реального оформления заказа и оплаты.',
    action: 'До появления реальной оплаты не включать аналитику покупок и возвратов.',
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

export function scopeLabel(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  return SCOPE_LABELS[key] || humanizeCode(key || '—');
}

export function priorityLabel(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  return PRIORITY_LABELS[key] || 'Обычный приоритет';
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
  if (['STALE'].includes(key)) return 'Данные устарели';
  if (['UNAVAILABLE', 'NOT_OBSERVABLE', 'MISSING'].includes(key)) return 'Недостаточно данных для вывода';
  return statusLabel(key);
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
