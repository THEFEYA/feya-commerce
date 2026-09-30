export type StorefrontNavigationRole = 'owner' | 'support' | 'filter' | 'group' | 'hold';

export type StorefrontNavigationItem = {
  code: string;
  label: string;
  role: StorefrontNavigationRole;
  href?: string;
  enabled: boolean;
  children?: StorefrontNavigationItem[];
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

const filter = (code:string,label:string,href:string,children?:StorefrontNavigationItem[]):StorefrontNavigationItem => ({
  code,label,href,role:'filter',enabled:true,children,
});

const owner = (code:string,label:string,href:string,children?:StorefrontNavigationItem[]):StorefrontNavigationItem => ({
  code,label,href,role:'owner',enabled:true,children,
});

export const PRIMARY_NAVIGATION = [
  { code: 'shop', label: 'Shop', href: '/shop', panel: 'shop' },
  { code: 'events_performance', label: 'Events & Performance', href: '/events-performance', panel: 'events_performance' },
  { code: 'style', label: 'Style', href: '/style', panel: 'style' },
  { code: 'about', label: 'About', href: '/about' },
  { code: 'shipping_payment', label: 'Shipping & Payment', href: '/shipping' },
  { code: 'contact', label: 'Contact', href: '/contact' },
] as const;

export const STOREFRONT_NAVIGATION_PANELS: Record<string, StorefrontNavigationPanel> = {
  shop: {
    code: 'shop',
    label: 'Shop',
    groups: [
      {
        code: 'shop_all',
        label: 'Shop',
        href: '/shop',
        description: 'Browse the complete catalog or start with a coordinated look.',
        items: [
          { code:'shop_all', label:'Shop All', href:'/shop', role:'support', enabled:true },
          filter('full_looks','Full Looks','/shop?piece=Full%20Look'),
          { code:'sale', label:'Sale', role:'hold', enabled:true },
          { code:'new_arrivals', label:'New Arrivals', role:'hold', enabled:true },
          { code:'best_sellers', label:'Best Sellers', role:'hold', enabled:true },
        ],
      },
      {
        code: 'shop_for',
        label: 'Shop For',
        description: 'Audience and paired-look browsing stays separate from Product Type and Search Ownership.',
        items: [
          filter('women','Women','/shop?audience=Women'),
          filter('men','Men','/shop?audience=Men'),
          { code:'unisex', label:'Unisex', role:'hold', enabled:true },
          filter('couples','Couples','/shop?audience=Couples'),
        ],
      },
      {
        code: 'full_body',
        label: 'Full Body',
        href: '/shop?part=Full%20Body',
        description: 'Complete garments.',
        items: [
          owner('bodysuits','Bodysuits','/collections/bodysuits'),
          { code:'dresses', label:'Dresses', role:'hold', enabled:true },
          { code:'full_body_harnesses', label:'Full Body Harnesses', role:'hold', enabled:true },
        ],
      },
      {
        code: 'upper_body',
        label: 'Upper Body',
        href: '/shop?part=Upper%20Body',
        description: 'Tops, bra tops, corsets and harness-led pieces.',
        items: [
          filter('tops_bras','Tops & Bras','/shop?piece=Tops%20%26%20Bras'),
          filter('corsets','Corsets','/shop?piece=Corset'),
          filter('harnesses','Harnesses','/shop?piece=Harness'),
        ],
      },
      {
        code: 'arms',
        label: 'Arms',
        href: '/shop?part=Arms',
        description: 'Arm-region pieces are grouped once; search aliases do not create duplicate categories.',
        items: [
          owner('shoulders','Shoulders','/collections/shoulder-armor'),
          filter('bracelets_cuffs','Bracelets & Cuffs','/shop?piece=Bracelet%20%2F%20Cuff'),
          filter('gloves','Gloves','/shop?piece=Glove'),
          { code:'full_arms', label:'Full Arms', role:'hold', enabled:true },
        ],
      },
      {
        code: 'lower_body',
        label: 'Lower Body',
        href: '/shop?part=Lower%20Body',
        description: 'Skirts, belts and bottoms.',
        items: [
          filter('skirts','Skirts','/shop?piece=Skirt'),
          owner('belts','Belts','/collections/costume-belts'),
          filter('bottoms','Bottoms','/shop?piece=Panties%20%2F%20Bottom'),
        ],
      },
      {
        code: 'head_face',
        label: 'Head & Face',
        href: '/shop?part=Head%20%26%20Face',
        description: 'Masks, headpieces and neck pieces.',
        items: [
          owner('masks','Masks','/collections/costume-masks'),
          owner('headpieces','Headpieces','/collections/costume-headpieces'),
          filter('horns','Horns','/shop?piece=Horns'),
          filter('crowns','Crowns','/shop?piece=Crown'),
          filter('chokers','Chokers','/shop?piece=Choker%20%2F%20Collar'),
        ],
      },
      {
        code: 'legs',
        label: 'Legs',
        href: '/shop?part=Legs',
        description: 'Leg covers and upper-leg accessories.',
        items: [
          filter('leg_covers','Leg Covers','/shop?piece=Leg%20Covers'),
          filter('garters','Garters','/shop?piece=Garter'),
          { code:'full_legs', label:'Full Legs', role:'hold', enabled:true },
        ],
      },
      {
        code: 'special',
        label: 'Special',
        href: '/shop?part=Special',
        description: 'Special structures outside the usual body-area groups.',
        items: [
          filter('wings','Wings','/shop?piece=Wings'),
          filter('tail','Tail','/shop?piece=Tail'),
          filter('spine','Spine','/shop?piece=Spine'),
        ],
      },
    ],
  },

  events_performance: {
    code: 'events_performance',
    label: 'Events & Performance',
    groups: [
      {
        code: 'festival',
        label: 'Festival',
        href: '/collections/festival-outfits',
        description: 'Festival is the broad entry. Rave and Burning Man remain distinct shopper paths.',
        items: [
          owner('rave','Rave','/collections/rave-outfits'),
          owner('burning_man','Burning Man','/collections/burning-man-looks'),
          owner('festival_skirts','Festival Skirts','/collections/festival-skirts'),
        ],
      },
      {
        code: 'other_events',
        label: 'Other Events',
        description: 'Other current event-led paths with mapped inventory.',
        items: [
          filter('halloween','Halloween','/shop?event=Halloween'),
          filter('pride','Pride','/shop?event=Pride'),
          filter('cosplay','Cosplay','/shop?event=Cosplay'),
        ],
      },
      {
        code: 'performance_roles',
        label: 'Performance',
        href: '/collections/stage-outfits',
        description: 'Stage, fashion-show and movement-led performance paths in one shopper group.',
        items: [
          owner('stage_fashion','Stage & Fashion','/collections/stage-outfits'),
          filter('showgirl','Showgirl','/shop?performance=Showgirl'),
          filter('drag_queen','Drag Queen','/shop?performance=Drag%20Queen'),
          filter('go_go_dancer','Go-Go Dancer','/shop?dance=Go-Go%20Dancer'),
          filter('pole_dancer','Pole Dancer','/shop?dance=Pole%20Dancer'),
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
        description: 'Approved visual directions currently present in the 207-product catalog.',
        items: [
          filter('glam','Glam','/shop?style=Glam'),
          filter('futuristic','Futuristic','/shop?style=Futuristic'),
          filter('sci_fi','Sci-Fi','/shop?style=Sci-Fi'),
          filter('cyberpunk','Cyberpunk','/shop?style=Cyberpunk'),
          filter('post_apocalyptic','Post-Apocalyptic','/shop?style=Post-Apocalyptic'),
          filter('fantasy','Fantasy','/shop?style=Fantasy'),
          filter('goth','Goth','/shop?style=Goth'),
          filter('punk','Punk','/shop?style=Punk'),
          filter('burlesque','Burlesque','/shop?style=Burlesque'),
          filter('classic','Classic','/shop?style=Classic'),
        ],
      },
      {
        code: 'personas',
        label: 'Personas',
        description: 'Character and archetype browsing stays separate from Style in Product DNA.',
        items: [
          filter('warrior','Warrior','/shop?persona=Warrior'),
          filter('queen','Queen','/shop?persona=Queen'),
          filter('robot','Robot','/shop?persona=Robot'),
          filter('witch','Witch','/shop?persona=Witch'),
          filter('maleficent','Maleficent','/shop?persona=Maleficent'),
          filter('alien','Alien','/shop?persona=Alien'),
          filter('demon','Demon','/shop?persona=Demon'),
          filter('goddess','Goddess','/shop?persona=Goddess'),
          filter('angel','Angel','/shop?persona=Angel'),
          filter('cleopatra','Cleopatra','/shop?persona=Cleopatra'),
          filter('bunny','Bunny','/shop?persona=Bunny'),
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
