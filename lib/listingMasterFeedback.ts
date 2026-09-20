type ProgressInput = {
  hasProduct: boolean;
  decisionIsCurrent: boolean;
  statusCode: string;
  searchApplied?: boolean;
  axesSaved?: boolean;
};

/** Persistence of the owner's choices is independent of keyword readiness. */
export function listingMasterSavedAxesMatch(saved: Record<string, any> | null, active: Record<string, any>) {
  if (!saved || saved.selection_verified !== true) return false;
  const list = (value: unknown) => [...new Set((Array.isArray(value) ? value : [value])
    .flatMap(item => String(item || '').split(','))
    .map(item => item.trim().toLowerCase()).filter(Boolean))].sort();
  const signature = (focus: Record<string, any>) => JSON.stringify({
    ...Object.fromEntries(['component', 'material', 'event', 'style', 'persona', 'audience', 'exclude']
      .map(key => [key, list(focus[key])])),
    strategies: list(focus.strategies || focus.strategy),
    q: String(focus.q || '').trim().toLowerCase().replace(/\s+/g, ' '),
    keyword_type: focus.keyword_type || focus.type || 'all',
  });
  return signature(saved) === signature(active);
}

export function listingMasterFeedback(input: ProgressInput) {
  if (input.statusCode === 'data_unavailable') return {
    tone: 'warning', title: 'Проверка временно недоступна',
    message: 'Не удалось перечитать данные. Это не означает, что сохранение потеряно. Обновите страницу; заново выбирать оси не нужно.',
  };
  if (!input.hasProduct) return {
    tone: 'warning', title: 'Выберите товар',
    message: 'Затем проверьте оси и сохраните подбор ключевых слов.',
  };
  if (input.statusCode === 'ready' && input.decisionIsCurrent) return {
    tone: 'success', title: 'Оси и ключевые слова сохранены',
    message: 'Сохранение подтверждено. Повторять выбор не нужно. Следующий шаг — подготовить текст и проверить Preview.',
  };
  if (input.statusCode === 'blocked_product_truth') return {
    tone: 'warning', title: input.axesSaved ? 'Оси сохранены — нужно уточнить состав товара' : 'Нужно уточнить состав товара',
    message: input.axesSaved
      ? 'Ваш выбор сохранён. Повторять оси не нужно. Перед подготовкой текста проверим состав и названия вариантов покупки.'
      : 'Оси можно сохранить. Перед генерацией нужно подтвердить продаваемый состав; выбор осей сам по себе его не меняет.',
  };
  if (input.statusCode === 'needs_keyword_review' || input.statusCode === 'no_keywords') return {
    tone: 'warning', title: input.axesSaved ? 'Оси сохранены — нужно проверить Primary' : 'Нужно проверить подбор ключей',
    message: input.axesSaved
      ? 'Ваш выбор сохранён. Повторять оси не нужно. Подбор ещё не содержит подходящего Primary для всего товара; это проверим перед подготовкой текста.'
      : 'Не найден подходящий Primary для всего товара. Оси можно сохранить; текст подготовим после проверки ключей.',
  };
  return {
    tone: 'warning',
    title: input.searchApplied ? 'Поиск применён — изменения ещё не сохранены' : 'Проверьте и сохраните оси',
    message: 'Проверьте подобранные слова и нажмите «Сохранить SEO-решение». Это зафиксирует выбранные оси и роли ключевых слов.',
  };
}
