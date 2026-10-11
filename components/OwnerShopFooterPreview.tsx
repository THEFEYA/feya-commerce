'use client';

import {usePathname} from 'next/navigation';
import {Footer} from '@/components/Footer';

/** Root owner template is exact-branch gated. Show full site footer only
 * on the /shop catalog, which has no footer in its frozen Page.tsx.
 * Product detail and every other route already own their own footer.
 */
export function OwnerShopFooterPreview(){
  const pathname=usePathname();
  if(pathname!=='/shop')return null;
  return <Footer/>;
}
