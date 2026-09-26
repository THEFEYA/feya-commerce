export type SearchLandingStatus = 'business_case_noindex' | 'hold_noindex';

export type SearchLandingCandidate = {
  code:
    | 'SHOULDER_ARMOR'
    | 'FESTIVAL_OUTFITS'
    | 'RAVE_OUTFITS'
    | 'BURNING_MAN_OUTFITS'
    | 'PERFORMANCE_COSTUMES'
    | 'COSTUME_BODYSUITS'
    | 'COSTUME_MASKS'
    | 'COSTUME_HEADPIECES'
    | 'FESTIVAL_SKIRTS'
    | 'COSTUME_BELTS'
    | 'FASHION_HARNESS_HOLD'
    | 'GENERIC_OUTFITS_HOLD';
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  intent: string;
  searchStatus: SearchLandingStatus;
  primaryCluster: string | null;
  holdReason?: string;
};

export const SEARCH_LANDING_CANDIDATES: SearchLandingCandidate[] = [
  {
    code: 'SHOULDER_ARMOR',
    slug: 'shoulder-armor',
    title: 'Shoulder Armor',
    eyebrow: 'Collection business case · Product type',
    description: 'Decorative sculptural shoulder pieces for costume, stage, cosplay and festival styling. This page never represents protective or tactical armor.',
    intent: 'Shop decorative shoulder armor without protective, tactical or historical-equipment claims.',
    searchStatus: 'business_case_noindex',
    primaryCluster: 'QC_US_EN_SHOULDER_ARMOR',
  },
  {
    code: 'FESTIVAL_OUTFITS',
    slug: 'festival-outfits',
    title: 'Festival Outfits',
    eyebrow: 'Collection business case · Event',
    description: 'A cross-category selection of current TheFEYA pieces whose approved Product DNA includes festival use.',
    intent: 'Shop festival outfits through a dedicated commercial event collection.',
    searchStatus: 'business_case_noindex',
    primaryCluster: 'QC_US_EN_FESTIVAL_OUTFITS',
  },
  {
    code: 'RAVE_OUTFITS',
    slug: 'rave-outfits',
    title: 'Rave Outfits',
    eyebrow: 'Collection business case · Event',
    description: 'TheFEYA pieces selected from approved Product DNA for rave and EDM-oriented styling.',
    intent: 'Shop rave outfits without collapsing the distinct rave intent into the broader festival owner.',
    searchStatus: 'business_case_noindex',
    primaryCluster: 'QC_US_EN_RAVE_OUTFITS',
  },
  {
    code: 'BURNING_MAN_OUTFITS',
    slug: 'burning-man-looks',
    title: 'Burning Man Looks',
    eyebrow: 'Collection business case · Event',
    description: 'TheFEYA pieces whose approved Product DNA includes Burning Man, presented without event-affiliation, weather or safety guarantees.',
    intent: 'Shop Burning Man outfits and costume looks through one commercial event owner.',
    searchStatus: 'business_case_noindex',
    primaryCluster: 'QC_US_EN_BURNING_MAN_OUTFITS',
  },
  {
    code: 'PERFORMANCE_COSTUMES',
    slug: 'stage-outfits',
    title: 'Stage & Performance Costumes',
    eyebrow: 'Collection business case · Performance',
    description: 'Current TheFEYA pieces selected for stage and performance use. Broad recital and generic dance-costume markets are not assumed to belong here.',
    intent: 'Shop visual performance costumes for performers while keeping broader dance and mixed stage queries separate until proven.',
    searchStatus: 'business_case_noindex',
    primaryCluster: 'QC_US_EN_PERFORMANCE_COSTUMES',
  },
  {
    code: 'COSTUME_BODYSUITS',
    slug: 'bodysuits',
    title: 'Costume Bodysuits',
    eyebrow: 'Collection business case · Product type',
    description: 'Complete TheFEYA bodysuit designs selected from confirmed sellable bodysuit axes.',
    intent: 'Shop costume bodysuits as a product-type collection.',
    searchStatus: 'business_case_noindex',
    primaryCluster: 'QC_US_EN_COSTUME_BODYSUIT',
  },
  {
    code: 'COSTUME_MASKS',
    slug: 'costume-masks',
    title: 'Costume Masks',
    eyebrow: 'Collection business case · Product type',
    description: 'Decorative TheFEYA masks from confirmed sellable mask axes, excluding safety equipment and unrelated licensed-character intent.',
    intent: 'Shop decorative costume masks.',
    searchStatus: 'business_case_noindex',
    primaryCluster: 'QC_US_EN_COSTUME_MASKS',
  },
  {
    code: 'COSTUME_HEADPIECES',
    slug: 'costume-headpieces',
    title: 'Costume Headpieces',
    eyebrow: 'Collection business case · Product type',
    description: 'Sculptural TheFEYA headpieces selected from confirmed sellable headpiece axes.',
    intent: 'Shop costume headpieces; DIY and tutorial intent remains excluded.',
    searchStatus: 'business_case_noindex',
    primaryCluster: 'QC_US_EN_COSTUME_HEADPIECE',
  },
  {
    code: 'FESTIVAL_SKIRTS',
    slug: 'festival-skirts',
    title: 'Festival Skirts',
    eyebrow: 'Collection business case · Event × Product type',
    description: 'Festival-matched TheFEYA products with a confirmed sellable skirt axis.',
    intent: 'Shop festival skirts as a commercial intersection distinct from generic costume-skirt intent.',
    searchStatus: 'business_case_noindex',
    primaryCluster: 'QC_US_EN_FESTIVAL_SKIRT',
  },
  {
    code: 'COSTUME_BELTS',
    slug: 'costume-belts',
    title: 'Costume Belts',
    eyebrow: 'Collection business case · Product type',
    description: 'Decorative TheFEYA waist and belt pieces selected from confirmed sellable belt axes.',
    intent: 'Shop decorative costume belts while excluding utility, weapon and everyday-belt intent.',
    searchStatus: 'business_case_noindex',
    primaryCluster: 'QC_US_EN_COSTUME_BELT',
  },
  {
    code: 'FASHION_HARNESS_HOLD',
    slug: 'harness',
    title: 'Fashion Harnesses',
    eyebrow: 'Collection hold · Filter only',
    description: 'Harness remains a useful shopping refinement, but the current US search results do not support a dedicated indexable collection.',
    intent: 'Use harness as a non-indexable merchandising/filter axis until fresh evidence changes the decision.',
    searchStatus: 'hold_noindex',
    primaryCluster: 'QC_US_EN_FASHION_HARNESS',
    holdReason: 'COMMERCIAL_SERP_GATE_FAILED',
  },
  {
    code: 'GENERIC_OUTFITS_HOLD',
    slug: 'outfits',
    title: 'Statement Costume Outfits',
    eyebrow: 'Collection hold · No generic owner',
    description: 'The generic outfits prototype is retained only as a noindex preview. Event and product-type owners now carry the evidence-backed shopping intents.',
    intent: 'Do not create a generic costume/outfits owner without a distinct query cluster and commercial SERP proof.',
    searchStatus: 'hold_noindex',
    primaryCluster: null,
    holdReason: 'NO_DISTINCT_APPROVED_QUERY_OWNER',
  },
];

export function getSearchLandingCandidate(slug: string) {
  return SEARCH_LANDING_CANDIDATES.find((candidate) => candidate.slug === slug) || null;
}

export function getBusinessCaseLandingCandidates() {
  return SEARCH_LANDING_CANDIDATES.filter((candidate) => candidate.searchStatus === 'business_case_noindex');
}
