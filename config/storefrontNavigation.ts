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
          { code: 'full_looks', label: 'Full Looks', role: 'filter', enabled: false },
          { code: 'bodysuits', label: 'Bodysuits', role: 'owner', href: '/collections/bodysuits', enabled: true },
        ],
      },
      {
        code: 'shop_body',
        label: 'By Piece',
        items: [
          { code: 'upper_body', label: 'Upper Body', role: 'filter', enabled: false },
          { code: 'arms', label: 'Arms', role: 'group', enabled: true },
          { code: 'shoulders', label: 'Shoulders', role: 'owner', href: '/collections/shoulder-armor', enabled: true },
          { code: 'lower_body', label: 'Lower Body', role: 'filter', enabled: false },
          { code: 'legs', label: 'Legs', role: 'filter', enabled: false },
          { code: 'head_face', label: 'Head & Face', role: 'group', enabled: true },
          { code: 'masks', label: 'Masks', role: 'owner', href: '/collections/costume-masks', enabled: true },
          { code: 'headpieces', label: 'Headpieces', role: 'owner', href: '/collections/costume-headpieces', enabled: true },
          { code: 'belts', label: 'Belts', role: 'owner', href: '/collections/costume-belts', enabled: true },
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
          { code: 'halloween', label: 'Halloween', role: 'hold', enabled: false },
          { code: 'pride', label: 'Pride', role: 'hold', enabled: false },
          { code: 'cosplay', label: 'Cosplay', role: 'hold', enabled: false },
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
          { code: 'showgirl', label: 'Showgirl', role: 'hold', enabled: false },
          { code: 'drag', label: 'Drag', role: 'hold', enabled: false },
        ],
      },
      {
        code: 'dance',
        label: 'Dance',
        items: [
          { code: 'go_go', label: 'Go-Go', role: 'hold', enabled: false },
          { code: 'pole', label: 'Pole', role: 'hold', enabled: false },
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
          { code: 'cyberpunk', label: 'Cyberpunk', role: 'hold', enabled: false },
          { code: 'futuristic', label: 'Futuristic', role: 'hold', enabled: false },
          { code: 'sci_fi', label: 'Sci-Fi', role: 'hold', enabled: false },
          { code: 'goth', label: 'Goth', role: 'hold', enabled: false },
          { code: 'glam', label: 'Glam', role: 'hold', enabled: false },
          { code: 'warrior', label: 'Warrior', role: 'hold', enabled: false },
          { code: 'goddess', label: 'Goddess', role: 'hold', enabled: false },
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
