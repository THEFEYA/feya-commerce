export const instant = false;
import type {ReactNode} from 'react';
import {isApprovedV13Presentation} from '@/lib/approvedV13Presentation';
import {CollectionsDirectoryV13} from '@/components/CollectionsDirectoryV13';
/** Reuse the exact approved Events/Style tile geometry; keep route metadata authoritative. */
export default function Layout({children}:{children:ReactNode}){
  return isApprovedV13Presentation(process.env)?<CollectionsDirectoryV13/>:children;
}
