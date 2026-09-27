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
        code: 'shop_core',
        label: 'Shop',
        items: [
          { code: 'shop_all', label: 'Shop All', role: 'support', href: '/shop', enabled: true },
          { code: 'full_looks', label: 'Full Looks', role: 'filter', href: '/shop?piece=Full%20Look', enabled: true },
          { code: 'bodysuits', label: 'Bodysuits', role: 'owner', href: '/collections/bodysuits', enabled: true },
        ],
      },
      {
        code: 'shop_body',
        label: 'By Piece',
        items: [
          { code: 'upper_body', label: 'Upper Body', role: 'filter', href: '/shop?part=Upper%20Body', enabled: true },
          { code: 'arms', label: 'Arms', role: 'filter', href: '/shop?part=Arms', enabled: true },
          { code: 'shoulders', label: 'Shoulders', role: 'owner', href: '/collections/shoulder-armor', enabled: true },
          { code: 'lower_body', label: 'Lower Body', role: 'filter', href: '/shop?part=Lower%20Body', enabled: true },
          { code: 'legs', label: 'Legs', role: 'filter', href: '/shop?part=Legs', enabled: true },
          { code: 'head_face', label: 'Head & Face', role: 'filter', href: '/shop?part=Head%20%26%20Face', enabled: true },
          { code: 'masks', label: 'Masks', role: 'owner', href: '/collections/costume-masks', enabled: true },
          { code: 'headpieces', label: 'Headpieces', role: 'owner', href: '/collections/costume-headpieces', enabled: true },
          { code: 'belts', label: 'Belts', role: 'owner', href: '/collections/costume-belts', enabled: true },
        ],
      },
      {
        code: 'shop_special',
        label: 'Special Structures',
        items: [
          { code: 'wings', label: 'Wings', role: 'filter', href: '/shop?piece=Wings', enabled: true },
          { code: 'tail', label: 'Tail', role: 'filter', href: '/shop?piece=Tail', enabled: true },
          { code: 'spine', label: 'Spine', role: 'filter', href: '/shop?piece=Spine', enabled: true },
        ],
      },
      {
        code: 'shop_help',
        label: 'Help',
        items: [
          { code: 'size_guide', label: 'Size Guide', role: 'support', href: '/size-guide', enabled: true },
          { code: 'shipping', label: 'Shipping', role: 'support', href: '/shipping', enabled: true },
          { code: 'returns', label: 'Returns', role: 'support', href: '/returns', enabled: true },
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
        items: [
          { code: 'festival', label: 'Festival', role: 'owner', href: '/collections/festival-outfits', enabled: true },
          { code: 'rave', label: 'Rave', role: 'owner', href: '/collections/rave-outfits', enabled: true },
          { code: 'burning_man', label: 'Burning Man', role: 'owner', href: '/collections/burning-man-looks', enabled: true },
        ],
      },
      {
        code: 'events_other',
        label: 'Other Events',
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
        items: [
          { code: 'stage', label: 'Stage', role: 'owner', href: '/collections/stage-outfits', enabled: true },
          { code: 'showgirl', label: 'Showgirl', role: 'filter', href: '/shop?performance=Showgirl', enabled: true },
          { code: 'drag', label: 'Drag', role: 'filter', href: '/shop?performance=Drag', enabled: true },
        ],
      },
      {
        code: 'dance',
        label: 'Dance',
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
        code: 'style_core',
        label: 'Style',
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

export function enabledNavigationItems(group: StorefrontNavigationGroup) {
  return group.items.filter((item) => item.enabled);
}

export function navigationPanel(code: string) {
  return STOREFRONT_NAVIGATION_PANELS[code] || null;
}


export function panelHasEnabledItems(code: string) {
  const panel = navigationPanel(code);
  return Boolean(panel?.groups.some((group) => group.items.some((item) => item.enabled)));
}

export function publicPrimaryNavigation() {
  return PRIMARY_NAVIGATION.filter((item) => {
    if (!('panel' in item) || !item.panel) return true;
    return panelHasEnabledItems(String(item.panel));
  });
}
