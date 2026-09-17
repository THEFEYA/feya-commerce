/** Preserve the saved query and metrics; correct known search-query word order in copy only. */
export function naturalKeywordPhrase(keyword: string): string {
  const reviewed: Record<string, string> = {
    'burning man costumes for women': 'burning man costume for women',
    'harness top outfit': 'outfit with a harness top',
    'skirt and top set festival': 'festival skirt and top set',
    'dance costume red': 'red dance costume',
    'female stage outfits': 'stage outfit for women',
    'halloween costumes with red bodysuit': 'Halloween Costume with Red Bodysuit',
  };
  return reviewed[keyword.trim().toLowerCase()] || keyword;
}
