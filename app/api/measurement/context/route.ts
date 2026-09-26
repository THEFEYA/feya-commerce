import {NextRequest,NextResponse} from 'next/server';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import {readSearchReleasePathState} from '@/lib/searchReleaseIndexationServer';

export const dynamic='force-dynamic';

function normalizePath(value:string|null){
  if(!value)return null;
  let decoded:string;
  try{decoded=decodeURIComponent(value);}catch{return null;}
  if(!decoded.startsWith('/')||decoded.includes('?')||decoded.includes('#'))return null;
  if(decoded.length>1)decoded=decoded.replace(/\/+$/,'');
  return decoded||'/';
}

function measurementEnvironment(){
  const raw=(process.env.VERCEL_ENV||process.env.NODE_ENV||'unknown').toLowerCase();
  if(raw==='production'||raw==='preview'||raw==='development'||raw==='test')return raw;
  return 'unknown';
}

export async function GET(request:NextRequest){
  const path=normalizePath(request.nextUrl.searchParams.get('path'));
  if(!path)return NextResponse.json({ok:false,code:'invalid_path'},{status:400,headers:{'Cache-Control':'no-store'}});
  if(path.startsWith('/admin')||path.startsWith('/api')){
    return NextResponse.json({ok:false,code:'measurement_private_surface_excluded'},{status:404,headers:{'Cache-Control':'no-store'}});
  }

  const service=getSupabaseServiceRoleClient();
  if(!service)return NextResponse.json({ok:false,code:'measurement_context_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});

  const pageResult=await service
    .from('feya_commerce_seo_pages_v1')
    .select('seo_page_id,canonical_product_id,url_path')
    .eq('market_code','US')
    .eq('locale','en-US')
    .eq('url_path',path)
    .maybeSingle();

  if(pageResult.error)return NextResponse.json({ok:false,code:'measurement_page_lookup_failed'},{status:503,headers:{'Cache-Control':'no-store'}});
  if(!pageResult.data?.seo_page_id)return NextResponse.json({ok:false,code:'measurement_page_not_registered'},{status:404,headers:{'Cache-Control':'no-store'}});

  const pageId=String(pageResult.data.seo_page_id);
  const releaseState=await readSearchReleasePathState(path);
  let pageVersionId=releaseState.pageVersionId;

  if(!pageVersionId){
    const version=await service
      .from('feya_search_page_versions_v1')
      .select('page_version_id')
      .eq('seo_page_id',pageId)
      .order('version_number',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(version.error)return NextResponse.json({ok:false,code:'measurement_page_version_lookup_failed'},{status:503,headers:{'Cache-Control':'no-store'}});
    pageVersionId=version.data?.page_version_id?String(version.data.page_version_id):null;
  }

  const environment=measurementEnvironment();
  const measurementId=(process.env.FEYA_GA4_MEASUREMENT_ID||'').trim();
  const measurementEnabled=environment==='production'
    && process.env.FEYA_ANALYTICS_ENABLED==='true'
    && /^G-[A-Z0-9]+$/i.test(measurementId);

  return NextResponse.json({
    ok:true,
    context:{
      page_id:pageId,
      page_version_id:pageVersionId,
      release_id:releaseState.release?.releaseId||null,
      canonical_product_id:pageResult.data.canonical_product_id?String(pageResult.data.canonical_product_id):null,
      path,
      environment,
      measurement_enabled:measurementEnabled,
      ga4_measurement_id:measurementEnabled?measurementId:null,
    }
  },{headers:{'Cache-Control':'no-store'}});
}
