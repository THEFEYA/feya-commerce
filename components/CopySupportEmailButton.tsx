'use client';
import {useState} from 'react';
import {Check,Copy} from 'lucide-react';

type Props={email:string;label?:string};
/** Owner preview compact clipboard icon. Truly reports success only after OS API. */
export function CopySupportEmailButton({email,label='email address'}:Props){
  const [status,setStatus]=useState<'idle'|'copied'|'unavailable'>('idle');
  const copy=async()=>{
    setStatus('idle');
    try{
      if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');
      await navigator.clipboard.writeText(email);
      setStatus('copied');
    }catch{
      setStatus('unavailable');
    }
  };
  return <span className="relative inline-flex shrink-0 flex-col items-center">
    <button type="button" onClick={copy} title={'Copy '+label}
      aria-label={status==='copied'?label+' copied':'Copy '+label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#d4b26a] hover:bg-white/[.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]">
      {status==='copied'?<Check size={18} aria-hidden="true"/>:<Copy size={18} aria-hidden="true"/>}
    </button>
    <span aria-live="polite" className="sr-only">
      {status==='unavailable'?'Copy unavailable. Use the contact link instead.':status==='copied'?'Copied '+label+' to clipboard.':''}
    </span>
  </span>;
}
