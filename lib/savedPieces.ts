/** Browser-local shortlist only. Never an account, price or order authority. */
export const SAVED_PIECES_KEY = 'feya_saved_pieces_v1';
export const SAVED_PIECES_EVENT = 'feya-saved-pieces-changed';
export type SavedPiece = {id:string;slug:string;title:string;image:string};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSavedPiece(value:unknown):value is SavedPiece {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const p=value as Record<string,unknown>;
  if(typeof p.id!=='string'||!UUID.test(p.id)||typeof p.slug!=='string'
    ||p.slug.length>500||!SLUG.test(p.slug)||typeof p.title!=='string'
    ||!p.title.trim()||p.title.length>600||typeof p.image!=='string')return false;
  if(!p.image)return true;
  try{const u=new URL(p.image);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}
}

export function parseSavedPieces(raw:string|null):SavedPiece[]{
  if(!raw||raw.length>1_000_000)return [];
  try{
    const data:unknown=JSON.parse(raw);
    if(!Array.isArray(data))return [];
    const ids=new Set<string>();
    return data.filter(isSavedPiece).filter(p=>{
      if(ids.has(p.id))return false;ids.add(p.id);return true;
    }).slice(0,207).map(({id,slug,title,image})=>({id,slug,title,image}));
  }catch{return [];}
}

export function toggleSavedPiece(items:SavedPiece[],piece:SavedPiece):SavedPiece[]{
  if(!isSavedPiece(piece))throw new Error('INVALID_SAVED_PIECE');
  return items.some(p=>p.id===piece.id)?items.filter(p=>p.id!==piece.id)
    :[piece,...items].slice(0,207);
}

export function productShareUrl(slug:string):string{
  if(!SLUG.test(slug)||slug.length>500)throw new Error('INVALID_PRODUCT_SLUG');
  return 'https://thefeya.com/shop/'+slug;
}
