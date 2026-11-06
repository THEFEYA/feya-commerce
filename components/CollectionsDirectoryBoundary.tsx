'use client';
import type {ReactNode} from 'react';
import {useSelectedLayoutSegment} from 'next/navigation';
/** The directory is only /collections; nested collection owners keep their own pages. */
export function CollectionsDirectoryBoundary({children,directory}:{children:ReactNode;directory:ReactNode}){
  const segment=useSelectedLayoutSegment();
  return segment===null?directory:children;
}
