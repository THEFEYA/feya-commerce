'use client';

import {useState} from 'react';
import {Check,Copy} from 'lucide-react';

type Props={email:string};

/** Opt-in manual clipboard operation. No website form, analytics contact event,
 * background messaging, CRM auto signup or claimed success before OS clipboard.
 */
export function CopySupportEmailButton({email}:Props){
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
  return <div className="inline-flex flex-col gap-1.5">
    <button type="button" onClick={copy}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[rgba(212,178,106,.30)] bg-[rgba(212,178,106,.07)] px-4 text-[13px] font-medium text-[#f7f3ec] hover:border-[#d4b26a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4b26a]">
      {status==='copied'?<Check size={16} aria-hidden="true"/>:<Copy size={16} aria-hidden="true"/>}
      {status==='copied'?'Email copied':'Copy email'}
    </button>
    <span aria-live="polite" className="text-[11px] leading-4 text-[var(--bone-dim)]">
      {status==='unavailable'?'Copy unavailable. Use the email link instead.':status==='copied'?'Copied to clipboard.':''}
    </span>
  </div>;
}
