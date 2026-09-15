/** Preserve the saved query and metrics; correct known search-query word order in copy only. */
export function naturalKeywordPhrase(keyword: string): string {
  return keyword.trim().toLowerCase() === 'skirt and top set festival'
    ? 'festival skirt and top set'
    : keyword;
}
