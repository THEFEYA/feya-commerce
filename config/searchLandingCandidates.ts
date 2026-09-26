export type SearchLandingCandidate = {
  code:
    | 'TYPE-HARNESS'
    | 'TYPE-ARMOR'
    | 'TYPE-BODYSUIT'
    | 'TYPE-OUTFIT'
    | 'EVENT-FESTIVAL'
    | 'EVENT-BM'
    | 'OCCASION-STAGE';
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  intent: string;
  matchTerms: string[];
  searchStatus: 'candidate_noindex';
};

export const SEARCH_LANDING_CANDIDATES: SearchLandingCandidate[] = [
  {
    code: 'TYPE-HARNESS',
    slug: 'harness',
    title: 'Fashion Harnesses',
    eyebrow: 'Collection candidate · Product type',
    description: 'Wearable body, chest and festival harness pieces by TheFEYA, including strap-based stage styling and complete harness looks.',
    intent: 'Select wearable fashion/body harnesses; exclude safety, climbing and pet equipment.',
    matchTerms: ['harness', 'garter', 'belt', 'choker', 'strap'],
    searchStatus: 'candidate_noindex',
  },
  {
    code: 'TYPE-ARMOR',
    slug: 'shoulder-armor',
    title: 'Shoulder Armor',
    eyebrow: 'Collection candidate · Product type',
    description: 'Decorative shoulder armor and sculptural shoulder pieces created for stage, festival, performance and editorial styling.',
    intent: 'Select decorative shoulder armor; exclude protective or historical equipment.',
    matchTerms: ['shoulder armor', 'shoulders', 'shoulder'],
    searchStatus: 'candidate_noindex',
  },
  {
    code: 'TYPE-BODYSUIT',
    slug: 'bodysuits',
    title: 'Costume Bodysuits',
    eyebrow: 'Collection candidate · Product type',
    description: 'TheFEYA bodysuits and body-based costume looks for performance, rave, festival and stage styling.',
    intent: 'Select complete costume bodysuits; exclude base garments that are only styling props.',
    matchTerms: ['bodysuit', 'body suit', 'catsuit', 'jumpsuit'],
    searchStatus: 'candidate_noindex',
  },
  {
    code: 'TYPE-OUTFIT',
    slug: 'outfits',
    title: 'Statement Costume Outfits',
    eyebrow: 'Collection candidate · Product family',
    description: 'Complete and coordinated TheFEYA costume looks, including top-and-skirt sets, armor-inspired outfits and paired statement pieces.',
    intent: 'Choose a purchasable complete outfit or coordinated set without creating separate pages for every color or wording variation.',
    matchTerms: ['outfit', 'costume set', 'full set', 'top and skirt', 'top & skirt', 'skirt and top'],
    searchStatus: 'candidate_noindex',
  },
  {
    code: 'EVENT-FESTIVAL',
    slug: 'festival-outfits',
    title: 'Festival Outfits',
    eyebrow: 'Collection candidate · Event',
    description: 'Handmade statement outfits and accessories for festival and rave styling, built from TheFEYA’s existing stage-ready designs.',
    intent: 'Choose festival clothing; final ownership must remain distinct from generic Shop and any broader complete-outfit hub.',
    matchTerms: ['festival', 'rave'],
    searchStatus: 'candidate_noindex',
  },
  {
    code: 'EVENT-BM',
    slug: 'burning-man-looks',
    title: 'Burning Man Looks',
    eyebrow: 'Collection candidate · Event',
    description: 'TheFEYA statement pieces and costume looks selected for Burning Man and desert styling.',
    intent: 'Choose a Burning Man look without implying weather, safety or event-affiliation guarantees.',
    matchTerms: ['burning man', 'desert'],
    searchStatus: 'candidate_noindex',
  },
  {
    code: 'OCCASION-STAGE',
    slug: 'stage-outfits',
    title: 'Stage & Performance Outfits',
    eyebrow: 'Collection candidate · Occasion',
    description: 'Stagewear and performance costume pieces for dancers, DJs, drag performers, show productions and visual performances.',
    intent: 'Choose performance clothing with a distinct shopping task from generic outfits.',
    matchTerms: ['stage', 'performance', 'dance', 'showgirl', 'show costume', 'dj'],
    searchStatus: 'candidate_noindex',
  },
];

export function getSearchLandingCandidate(slug: string) {
  return SEARCH_LANDING_CANDIDATES.find((candidate) => candidate.slug === slug) || null;
}

function normalize(value: unknown) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function candidateMatchesProduct(
  candidate: SearchLandingCandidate,
  product: Record<string, unknown>,
) {
  const haystack = normalize([
    product.card_title,
    product.h1,
    product.seo_title,
    product.meta_description,
    product.product_type,
    product.material,
    product.color,
    product.category_label,
    product.world_label,
  ].filter(Boolean).join(' '));

  return candidate.matchTerms.some((term) => haystack.includes(normalize(term)));
}
