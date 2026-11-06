'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {Heart,Trash2} from 'lucide-react';
import {SAVED_PIECES_KEY,SAVED_PIECES_EVENT,parseSavedPieces,toggleSavedPiece,type SavedPiece} from '@/lib/savedPieces';

function useSavedPieces(){
  const [items,setItems]=useState<SavedPiece[]>([]);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    const read=()=>{
      try{setItems(parseSavedPieces(window.localStorage.getItem(SAVED_PIECES_KEY)));setError('');}
      catch{setError('Saving is unavailable in this browser. You can still copy a product link with Share.');}
      setReady(true);
    };
    const storage=(e:StorageEvent)=>{if(e.key===SAVED_PIECES_KEY||e.key===null)read();};
    read();window.addEventListener('storage',storage);window.addEventListener(SAVED_PIECES_EVENT,read);
    return()=>{window.removeEventListener('storage',storage);window.removeEventListener(SAVED_PIECES_EVENT,read);};
  },[]);
  function update(change:(current:SavedPiece[])=>SavedPiece[]){
    try{
      // Read at action time so another tab's newer shortlist is retained.
      const next=change(parseSavedPieces(window.localStorage.getItem(SAVED_PIECES_KEY)));
      window.localStorage.setItem(SAVED_PIECES_KEY,JSON.stringify(next));
      setItems(next);setError('');window.dispatchEvent(new Event(SAVED_PIECES_EVENT));
      return true;
    }catch{setError('This item could not be saved. Use Share to copy its link.');return false;}
  }
  return {items,ready,error,update};
}

export function SavePieceButton({piece}:{piece:SavedPiece}){
  const {items,ready,error,update}=useSavedPieces();
  const [notice,setNotice]=useState(false);
  const saved=items.some(p=>p.id===piece.id);
  return <>
    <button type="button" aria-pressed={saved} disabled={!ready}
      title="Save this piece in this browser" className="inline-flex items-center hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]"
      onClick={()=>{if(update(current=>toggleSavedPiece(current,piece)))setNotice(true);}}>
      <Heart size={11} className="inline mr-1" fill={saved?'currentColor':'none'}/>{saved?'Saved':'Save'}
    </button>
    {error?<span role="status" className="basis-full text-center text-[11px] normal-case tracking-normal">{error}</span>
      :notice?<span role="status" className="basis-full text-center text-[11px] normal-case tracking-normal">
        {saved?'Saved in this browser. ':'Removed from your saved pieces. '}<Link href="/account" className="underline underline-offset-4">View saved pieces</Link>
      </span>:null}
  </>;
}

export function SavedPiecesList(){
  const {items,ready,error,update}=useSavedPieces();
  return <section className="mt-8" aria-label="Saved pieces">
    <h2 className="text-[24px] text-[#f7f3ec]">Your saved pieces</h2>
    <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">Saved on this browser only. Clearing browser data removes this list. Open a piece to see its current price and options.</p>
    {error?<p role="status" className="mt-4 text-[13px] text-[#e9bd95]">{error}</p>:null}
    {!ready?<p role="status" className="mt-5 text-[14px]">Loading saved pieces…</p>
      :items.length===0?<p className="mt-5 text-[14px] text-[var(--bone-dim)]">No saved pieces yet. Use Save on a product page to keep it here.</p>
      :<div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(piece=><article key={piece.id} className="overflow-hidden rounded-xl border border-white/15 bg-white/[.025]">
          <Link href={'/shop/'+piece.slug} className="block">
            {piece.image?
              // eslint-disable-next-line @next/next/no-img-element
              <img src={piece.image} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover"/>:null}
            <h3 className="px-5 pt-5 text-[18px] leading-6 text-[#f7f3ec]">{piece.title}</h3>
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-[13px]">
            <Link href={'/shop/'+piece.slug} className="text-[#e1c681] underline underline-offset-4">View piece</Link>
            <button type="button" aria-label={'Remove saved '+piece.title} className="inline-flex min-h-10 items-center gap-1 text-[var(--bone-dim)] hover:text-white"
              onClick={()=>update(current=>current.filter(p=>p.id!==piece.id))}><Trash2 size={14}/>Remove</button>
          </div>
        </article>)}
      </div>}
  </section>;
}
