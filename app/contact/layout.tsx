export const instant = false;
import type {ReactNode} from 'react';
import {isApprovedV13Presentation,isOwnerColorV13Preview} from '@/lib/approvedV13Presentation';
import {ApprovedOwnerContactPreview} from '@/components/ApprovedOwnerContactPreview';
import {ContactExperienceV13Public} from '@/components/ContactExperienceV13Public';
export default function Layout({children}:{children:ReactNode}){
 // The historic two-map layout is preserved only for the exact SSO owner
 // color consolidation preview; public V13 legal/Contact stays unchanged.
 if(isOwnerColorV13Preview(process.env))return <ApprovedOwnerContactPreview/>;
 return isApprovedV13Presentation(process.env)?<ContactExperienceV13Public/>:children;
}
