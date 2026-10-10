import {ShopClient} from '@/components/ShopClient';
import type {DiscoveryHubTile} from '@/config/discoveryHubs';
import {OwnerDiscoveryTileStrip} from '@/components/OwnerDiscoveryTileStrip';
import type {StorefrontProduct} from '@/lib/types';

/** Four-product-wide visual discovery, like the owner-approved homepage.
 * This page is candidate-only until the frozen route receives owner review.
 */
export function DiscoveryTileRow({tiles}:{tiles:DiscoveryHubTile[]}){
  return <OwnerDiscoveryTileStrip tiles={tiles}/>;
}

export function DiscoveryHubProducts({
  products,
  defaultOpenFilterSections = [],
}:{
  products:StorefrontProduct[];
  defaultOpenFilterSections?:string[];
}){
  return <ShopClient products={products} embedded defaultOpenFilterSections={defaultOpenFilterSections}/>;
}
