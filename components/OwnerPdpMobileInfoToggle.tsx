'use client';

import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {createPortal} from 'react-dom';
import {ChevronDown} from 'lucide-react';

/** Review-only accessible mobile disclosure: portal a single button into the
 * existing canonical right-PDP panel, without moving/copying product-owned DOM
 * or editing the frozen ProductDetailClient source and approved text.
 */
export function OwnerPdpMobileInfoToggle(){
  const pathname=usePathname();
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [expanded,setExpanded]=useState(false);

  useEffect(()=>{
    setExpanded(false);
    setHost(null);
    const selector='[data-testid="product-page"] #description > div:nth-child(2)';
    let observer:MutationObserver|null=null;
    const attach=()=>{
      const found=document.querySelector<HTMLElement>(selector);
      if(!found)return false;
      setHost(found);
      observer?.disconnect();
      return true;
    };
    if(!attach()){
      observer=new MutationObserver(attach);
      observer.observe(document.body,{childList:true,subtree:true});
    }
    return ()=>{observer?.disconnect();};
  },[pathname]);

  useEffect(()=>{
    if(!host)return;
    const openForFragment=()=>{
      const fragment=window.location.hash.slice(1);
      if(fragment && host.querySelector('#'+CSS.escape(fragment)))setExpanded(true);
    };
    openForFragment();
    window.addEventListener('hashchange',openForFragment);
    return ()=>window.removeEventListener('hashchange',openForFragment);
  },[host]);

  if(!host)return null;
  return createPortal(<button type="button"
    className="owner-mobile-pdp-info-trigger"
    aria-expanded={expanded}
    onClick={()=>setExpanded(value=>!value)}>
    <span>Additional information</span>
    <ChevronDown size={19} strokeWidth={1.6} aria-hidden="true"/>
  </button>,host);
}
