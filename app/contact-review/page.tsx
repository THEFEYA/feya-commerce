export const instant = false;

import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {ContactExperience2026} from '@/components/ContactExperience2026';

/** Preview-only proposal for the explicit owner-authorized Contact visual
 * amendment. Current indexed /contact and its immutable Search v12 binding
 * stay untouched until a separate versioned content/release approval.
 */
export const metadata:Metadata={
  title:'TheFEYA Contact Layout Review',
  description:'Unlisted preview of the refreshed TheFEYA contact experience.',
  robots:{index:false,follow:false,nocache:true,noarchive:true},
};

export default function ContactReviewPage(){
  // Never publish a second contact page on the canonical production domain.
  if(process.env.VERCEL_ENV!=='preview' && process.env.NODE_ENV==='production')notFound();
  return <ContactExperience2026/>;
}
