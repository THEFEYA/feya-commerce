export const instant = false;

import type {ReactNode} from 'react';
import {notFound} from 'next/navigation';
import {getSearchLandingCandidate} from '@/config/searchLandingCandidates';

type LayoutProps={
  children:ReactNode;
  params:Promise<{slug:string}>;
};

export default async function SearchOwnerAdmissionLayout({children,params}:LayoutProps){
  const {slug}=await params;
  const candidate=getSearchLandingCandidate(slug);
  if(!candidate||candidate.searchStatus==='hold_noindex')notFound();
  return children;
}
