export const instant = false;
import type {ReactNode} from 'react';
import {isApprovedV13Presentation} from '@/lib/approvedV13Presentation';
import {OwnerAboutReview} from '@/components/OwnerEditorialReviewPages';
export default function Layout({children}:{children:ReactNode}){
 return isApprovedV13Presentation(process.env)?<OwnerAboutReview/>:children;
}
