export function adminReadinessLabel(value: unknown) {
  const key = String(value || '').trim();
  const map: Record<string, string> = {
    Draft: 'Черновик',
    'Needs Label Review': 'Проверить название',
    'Needs Price Review': 'Проверить цену',
    'Needs Component Mapping': 'Проверить компоненты',
    'Needs Media QA': 'Проверить медиа',
    'SEO Ready': 'SEO готово к финальной проверке',
    'Ready for Storefront': 'Готово для витрины',
    Blocked: 'Заблокировано',
  };
  return map[key] || key || 'Не определено';
}

export function launchStageLabel(value: unknown) {
  const key = String(value || '').trim();
  const map: Record<string, string> = {
    Blocked: 'Заблокировано',
    'Needs Review': 'Нужна проверка',
    'Can Prepare SEO': 'Можно готовить SEO',
    'Can Prepare Feed': 'Можно готовить фид',
    'Ready for Future Payment': 'Готово к будущему подключению оплаты',
    'Ready for Preview': 'Готово к предпросмотру',
    'Ready for Search': 'Готово к поиску',
  };
  return map[key] || key || 'Не определено';
}

export function contentStageLabel(value: unknown) {
  const key = String(value || '').trim();
  const map: Record<string, string> = {
    Blocked: 'Заблокировано',
    'Data Not Ready': 'Данные не готовы',
    'Needs Content Inputs': 'Не хватает данных для контента',
    'Can Draft Content': 'Можно готовить черновик',
    'Can Review Content': 'Можно проверять контент',
  };
  return map[key] || key || 'Не определено';
}

export function collectionStageLabel(value: unknown) {
  const key = String(value || '').trim();
  const map: Record<string, string> = {
    Blocked: 'Заблокировано',
    'Needs More Products': 'Нужно больше товаров',
    'High Priority': 'Высокий приоритет',
    'Can Prepare Feed': 'Можно готовить фид',
  };
  return map[key] || key || 'Не определено';
}

export function seoReadinessLabel(value: unknown) {
  const key = String(value || '').trim();
  const map: Record<string, string> = {
    Ready: 'Готово',
    'Needs polish': 'Нужно доработать',
    Blocked: 'Заблокировано',
  };
  return map[key] || key || 'Не определено';
}

export function seoIssueLabel(value: unknown) {
  const key = String(value || '').trim();
  const map: Record<string, string> = {
    'Weak slug': 'Слабый адрес страницы',
    'Thin title/H1': 'Слишком короткий заголовок / H1',
    'Long title': 'Слишком длинный заголовок',
    'Missing primary image': 'Нет главного изображения',
    'Missing image alt': 'Нет ALT-текста изображения',
    'Missing category signal': 'Не определена категория',
    'Missing color signal': 'Не определён цвет',
    'Weak world/context': 'Слабый контекст товара',
    'No configurations': 'Нет вариантов товара',
    'Unverified price': 'Цена не подтверждена',
    'Label review blocks SEO': 'Название блокирует SEO',
  };
  return map[key] || key || 'Не определено';
}

export function competitionLabel(value: unknown) {
  const key = String(value || '').trim().toUpperCase();
  if (key === 'LOW') return 'Низкая';
  if (key === 'MEDIUM') return 'Средняя';
  if (key === 'HIGH') return 'Высокая';
  return String(value || '—');
}


export function searchStageLabel(value: unknown) {
  const key = String(value || '').trim();
  const map: Record<string, string> = {
    Blocked: 'Заблокировано',
    'Needs SEO Review': 'Нужна проверка SEO',
    'Needs Media': 'Нужно подготовить медиа',
    'Ready for Preview': 'Готово к предпросмотру',
    'Ready for Search': 'Готово к поиску',
  };
  return map[key] || key || 'Не определено';
}

export function mediaSeoStageLabel(value: unknown) {
  const key = String(value || '').trim();
  const map: Record<string, string> = {
    Blocked: 'Заблокировано',
    'Needs Alt Text': 'Нужен ALT-текст',
    'Needs Filename': 'Нужно имя файла',
    'Needs Export': 'Нужен экспорт',
    'Ready for Image Sitemap': 'Готово для sitemap изображений',
  };
  return map[key] || key || 'Не определено';
}

export function mediaSeoNoteLabel(value: unknown) {
  const key = String(value || '').trim();
  const map: Record<string, string> = {
    'Missing primary image.': 'Нет главного изображения.',
    'Alt text needs product-specific rewrite.': 'ALT-текст нужно сделать конкретным для товара.',
    'Use short descriptive SEO filename on export.': 'При экспорте нужно короткое описательное SEO-имя файла.',
    'Normalize export format for web usage.': 'Нужно привести формат файла к веб-формату.',
    'Run FEYA media export before image sitemap and Pinterest export.': 'Перед sitemap изображений и Pinterest нужно выполнить экспорт медиа FEYA.',
    'Resize or convert image for web performance.': 'Изображение нужно уменьшить или преобразовать для быстрой загрузки сайта.',
  };
  return map[key] || key;
}
