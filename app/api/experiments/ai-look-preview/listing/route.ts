import {NextRequest,NextResponse} from 'next/server';
import {isAiLookOwnerPreview} from '@/lib/aiLookPreviewPolicy';
import {aiLookReadApprovedListing} from '@/lib/aiLookPreviewCatalogServer';

const HEADERS={
 'Cache-Control':'private, no-store, max-age=0',
 'X-Robots-Tag':'noindex, nofollow, noarchive',
};
export async function GET(request:NextRequest){
 if(!isAiLookOwnerPreview(process.env)){
  return NextResponse.json({ok:false,error:'not_found'},{status:404,headers:HEADERS});
 }
 const slug=new URL(request.url).searchParams.get('slug')||'';
 if(!/^[a-z0-9-]{5,240}$/.test(slug))
  return NextResponse.json({ok:false,error:'invalid_slug'},{status:400,headers:HEADERS});
 try{
  const look=await aiLookReadApprovedListing(slug);
  if(!look)return NextResponse.json({ok:false,error:'listing_unavailable'},{status:404,headers:HEADERS});
  // Only the immutable approved Product Detail projection, never image bytes,
  // customer uploads, owner credentials or paid merchant quote details.
  return NextResponse.json({ok:true,look},{headers:HEADERS});
 }catch{
  return NextResponse.json({ok:false,error:'listing_service_unavailable'},{status:503,headers:HEADERS});
 }
}
