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

// These are existing shopper navigation/filter targets, NOT new SEO page owners.
// The dedicated Festival Skirts collection remains available through Shop,
// but is not an event/occasion category in Events & Performance.
const EVENT_CHOICES=[
  ['Rave','rave','/collections/rave-outfits','Rave','owner'],
  ['Burning Man','burning-man','/collections/burning-man-outfits','Burning Man','owner'],
  ['Halloween','halloween','/shop?event=Halloween','Halloween','filter'],
  ['Pride','pride','/shop?event=Pride','Pride','filter'],
  ['Cosplay','cosplay','/shop?event=Cosplay','Cosplay','filter'],
  ['Performance','performance','/collections/performance-costumes','Performance','owner'],
  ['Fashion','fashion','/shop?performance=Stage%20%26%20Fashion','Stage & Fashion','filter'],
  ['Showgirl','showgirl','/shop?performance=Showgirl','Showgirl','filter'],
  ['Drag Queen','drag-queen','/shop?performance=Drag%20Queen','Drag Queen','filter'],
  ['Go-Go Dancer','go-go-dancer','/shop?dance=Go-Go%20Dancer','Go-Go Dancer','filter'],
  ['Pole Dancer','pole-dancer','/shop?dance=Pole%20Dancer','Pole Dancer','filter'],
] as const;

export const EVENTS_PERFORMANCE_HUB_TILES:DiscoveryHubTile[]=EVENT_CHOICES.map(([label,code,href,preview,role])=>({
  code,label,href,eyebrow:'Events & Performance',
  description:'Explore TheFEYA '+label.toLowerCase()+' looks and individual pieces.',
  imageUrl:imageFrom(EVENTS_PERFORMANCE_MEGA_PREVIEWS,preview),
  imageAlt:label+' stage or festival outfit by TheFEYA',
  role,
}));

// All ten current real style filters, matched to existing approved product photos.
// Personas are intentionally NOT included in the Style carousel.
export const STYLE_HUB_TILES:DiscoveryHubTile[]=[
  'Glam','Futuristic','Sci-Fi','Cyberpunk','Post-Apocalyptic',
  'Fantasy','Goth','Punk','Burlesque','Classic',
].map(label=>({
  code:label.toLowerCase().replace(/[^a-z0-9]+/g,'-'),
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
