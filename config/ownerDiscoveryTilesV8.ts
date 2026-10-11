import {
 EVENTS_PERFORMANCE_MEGA_PREVIEWS,
 STYLE_MEGA_PREVIEWS,
} from './megaMenuPresentation';
import type {DiscoveryHubTile} from './discoveryHubs';

/** Owner-Preview-only navigation menu, intentionally separate from the
 * 10 canonical indexed collection-directory owners and historic pins.
 */
function imageFrom(map:Record<string,{imageUrl:string}>,label:string){
 return map[label]?.imageUrl || '';
}

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

export const OWNER_EVENTS_HUB_TILES:DiscoveryHubTile[]=EVENT_CHOICES.map(([label,code,href,preview,role])=>({
  code,label,href,eyebrow:'Events & Performance',
  description:'Explore TheFEYA '+label.toLowerCase()+' looks and individual pieces.',
  imageUrl:imageFrom(EVENTS_PERFORMANCE_MEGA_PREVIEWS,preview),
  imageAlt:label+' stage or festival outfit by TheFEYA',
  role,
}));

// All ten current real style filters, matched to existing approved product photos.
// Personas are intentionally NOT included in the Style carousel.
export const OWNER_STYLE_HUB_TILES:DiscoveryHubTile[]=[
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

