import {type NextRequest,NextResponse} from 'next/server';
import {withInternalApi} from '@/lib/internalAuth';
import {probeOfficialGscReadOnly} from '@/lib/gscOfficialReadOnly';

/** On-demand internal source preflight. No persistent mutations or schedules. */
async function handleGet(_request:NextRequest){
  const result=await probeOfficialGscReadOnly(process.env);
  return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});
}
export const GET=withInternalApi(handleGet);
