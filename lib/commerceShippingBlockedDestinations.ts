/** TheFEYA checkout global blocked-export destination list.
 * Official Ukrposhta temporary no-delivery update: 2026-05-12.
 * https://e-export.ukrposhta.ua/spysok-krayin-v-yaki-ne-zdijsnyuyetsya-dostavka-stanom-na-15-08-2025/
 * RU/BY are also explicitly banned by the owner. KP is an additional owner
 * no-service decision, not represented as an Ukrposhta source statement.
 *
 * Old draft records may retain a blocked code for audit; they must NEVER
 * pass preview / approved quote / release-readiness to paid checkout.
 */
export const FEYA_BLOCKED_EXPORT_COUNTRY_CODES = [
  'AF','BS','BY','BF','BI','HT','GY','GN','GQ','YE','IR','KI','KM','MS',
  'NE','PS','SS','RU','SY','SO','SD','TV','KP',
] as const;

const hardBlocked = new Set<string>(FEYA_BLOCKED_EXPORT_COUNTRY_CODES);
export function isFeyaBlockedExportDestination(country: string): boolean {
  return hardBlocked.has(country.toUpperCase());
}
