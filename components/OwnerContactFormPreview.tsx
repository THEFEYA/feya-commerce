'use client';
import {useState} from 'react';
import {Mail,Send} from 'lucide-react';
const base='w-full min-h-11 rounded-lg border border-white/20 bg-[#141418] px-4 py-3 text-[14px] text-[#f7f3ec] placeholder:text-[#88817b] focus:outline-none focus:ring-2 focus:ring-[#d4b26a]';
export function OwnerContactFormPreview(){
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [reason,setReason]=useState('Product or fit');
  const [message,setMessage]=useState('');
  const [prepared,setPrepared]=useState(false);
  function prepare(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!name.trim()||!message.trim()||!email.includes('@'))return;
    const subject=encodeURIComponent(`TheFEYA enquiry: ${reason} — ${name.trim()}`);
    const body=encodeURIComponent(`Name: ${name.trim()}\nEmail: ${email.trim()}\nSubject: ${reason}\n\n${message.trim()}\n\nSent from the visitor's own email application.`);
    setPrepared(true);
    window.location.href=`mailto:manager.feya@gmail.com?subject=${subject}&body=${body}`;
  }
  return <form onSubmit={prepare} autoComplete="off" className="mt-5 grid gap-4" aria-label="Prepare email to TheFEYA">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-[12px] text-[#d8d1c5]">Your name
        <input className={base} required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Name"/>
      </label>
      <label className="flex flex-col gap-1.5 text-[12px] text-[#d8d1c5]">Your email
        <input className={base} type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
      </label>
    </div>
    <label className="flex flex-col gap-1.5 text-[12px] text-[#d8d1c5]">What can we help with?
      <select className={base} value={reason} onChange={e=>setReason(e.target.value)}>
        <option>Product or fit</option><option>Custom design adjustment</option><option>Existing order</option><option>Returns or delivery</option><option>Press or collaboration</option>
      </select>
    </label>
    <label className="flex flex-col gap-1.5 text-[12px] text-[#d8d1c5]">Your message
      <textarea className={base+' min-h-[130px]'} required minLength={5} maxLength={1800}
        value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell our studio what you need…"/>
    </label>
    <button type="submit" data-testid="contact-email-prepare" className="btn-chrome inline-flex w-fit max-w-full items-center gap-2"><Mail size={16}/> Open your email to send <Send size={14}/></button>
    <p className="text-[12px] leading-6 text-[var(--bone-dim)]" role="status">
      {prepared?'Your email app was opened. Send the message there to reach our team.':
      'Your message opens in your email app for you to send.'}
    </p>
  </form>;
}
