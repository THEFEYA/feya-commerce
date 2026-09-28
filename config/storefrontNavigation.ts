export type StorefrontNavigationRole = 'owner' | 'support' | 'filter' | 'group' | 'hold';

export type StorefrontNavigationItem = {
  code: string;
  label: string;
  role: StorefrontNavigationRole;
  href?: string;
  enabled: boolean;
};

export type StorefrontNavigationGroup = {
  code: string;
  label: string;
  href?: string;
  description?: string;
  items: StorefrontNavigationItem[];
};

export type StorefrontNavigationPanel = {
  code: string;
  label: string;
  groups: StorefrontNavigationGroup[];
};

export const PRIMARY_NAVIGATION = [
  { code: 'shop', label: 'Shop', href: '/shop', panel: 'shop' },
  { code: 'events', label: 'Events', href: '/collections#events', panel: 'events' },
  { code: 'performance', label: 'Performance', href: '/collections#performance', panel: 'performance' },
  { code: 'style', label: 'Style', href: '/collections#style', panel: 'style' },
  { code: 'about', label: 'About', href: '/about' },
] as const;

export const STOREFRONT_NAVIGATION_PANELS: Record<string, StorefrontNavigationPanel> = {
  shop: {
    code: 'shop',
    label: 'Shop',
    groups: [
      {
        code: 'all',
        label: 'Shop',
        href: '/shop',
        description: 'Browse the complete catalog or start with a full look.',
        items: [
          { code: 'shop_all', label: 'Shop All', role: 'support', href: '/shop', enabled: true },
          { code: 'full_looks', label: 'Full Looks', role: 'filter', href: '/shop?piece=Full%20Look', enabled: true },
        ],
      },
      {
        code: 'full_body',
        label: 'Full Body',
        href: '/shop?part=Full%20Body',
        description: 'Complete garments that cover the full body.',
        items: [
          { code: 'bodysuits', label: 'Bodysuits', role: 'owner', href: '/collections/bodysuits', enabled: true },
        ],
      },
      {
        code: 'upper_body',
        label: 'Upper Body',
        href: '/shop?part=Upper%20Body',
        description: 'Tops, corsets and harness-led upper-body pieces.',
        items: [
          { code: 'tops', label: 'Tops', role: 'filter', href: '/shop?piece=Top', enabled: true },
          { code: 'corsets', label: 'Corsets', role: 'filter', href: '/shop?piece=Corset', enabled: true },
          { code: 'harnesses', label: 'Harnesses', role: 'filter', href: '/shop?piece=Harness', enabled: true },
        ],
      },
      {
        code: 'arms',
        label: 'Arms',
        href: '/shop?part=Arms',
        description: 'Shoulders, cuffs, bracelets and glove pieces.',
        items: [
          { code: 'shoulders', label: 'Shoulders', role: 'owner', href: '/collections/shoulder-armor', enabled: true },
          { code: 'bracelets_cuffs', label: 'Bracelets & Cuffs', role: 'filter', href: '/shop?piece=Bracelet%20%2F%20Cuff', enabled: true },
          { code: 'gloves', label: 'Gloves', role: 'filter', href: '/shop?piece=Glove', enabled: true },
        ],
      },
      {
        code: 'lower_body',
        label: 'Lower Body',
        href: '/shop?part=Lower%20Body',
        description: 'Skirts, belts and lower-body pieces.',
        items: [
          { code: 'skirts', label: 'Skirts', role: 'filter', href: '/shop?piece=Skirt', enabled: true },
          { code: 'belts', label: 'Belts', role: 'owner', href: '/collections/costume-belts', enabled: true },
          { code: 'bottoms', label: 'Bottoms', role: 'filter', href: '/shop?piece=Panties%20%2F%20Bottom', enabled: true },
        ],
      },
      {
        code: 'legs',
        label: 'Legs',
        href: '/shop?part=Legs',
        description: 'Leg covers and upper-leg accessories.',
        items: [
          { code: 'leg_covers', label: 'Leg Covers', role: 'filter', href: '/shop?piece=Leg%20Covers', enabled: true },
          { code: 'garters', label: 'Garters', role: 'filter', href: '/shop?piece=Garter', enabled: true },
        ],
      },
      {
        code: 'head_face',
        label: 'Head & Face',
        href: '/shop?part=Head%20%26%20Face',
        description: 'Masks, headpieces and neck pieces.',
        items: [
          { code: 'masks', label: 'Masks', role: 'owner', href: '/collections/costume-masks', enabled: true },
          { code: 'headpieces', label: 'Headpieces', role: 'owner', href: '/collections/costume-headpieces', enabled: true },
          { code: 'chokers', label: 'Chokers', role: 'filter', href: '/shop?piece=Choker%20%2F%20Collar', enabled: true },
        ],
      },
      {
        code: 'special',
        label: 'Special',
        href: '/shop?part=Special',
        description: 'Special structures that sit outside the usual body-area groups.',
        items: [
          { code: 'wings', label: 'Wings', role: 'filter', href: '/shop?piece=Wings', enabled: true },
          { code: 'tail', label: 'Tail', role: 'filter', href: '/shop?piece=Tail', enabled: true },
          { code: 'spine', label: 'Spine', role: 'filter', href: '/shop?piece=Spine', enabled: true },
        ],
      },
    ],
  },
  events: {
    code: 'events',
    label: 'Events',
    groups: [
      {
        code: 'festival',
        label: 'Festival',
        href: '/collections/festival-outfits',
        description: 'Festival is the broad entry; Rave and Burning Man remain distinct shopping paths.',
        items: [
          { code: 'rave', label: 'Rave', role: 'owner', href: '/collections/rave-outfits', enabled: true },
          { code: 'burning_man', label: 'Burning Man', role: 'owner', href: '/collections/burning-man-looks', enabled: true },
        ],
      },
      {
        code: 'other_events',
        label: 'Other Events',
        description: 'Browse event-led looks without creating a separate SEO page for every occasion.',
        items: [
          { code: 'halloween', label: 'Halloween', role: 'filter', href: '/shop?event=Halloween', enabled: true },
          { code: 'pride', label: 'Pride', role: 'filter', href: '/shop?event=Pride', enabled: true },
          { code: 'cosplay', label: 'Cosplay', role: 'filter', href: '/shop?event=Cosplay', enabled: true },
        ],
      },
    ],
  },
  performance: {
    code: 'performance',
    label: 'Performance',
    groups: [
      {
        code: 'performance_core',
        label: 'Performance',
        href: '/collections/stage-outfits',
        description: 'Artistic and stage-led looks where presentation is the main job.',
        items: [
          { code: 'stage', label: 'Stage', role: 'owner', href: '/collections/stage-outfits', enabled: true },
          { code: 'showgirl', label: 'Showgirl', role: 'filter', href: '/shop?performance=Showgirl', enabled: true },
          { code: 'drag', label: 'Drag', role: 'filter', href: '/shop?performance=Drag', enabled: true },
        ],
      },
      {
        code: 'dance',
        label: 'Dance',
        description: 'Movement-led paths for dance-specific browsing.',
        items: [
          { code: 'go_go', label: 'Go-Go', role: 'filter', href: '/shop?dance=Go-Go', enabled: true },
          { code: 'pole', label: 'Pole', role: 'filter', href: '/shop?dance=Pole', enabled: true },
        ],
      },
    ],
  },
  style: {
    code: 'style',
    label: 'Style',
    groups: [
      {
        code: 'styles',
        label: 'Styles',
        description: 'Visual directions used as shopper filters, not duplicate SEO landing owners.',
        items: [
          { code: 'cyberpunk', label: 'Cyberpunk', role: 'filter', href: '/shop?style=Cyberpunk', enabled: true },
          { code: 'futuristic', label: 'Futuristic', role: 'filter', href: '/shop?style=Futuristic', enabled: true },
          { code: 'sci_fi', label: 'Sci-Fi', role: 'filter', href: '/shop?style=Sci-Fi', enabled: true },
          { code: 'goth', label: 'Goth', role: 'filter', href: '/shop?style=Goth', enabled: true },
          { code: 'glam', label: 'Glam', role: 'filter', href: '/shop?style=Glam', enabled: true },
          { code: 'warrior', label: 'Warrior', role: 'filter', href: '/shop?style=Warrior', enabled: true },
          { code: 'goddess', label: 'Goddess', role: 'filter', href: '/shop?style=Goddess', enabled: true },
        ],
      },
    ],
  },
};

export function navigationPanel(code: string) {
  return STOREFRONT_NAVIGATION_PANELS[code] || null;
}

export function enabledNavigationGroups(code: string) {
  return navigationPanel(code)?.groups.filter((group) => group.items.some((item) => item.enabled) || Boolean(group.href)) || [];
}

export function panelHasEnabledItems(code: string) {
  return enabledNavigationGroups(code).length > 0;
}

export function publicPrimaryNavigation() {
  return PRIMARY_NAVIGATION.filter((item) => {
    if (!('panel' in item) || !item.panel) return true;
    return panelHasEnabledItems(String(item.panel));
  });
}
