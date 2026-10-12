import type {ReactNode} from 'react';
import {isApprovedV13Presentation} from '@/lib/approvedV13Presentation';
import './v13Public.css';
import {OwnerShopFooterPreview} from '@/components/OwnerShopFooterPreview';
import {OwnerMobileNavigationReviewFix} from '@/components/OwnerMobileNavigationReviewFix';

/** Public presentation wrapper only; canonical pages, product truth,
 * Search Release v12 and payment gates remain unchanged. */
export default function Template({children}:{children:ReactNode}){
  if(!isApprovedV13Presentation(process.env))return children;
  return <div className="owner-visual-v2-root">
    {children}<OwnerMobileNavigationReviewFix/><OwnerShopFooterPreview/>
  </div>;
}
