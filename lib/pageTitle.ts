/**
 * The root layout applies the title template `%s | TheFEYA`. A page title that
 * already carries the brand (approved landing SEO titles such as
 * "Costume Belts & Statement Waist Pieces | TheFEYA", or "Contact TheFEYA")
 * must be rendered as-is, otherwise the browser/SERP title becomes
 * "… | TheFEYA | TheFEYA". Titles without the brand keep the template.
 */
export function brandAwareTitle(title: string): string | { absolute: string } {
  const value = title.trim();
  return /\bTheFEYA\s*$/.test(value) ? { absolute: value } : value;
}
