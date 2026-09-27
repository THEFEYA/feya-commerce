export type DiscoveryRole='OWNER'|'INTERSECTION_OWNER'|'FILTER';
export type DiscoveryGroupCode='product_types'|'events'|'performance'|'styles';

export type DiscoveryItem={
  label:string;
  href:string;
  role:DiscoveryRole;
  group:DiscoveryGroupCode;
  description?:string;
};

export type DiscoveryGroup={
  code:DiscoveryGroupCode;
  title:string;
  items:DiscoveryItem[];
};

export const SEARCH_DISCOVERY_GROUPS:DiscoveryGroup[]=[
  {
    code:'product_types',
    title:'Product Types',
    items:[
      {label:'Shoulder Armor',href:'/collections/shoulder-armor',role:'OWNER',group:'product_types'},
      {label:'Bodysuits',href:'/collections/bodysuits',role:'OWNER',group:'product_types'},
      {label:'Costume Masks',href:'/collections/costume-masks',role:'OWNER',group:'product_types'},
      {label:'Costume Headpieces',href:'/collections/costume-headpieces',role:'OWNER',group:'product_types'},
      {label:'Costume Belts',href:'/collections/costume-belts',role:'OWNER',group:'product_types'},
      {label:'Harness',href:'/shop?category=Harness',role:'FILTER',group:'product_types'},
      {label:'Corsets',href:'/shop?category=Corsets',role:'FILTER',group:'product_types'},
      {label:'Skirts',href:'/shop?category=Skirts',role:'FILTER',group:'product_types'},
    ],
  },
  {
    code:'events',
    title:'Events & Occasions',
    items:[
      {label:'Festival Outfits',href:'/collections/festival-outfits',role:'OWNER',group:'events'},
      {label:'Rave Outfits',href:'/collections/rave-outfits',role:'OWNER',group:'events'},
      {label:'Burning Man Looks',href:'/collections/burning-man-looks',role:'OWNER',group:'events'},
      {label:'Festival Skirts',href:'/collections/festival-skirts',role:'INTERSECTION_OWNER',group:'events'},
    ],
  },
  {
    code:'performance',
    title:'Performance',
    items:[
      {label:'Stage & Performance',href:'/collections/stage-outfits',role:'OWNER',group:'performance'},
    ],
  },
  {
    code:'styles',
    title:'Explore Styles',
    items:[
      {label:'Futuristic',href:'/shop?style=Futuristic',role:'FILTER',group:'styles'},
      {label:'Goddess',href:'/shop?style=Goddess',role:'FILTER',group:'styles'},
      {label:'Warrior',href:'/shop?style=Warrior',role:'FILTER',group:'styles'},
      {label:'Desert',href:'/shop?style=Desert',role:'FILTER',group:'styles'},
      {label:'Editorial',href:'/shop?style=Editorial',role:'FILTER',group:'styles'},
    ],
  },
];

export const SEARCH_OWNER_DISCOVERY_ITEMS=SEARCH_DISCOVERY_GROUPS
  .flatMap(group=>group.items)
  .filter(item=>item.role==='OWNER'||item.role==='INTERSECTION_OWNER');

export const SEARCH_FILTER_DISCOVERY_ITEMS=SEARCH_DISCOVERY_GROUPS
  .flatMap(group=>group.items)
  .filter(item=>item.role==='FILTER');

export const HOME_COLLECTION_GATEWAYS=[
  '/collections/festival-outfits',
  '/collections/rave-outfits',
  '/collections/burning-man-looks',
  '/collections/stage-outfits',
  '/collections/shoulder-armor',
  '/collections/bodysuits',
] as const;

export function discoveryItemForPath(path:string){
  return SEARCH_DISCOVERY_GROUPS.flatMap(group=>group.items).find(item=>item.href===path)||null;
}
