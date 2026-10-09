import { DELIVERY_COUNTRIES } from './commerceDeliveryWorkspace.ts';

/**
 * M2 candidate shipping countries from primary carrier-published references.
 * THIS IS NOT a current-live serviceability API, a rate quote, or permission
 * to take payment. Recheck carrier-specific method, goods, postcodes, transit
 * and actual upstream route before promoting any country to a payable list.
 *
 * Ukrposhta official destination list PDF dated 2025-11-10:
 * https://www.ukrposhta.ua/doc/shipping-outside-ukraine/perelik_krain_pryznachennia_mizhnarodnykh_vidpravlen_10112025.pdf
 *
 * Ukrposhta 22 temporarily suspended (article updated 2026-05-12):
 * https://e-export.ukrposhta.ua/spysok-krayin-v-yaki-ne-zdijsnyuyetsya-dostavka-stanom-na-15-08-2025/
 *
 * Nova Post Ukraine exports / Europe branch destinations, USA and Canada:
 * https://novaposhta.ua/send/international-delivery/how-to-send/
 * https://novaposhta.ua/international-send?from=ua&to=es
 *
 * The Nova Post worldwide-service PDF has additional country rows but is
 * NOT treated as a verified live API:
 * https://site-assets.novapost.com/ecf15e88-c596-49d9-9a67-b7fb994f2f09.pdf
 */
export const CARRIER_COUNTRY_CANDIDATES_CONTRACT = 'commerce_carrier_country_candidates_v1' as const;
export const CARRIER_COUNTRY_SOURCE_DATE = '2026-05-12' as const;
export const CARRIER_COUNTRY_SNAPSHOT_ID = 'owner_review_20261009_ukrposhta_novapost_reference' as const;

const UKRPOSHTA_COUNTRIES_2025 = (
// 6 official PDF pages; PDF uses UK for United Kingdom, normalized to GB.
  'AU AT AZ AL DZ AS VI AI AO AD AQ AG AR AW AF BS BD BB BH BZ BE BJ BM BG BO BA BW BR VG BN BF BI BT VN VU VA VE AM GA GY ' +
  'HT GM GH GP GT GN GW GI HN HK GD GL GR GE GU DK CD DJ IO DM DO EC GQ ER SZ EE ET EG YE ZM EH WS ZW IL IN ID IQ IR IE IS ES ' +
  'IT JO CV KZ KY KH CM CA QA KE KG CN CY KI CC CO KM CR CI CU KW CW LA LV LS LT LR LB LY LI LU MM MU MR MG YT MO MW MY ML ' +
  'MV MT MP MA MQ MH MX MZ MD MC MN MS NA NR NP NE NG NL NI DE NU NZ NC NO NF AE OM CK CX SH BQ TC PK PW PS PA PG PY PE SS ZA ' +
  'MK PN PL PT PR CG KR RE RW RO SV SM ST SA SC SN SX VC KN LC PM RS SG SY SK SI SB SO GB SD SR US SL TJ TH TW TZ TL TG TK TO ' +
  'TT TV TN TR TM UG HU UZ WF UY FO FM FJ PH FI FK FR GF PF HR CF TD CZ CL ME CH SE LK JM JP'
).trim().split(/\s+/);

const NOVA_POST_OUTBOUND_PUBLISHED = (
  'PL LT DE CZ RO SK LV EE HU MD IT FR AT GB ES NL FI US CA'
).split(' ');

/** Updated 12 May 2026, directly from Ukrposhta "no delivery" publication.
 * Deny list also applies to the provisional combined union unless a newer,
 * specifically verified lawful Nova Post route is formally reviewed. */
export const CARRIER_SUSPENDED_COUNTRIES_2026 = (
  'AF BS BY BF BI HT GY GN GQ YE IR KI KM MS NE PS SS RU SY SO SD TV'
).split(' ');
/** Explicit sanctions/operational exclusions independent of source-list age. */
export const OWNER_EXCLUDED_COUNTRIES = ['RU','BY','KP'] as const;
/** Unusual territory or non-commercial route: evidence needs actual postal/
 * postcode confirmation. Not an "all islands are remote" surcharge rule. */
export const CARRIER_MANUAL_REVIEW_TERRITORIES = (
  'AQ IO EH PN'
).split(' ');

export type CandidateCountryStatus =
  | 'prohibited_or_suspended'
  | 'carrier_reference_candidate'
  | 'special_route_review'
  | 'no_documented_route';
export type CandidateCarrier = 'ukrposhta' | 'nova_post';

const countries = new Set(DELIVERY_COUNTRIES);
const ukrposhta = new Set(UKRPOSHTA_COUNTRIES_2025);
const novaPost = new Set(NOVA_POST_OUTBOUND_PUBLISHED);
const blocked = new Set([...CARRIER_SUSPENDED_COUNTRIES_2026, ...OWNER_EXCLUDED_COUNTRIES]);
const manualReview = new Set(CARRIER_MANUAL_REVIEW_TERRITORIES);

export function referenceCountryAssessment(code: string): {
  country: string;
  status: CandidateCountryStatus;
  references: CandidateCarrier[];
  payable: false;
  standard_verified: false;
  express_verified: false;
} {
  const country = code.toUpperCase();
  const references: CandidateCarrier[] = [];
  if (ukrposhta.has(country)) references.push('ukrposhta');
  if (novaPost.has(country)) references.push('nova_post');
  const status: CandidateCountryStatus = blocked.has(country) ? 'prohibited_or_suspended'
    : !countries.has(country) || !references.length ? 'no_documented_route'
    : manualReview.has(country) ? 'special_route_review'
    : 'carrier_reference_candidate';
  return { country, status, references,
    payable: false, standard_verified: false, express_verified: false };
}

/** Immutable proposal for future versioned carrier coverage / owner review.
 * Never equate "in published general country list" to method-specific service.
 * A buyer checkout cannot use this reference alone. */
export function listCarrierReferenceCandidates(): string[] {
  return [...new Set([...ukrposhta, ...novaPost])]
    .filter(code => referenceCountryAssessment(code).status === 'carrier_reference_candidate')
    .sort();
}

export function describeCarrierCountryReference() {
  const candidateCountries = listCarrierReferenceCandidates();
  return {
    contract_version: CARRIER_COUNTRY_CANDIDATES_CONTRACT,
    snapshot_id: CARRIER_COUNTRY_SNAPSHOT_ID,
    newest_source_date: CARRIER_COUNTRY_SOURCE_DATE,
    candidate_countries: candidateCountries,
    candidate_count: candidateCountries.length,
    prohibited_or_suspended: [...blocked].sort(),
    special_route_review: [...manualReview].sort(),
    carrier_method_checked: false,
    buyer_payment_enabled: false,
    payable: false,
  } as const;
}
