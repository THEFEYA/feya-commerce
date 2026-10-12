export const instant = false;
import type {ReactNode} from 'react';
import {isApprovedV13Presentation} from '@/lib/approvedV13Presentation';
import OwnerV13StyleHub from '@/components/OwnerV13StyleHub';
export default function Layout({children}:{children:ReactNode}){
 return isApprovedV13Presentation(process.env)?<OwnerV13StyleHub/>:children;
}
