type ProductMetadataSource = {
  canonicalProductId: string;
  slug: string;
  contentHash: string;
};

// This field-only release is bound to the currently approved product snapshot.
const goldFringeSet = {
  canonicalProductId: '51487104-166f-45e0-a528-d8b27a6258d6',
  slug: 'festival-clothes-set-top-fringe-skirt-rave-party-wear-unique-festival-harness-golden-carnival-costume-accessories-1760981376',
  contentHash: '3af899937d46c0987cd58f0826beace729374132038eeb8de84ed1303c87994a',
  previousTitle: 'Gold Skirt And Top Set Festival',
  searchTitle: 'Gold Fringe Skirt and Matching Top',
};

export function reviewedProductSearchTitle(product: ProductMetadataSource, sourceTitle: string): string {
  if (
    product.canonicalProductId === goldFringeSet.canonicalProductId &&
    product.slug === goldFringeSet.slug &&
    product.contentHash === goldFringeSet.contentHash &&
    sourceTitle === goldFringeSet.previousTitle
  ) {
    return goldFringeSet.searchTitle;
  }

  return sourceTitle;
}
