'use client';

import {useEffect,useRef,useState} from 'react';
import {Share2,X,Copy} from 'lucide-react';
import {productShareUrl} from '@/lib/savedPieces';

/** Opens a reviewable link dialog; never posts to a social network automatically. */
export function ProductShareButton({slug,title}:{slug:string;title:string}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [notice,setNotice]=useState('');
  const [canShare,setCanShare]=useState(false);
  const url=productShareUrl(slug);
  useEffect(()=>{setCanShare(typeof navigator.share==='function');},[]);
  async function copy(){
    try{
      if(!navigator.clipboard?.writeText)throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(url);setNotice('Product link copied.');
    }catch{setNotice('Copy is unavailable. Select the link above and copy it manually.');}
  }
  async function share(){
    try{await navigator.share({title,url});setNotice('Shared using your device.');}
    catch(error){if(!(error instanceof Error&&error.name==='AbortError'))setNotice('Sharing is unavailable. Copy the product link instead.');}
  }
  return <>
    <button type="button" className="inline-flex items-center hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]"
      onClick={()=>{setNotice('');dialog.current?.showModal();}}><Share2 size={11} className="inline mr-1"/>Share</button>
    <dialog ref={dialog} aria-label="Share this piece" className="m-auto w-[calc(100%_-_32px)] max-w-[440px] rounded-2xl border border-white/20 bg-[#111116] p-6 text-left text-[#f7f3ec] normal-case tracking-normal shadow-2xl backdrop:bg-black/70">
      <div className="flex items-center justify-between gap-4"><h2 className="text-[22px]">Share this piece</h2>
        <button type="button" aria-label="Close share" className="flex h-10 w-10 items-center justify-center" onClick={()=>dialog.current?.close()}><X size={19}/></button></div>
      <p className="mt-3 text-[14px] leading-6 text-[var(--bone-dim)]">{title}</p>
      <label className="mt-5 block text-[13px]">Product link
        <input readOnly value={url} onFocus={event=>event.currentTarget.select()} className="mt-2 w-full rounded-lg border border-white/20 bg-black/25 p-3 text-[13px]"/>
      </label>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn-chrome" onClick={copy}><Copy size={14}/>Copy product link</button>
        {canShare?<button type="button" className="btn-ghost" onClick={share}>Share using your device</button>:null}
      </div>
      <p role="status" className="mt-4 text-[13px] leading-6 text-[var(--bone-dim)]">{notice}</p>
    </dialog>
  </>;
}
