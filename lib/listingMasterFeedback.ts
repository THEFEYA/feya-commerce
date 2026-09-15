type ProgressInput = {
  hasProduct: boolean;
  decisionIsCurrent: boolean;
  statusCode: string;
  searchApplied?: boolean;
};

export function listingMasterFeedback(input: ProgressInput) {
  if (!input.hasProduct) return {
    tone: 'warning', title: 'Выберите товар',
    message: 'Затем проверьте оси и сохраните подбор ключевых слов.',
  };
  if (input.statusCode === 'ready' && input.decisionIsCurrent) return {
    tone: 'success', title: 'Оси и ключевые слова сохранены',
    message: 'Сохранение подтверждено. Повторять выбор не нужно. Следующий шаг — подготовить текст и проверить Preview.',
  };
  if (input.statusCode === 'blocked_product_truth') return {
    tone: 'warning', title: 'Нужно уточнить состав товара',
    message: 'Оси можно сохранить. Перед генерацией нужно подтвердить продаваемый состав; выбор осей сам по себе его не меняет.',
  };
  if (input.statusCode === 'needs_keyword_review' || input.statusCode === 'no_keywords') return {
    tone: 'warning', title: 'Нужно проверить подбор ключей',
    message: 'Не найден подходящий Primary для всего товара. Оси можно сохранить; текст подготовим после проверки ключей.',
  };
  return {
    tone: 'warning',
    title: input.searchApplied ? 'Поиск применён — изменения ещё не сохранены' : 'Проверьте и сохраните оси',
    message: 'Проверьте подобранные слова и нажмите «Сохранить SEO-решение». Это зафиксирует выбранные оси и роли ключевых слов.',
  };
}
