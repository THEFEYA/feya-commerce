'use client';

import {useEffect} from 'react';

/** Owner-preview-only compatibility layer for the frozen Header.tsx.
 * When mobile navigation is opened, close its legacy initially-expanded Shop
 * group ONCE. The user's subsequent manual group clicks work normally.
 * Header and its approved desktop layout are deliberately not modified.
 */
export function OwnerMobileNavigationReviewFix(){
  useEffect(()=>{
    let current:HTMLElement|null=null;
    let menuObserver:MutationObserver|null=null;
    const bind=()=>{
      const candidate=document.querySelector<HTMLElement>('[data-testid="site-header"] [aria-label="Site navigation"]');
      if(!candidate||candidate===current)return;
      menuObserver?.disconnect();
      current=candidate;
      menuObserver=new MutationObserver(records=>{
        if(!records.some(r=>r.attributeName==='aria-hidden'))return;
        if(current?.getAttribute('aria-hidden')!=='false')return;
        const shop=current.querySelector<HTMLButtonElement>('button[aria-controls="mobile-panel-shop"]');
        // Do not modify other open states. This runs only at MENU OPEN,
        // not after a shopper actively expands Shop.
        if(shop?.getAttribute('aria-expanded')==='true')shop.click();
      });
      menuObserver.observe(candidate,{attributes:true,attributeFilter:['aria-hidden']});
    };
    bind();
    const rootObserver=new MutationObserver(bind);
    rootObserver.observe(document.body,{childList:true,subtree:true});
    return()=>{rootObserver.disconnect();menuObserver?.disconnect();};
  },[]);
  return null;
}
