export const instant = false;
import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {isOwnerUnifiedStorefrontPreview} from '@/lib/ownerUnifiedStorefrontPreview';
import {OwnerSizeGuideReview} from '@/components/OwnerEditorialReviewPages';
export const metadata:Metadata={title:'TheFEYA · Size Guide Owner Review',robots:{index:false,follow:false,nocache:true,noarchive:true}};
export default function Page(){if(!isOwnerUnifiedStorefrontPreview(process.env))notFound();return <OwnerSizeGuideReview/>;}
