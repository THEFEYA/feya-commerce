export const instant = false;
import type {ReactNode} from 'react';
import {isApprovedV13Presentation} from '@/lib/approvedV13Presentation';
import {ContactExperienceV13Public} from '@/components/ContactExperienceV13Public';
export default function Layout({children}:{children:ReactNode}){
 return isApprovedV13Presentation(process.env)?<ContactExperienceV13Public/>:children;
}
