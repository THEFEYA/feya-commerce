export function isImageOnlySeoBucket(value: unknown) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return ['alt', 'image', 'image alt', 'image seo', 'visual search'].includes(normalized);
}
