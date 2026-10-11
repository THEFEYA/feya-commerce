import {
  EVENTS_PERFORMANCE_MEGA_PREVIEWS,
  SHOP_MEGA_PREVIEWS,
  STYLE_MEGA_PREVIEWS,
} from './megaMenuPresentation.ts';

export type DiscoveryHubTile = {
  code: string;
  label: string;
  pieceCount?: number;
  href: string;
  eyebrow: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  role: 'owner' | 'filter';
};

function imageFrom(map:Record<string,{imageUrl:string}>,label:string){
  return map[label]?.imageUrl || '';
}

export const EVENTS_PERFORMANCE_HUB_TILES:DiscoveryHubTile[]=[
  {
    code:'festival-outfits',pieceCount:111,
    label:'Festival Outfits',
    href:'/collections/festival-outfits',
    eyebrow:'Festival',
    description:'Statement looks for festival nights and large-scale events.',
    imageUrl:imageFrom(EVENTS_PERFORMANCE_MEGA_PREVIEWS,'Festival'),
    imageAlt:'Festival outfit by TheFEYA',
    role:'owner',
  },
  {
    code:'rave-outfits',pieceCount:40,
    label:'Rave Outfits',
    href:'/collections/rave-outfits',
    eyebrow:'Rave',
    description:'High-impact pieces for rave and EDM styling.',
    imageUrl:imageFrom(EVENTS_PERFORMANCE_MEGA_PREVIEWS,'Rave'),
    imageAlt:'Rave outfit by TheFEYA',
    role:'owner',
  },
  {
    code:'burning-man-outfits',pieceCount:45,
    label:'Burning Man Looks',
    href:'/collections/burning-man-outfits',
    eyebrow:'Desert',
    description:'Sculptural statement pieces for desert-event styling.',
    imageUrl:imageFrom(EVENTS_PERFORMANCE_MEGA_PREVIEWS,'Burning Man'),
    imageAlt:'Burning Man look by TheFEYA',
    role:'owner',
  },
  {
    code:'performance-costumes',pieceCount:96,
    label:'Stage & Performance',
    href:'/collections/performance-costumes',
    eyebrow:'Performance',
    description:'Camera-facing pieces for stage, fashion and live performance.',
    imageUrl:imageFrom(EVENTS_PERFORMANCE_MEGA_PREVIEWS,'Stage & Fashion'),
    imageAlt:'Stage performance outfit by TheFEYA',
    role:'owner',
  },
  {
    code:'festival-skirts',pieceCount:56,
    label:'Festival Skirts',
    href:'/collections/festival-skirts',
    eyebrow:'Festival · Skirts',
    description:'Skirt-led looks for festival styling.',
    imageUrl:imageFrom(SHOP_MEGA_PREVIEWS,'Skirts'),
    imageAlt:'Festival skirt by TheFEYA',
    role:'owner',
  },
];

export const STYLE_HUB_TILES:DiscoveryHubTile[]=[
  ['Glam','Glam'],
  ['Futuristic','Futuristic'],
  ['Sci-Fi','Sci-Fi'],
  ['Cyberpunk','Cyberpunk'],
  ['Post-Apocalyptic','Post-Apocalyptic'],
  ['Fantasy','Fantasy'],
  ['Goth','Goth'],
  ['Punk','Punk'],
].map(([code,label])=>({
  code:String(code).toLowerCase().replace(/[^a-z0-9]+/g,'-'),
  label,
  href:'/shop?style='+encodeURIComponent(label),
  eyebrow:'Style',
  description:'Browse '+label+' pieces across the current TheFEYA catalog.',
  imageUrl:imageFrom(STYLE_MEGA_PREVIEWS,label),
  imageAlt:label+' style by TheFEYA',
  role:'filter' as const,
}));

// Governed counts from the latest approved pre-index membership snapshots (2026-10-01).
// They are snapshot evidence, not live inventory or sales metrics.
export const COLLECTION_DIRECTORY_GROUPS=[
  {
    code:'shop',
    label:'Shop by piece',
    description:'Start from the piece you want, then refine by fit, color and context.',
    tiles:[
      {
        code:'shoulder-armor',pieceCount:80,label:'Shoulder Armor',href:'/collections/shoulder-armor',eyebrow:'Upper body',
        description:'Sculptural shoulder pieces for stage, festival and costume styling.',
        imageUrl:imageFrom(SHOP_MEGA_PREVIEWS,'Shoulders'),imageAlt:'Shoulder armor by TheFEYA',role:'owner' as const,
      },
      {
        code:'bodysuits',pieceCount:30,label:'Costume Bodysuits',href:'/collections/bodysuits',eyebrow:'Full body',
        description:'Complete bodysuit designs for performance and statement looks.',
        imageUrl:imageFrom(SHOP_MEGA_PREVIEWS,'Bodysuits'),imageAlt:'Costume bodysuit by TheFEYA',role:'owner' as const,
      },
      {
        code:'costume-masks',pieceCount:11,label:'Costume Masks',href:'/collections/costume-masks',eyebrow:'Head & face',
        description:'Decorative masks for stage, costume and editorial styling.',
        imageUrl:imageFrom(SHOP_MEGA_PREVIEWS,'Masks'),imageAlt:'Costume mask by TheFEYA',role:'owner' as const,
      },
      {
        code:'costume-headpieces',pieceCount:34,label:'Costume Headpieces',href:'/collections/costume-headpieces',eyebrow:'Head & face',
        description:'Sculptural crowns and headpieces for complete looks.',
        imageUrl:imageFrom(SHOP_MEGA_PREVIEWS,'Headpieces'),imageAlt:'Costume headpiece by TheFEYA',role:'owner' as const,
      },
      {
        code:'costume-belts',pieceCount:13,label:'Costume Belts',href:'/collections/costume-belts',eyebrow:'Lower body',
        description:'Decorative waist pieces designed to finish a coordinated look.',
        imageUrl:imageFrom(SHOP_MEGA_PREVIEWS,'Belts'),imageAlt:'Costume belt by TheFEYA',role:'owner' as const,
      },
    ],
  },
  {
    code:'events_performance',
    label:'Events & performance',
    description:'Browse the strongest event and performance collections without digging through a registry.',
    tiles:EVENTS_PERFORMANCE_HUB_TILES,
  },
] as const;
