export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  try {
    return new URL(configured || 'https://zofeya.com');
  } catch {
    return new URL('https://zofeya.com');
  }
}

export function isSearchIndexingEnabled() {
  return process.env.FEYA_SEARCH_INDEXING_ENABLED === 'true';
}

export function isStructuredDataEnabled() {
  return process.env.FEYA_STRUCTURED_DATA_ENABLED === 'true';
}

export function absoluteSiteUrl(path = '/') {
  return new URL(path, getSiteUrl()).toString();
}
