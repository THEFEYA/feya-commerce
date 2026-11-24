type ProductMetadataSource = {
  canonicalProductId: string;
  slug: string;
  contentHash: string;
};

// Each field-level release applies to the specific product snapshot the owner reviewed.
const reviewedTitles = [
  {
    canonicalProductId: '51487104-166f-45e0-a528-d8b27a6258d6',
    slug: 'festival-clothes-set-top-fringe-skirt-rave-party-wear-unique-festival-harness-golden-carnival-costume-accessories-1760981376',
    contentHash: '3af899937d46c0987cd58f0826beace729374132038eeb8de84ed1303c87994a',
    previousTitle: 'Gold Skirt And Top Set Festival',
    searchTitle: 'Gold Fringe Skirt and Matching Top',
  },
  {
    canonicalProductId: '596c5ec2-e59e-484f-8f73-89221f2b4171',
    slug: 'leather-punk-outfit-with-harness-set-choker-chest-harness-leg-garter-men-s-body-strap-leather-kinky-wear-sexy-fetish-costume-male-1858724751',
    contentHash: '8e3e9fba3fb5908b43b19b8c86ec2a1d97eac6a0b72a9b19080d118d79262430',
    previousTitle: 'Black Harness Outfit for Pride',
    searchTitle: "Men's Black Studded Chest Harness Set for Pride",
  },
];

export function reviewedProductSearchTitle(product: ProductMetadataSource, sourceTitle: string): string {
  const review = reviewedTitles.find((entry) =>
    entry.canonicalProductId === product.canonicalProductId &&
    entry.slug === product.slug &&
    entry.contentHash === product.contentHash &&
    entry.previousTitle === sourceTitle
  );
  return review?.searchTitle ?? sourceTitle;
}
