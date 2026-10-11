import type {ReactNode} from 'react';
import {
  isOwnerUnifiedStorefrontPreview,
  OWNER_VISUAL_V2_REVIEW_BRANCH,
} from '@/lib/ownerUnifiedStorefrontPreview';
import './ownerVisualPreviewV2.css';
import {OwnerShopFooterPreview} from '@/components/OwnerShopFooterPreview';
import {OwnerMobileNavigationReviewFix} from '@/components/OwnerMobileNavigationReviewFix';

/** Visual edits are scoped to the exact authenticated preview deployment.
 * Production layout and owner-frozen Header/PDP/Shop sources remain unchanged.
 */
export default function Template({children}:{children:ReactNode}){
  const active=isOwnerUnifiedStorefrontPreview(process.env)
    &&process.env.VERCEL_GIT_COMMIT_REF===OWNER_VISUAL_V2_REVIEW_BRANCH;
  return active?<div className="owner-visual-v2-root">{children}<OwnerMobileNavigationReviewFix/><OwnerShopFooterPreview/></div>:children;
}
