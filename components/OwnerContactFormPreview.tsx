'use client';
import {useEffect, useState} from 'react';
import {Mail} from 'lucide-react';
import {
  ORDER_HELP_HASH, ORDER_QUESTION, STUDIO_EMAIL, STUDIO_TOPICS, studioEnquiryMailto,
  takeSupportOrderNumber, type StudioTopic,
} from '@/lib/studioEnquiry';

const field='w-full min-w-0 min-h-11 rounded-lg border border-white/20 bg-[#141418] px-4 py-3 text-[14px] text-[#f7f3ec] placeholder:text-[#88817b] focus:outline-none focus:ring-2 focus:ring-[#d4b26a]';
const label='flex min-w-0 flex-col gap-1.5 text-[13px] text-[#d8d1c5]';
const link='text-bone underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d4b26a]';

export function OwnerContactFormPreview(){
  const [topic,setTopic]=useState<StudioTopic>(STUDIO_TOPICS[0]);
  const [orderNumber,setOrderNumber]=useState('');
  const [message,setMessage]=useState('');
  const [attempted,setAttempted]=useState(false);

  useEffect(()=>{
    function enter(){
      const number=takeSupportOrderNumber();
      if(window.location.hash!==ORDER_HELP_HASH)return;
      setTopic(ORDER_QUESTION);
      if(number)setOrderNumber(number);
    }
    enter();
    window.addEventListener('hashchange',enter);
    return ()=>window.removeEventListener('hashchange',enter);
  },[]);

  return <>
    <div id="studio-enquiry-fields" onChange={()=>setAttempted(false)}
      className="mt-5 grid gap-4" role="group" aria-label="Prepare email to TheFEYA">
      <label className={label}>What can we help with?
        <select className={field} value={topic.label} aria-describedby="contact-topic-hint"
          onChange={event=>setTopic(STUDIO_TOPICS.find(item=>item.label===event.target.value)!)}>
          {[false,true].map(isOrder=><optgroup key={String(isOrder)} label={isOrder?'An existing order':'General enquiries'}>
            {STUDIO_TOPICS.filter(item=>item.order===isOrder).map(item=><option key={item.label}>{item.label}</option>)}
          </optgroup>)}
        </select>
      </label>
      {topic.order&&<label className={label}>Order number (optional)
        <input className={field} maxLength={14} autoComplete="off"
          value={orderNumber} onChange={event=>setOrderNumber(event.target.value)}
          placeholder="FEYA-123456" autoCapitalize="characters" spellCheck={false}/>
      </label>}
      <label className={label}>Your message
        <textarea className={field+' min-h-24'} rows={3} maxLength={1800}
          aria-describedby="contact-topic-hint" value={message}
          onChange={event=>setMessage(event.target.value)} />
      </label>
      <p id="contact-topic-hint" className="text-[13px] leading-5 text-[var(--bone-dim)]" aria-live="polite">{topic.hint}</p>
      <button type="button" onClick={()=>{
        setAttempted(true);
        window.location.assign(studioEnquiryMailto(topic,orderNumber,message));
      }} data-testid="contact-email-prepare" className="btn-chrome inline-flex w-fit max-w-full items-center gap-2">
        <Mail size={16} aria-hidden="true"/>Open email draft
      </button>
      <p className="text-[13px] leading-5 text-[var(--bone-dim)]" role="status">
        {attempted?<>Send the message from your email app. If it didn’t open, write to <a className={link} href={'mailto:'+STUDIO_EMAIL}>{STUDIO_EMAIL}</a>.</>
          :'You can review and send the message in your email app.'}
      </p>
    </div>
    <noscript><style>{'#studio-enquiry-fields{display:none}'}</style>
      <p className="mt-4 text-[14px] text-[var(--bone-dim)]">Email the studio at <a className={link} href={'mailto:'+STUDIO_EMAIL}>{STUDIO_EMAIL}</a>. Include your order number if you have it.</p>
    </noscript>
    <p className="mt-3 text-[13px] leading-5"><a className={link} href="/returns#withdrawal-notice">Give notice of withdrawal to the seller</a></p>
  </>;
}
