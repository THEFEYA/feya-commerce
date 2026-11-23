'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import {
  readWithdrawalReceipt, withdrawalAttempt, withdrawalReceiptText,
  type GuestWithdrawalReceipt, type WithdrawalAttempt, type WithdrawalFields,
} from '@/lib/withdrawal/browser';
import {validWithdrawalEmail} from '@/lib/withdrawal/contract';
import {isWithdrawalLanguage, withdrawalCopy, type WithdrawalLanguage} from '@/lib/withdrawal/language';
import styles from './GuestWithdrawal.module.css';

const inputStyle = 'mt-1 block min-h-11 w-full rounded-lg border border-white/25 bg-[#101015] px-3 py-2 text-base text-bone focus-visible:outline-2 focus-visible:outline-[#d4b26a]';
const linkStyle = 'break-all text-bone underline underline-offset-4';
const emptyFields: WithdrawalFields = {name: '', order_number: '', email: ''};

export function GuestWithdrawal({seller, email}: {seller: string; email: string}) {
  const [step, setStep] = useState<'closed' | 'details' | 'review' | 'receipt'>('closed');
  const [language, setLanguage] = useState<WithdrawalLanguage>('en');
  const words = withdrawalCopy[language];
  const [fields, setFields] = useState<WithdrawalFields>(emptyFields);
  const [receipt, setReceipt] = useState<GuestWithdrawalReceipt | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const attempt = useRef<WithdrawalAttempt | null>(null);
  const busy = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step === 'details') nameInput.current?.focus();
    if (step === 'review' || step === 'receipt') heading.current?.focus();
  }, [step]);

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailInput = event.currentTarget.elements.namedItem('email') as HTMLInputElement;
    if (!validWithdrawalEmail(fields.email.trim())) {
      emailInput.setCustomValidity(words.emailError);
      emailInput.reportValidity();
      return;
    }
    setFields({name: fields.name.trim(), order_number: fields.order_number.trim(), email: fields.email.trim()});
    setError('');
    setStep('review');
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || step !== 'review') return;
    busy.current = true;
    setSending(true);
    setError('');
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20_000);
    try {
      attempt.current = await withdrawalAttempt(fields, attempt.current, language);
      const response = await fetch('/api/withdrawal', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: {'Content-Type': 'application/json'}, signal: controller.signal,
        body: JSON.stringify({...fields, language, idempotency_key: attempt.current.key, confirm: true}),
      });
      if (!response.ok) {
        if (response.status === 400) setError(words.invalid);
        else if (response.status === 429) setError(words.wait);
        else if (response.status === 409) setError(words.conflict);
        else throw new Error('Receipt unavailable');
        return;
      }
      const saved = readWithdrawalReceipt(await response.json());
      if (!saved) throw new Error('Receipt unavailable');
      setReceipt(saved);
      setStep('receipt');
    } catch {
      setError(words.failed);
    } finally {
      window.clearTimeout(timer);
      busy.current = false;
      setSending(false);
    }
  }

  const mailto = 'mailto:' + email + '?subject=TheFEYA%20withdrawal%20notice';
  const receiptText = receipt ? withdrawalReceiptText(fields, receipt, seller, language) : '';

  function downloadReceipt() {
    const url = URL.createObjectURL(new Blob([receiptText], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'thefeya-withdrawal-receipt.txt';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyReceipt() {
    try {
      await navigator.clipboard.writeText(receiptText);
      setCopyStatus(words.copied);
    } catch {
      setCopyStatus(words.copyFailed);
    }
  }

  if (step === 'closed') return <div lang={language} className="mt-5">
    <label className="mb-3 block text-sm text-bone">{words.language}
      <select className={inputStyle + ' max-w-xs'} value={language} onChange={event => {
        if (isWithdrawalLanguage(event.target.value)) setLanguage(event.target.value);
      }}>
        <option lang="en" value="en">English</option>
        <option lang="nl" value="nl">Nederlands</option>
        <option lang="de" value="de">Deutsch</option>
      </select>
    </label>
    <button type="button" className="btn-gold" onClick={() => setStep('details')}>{words.start}</button>
    <noscript><p className="mt-2">{words.direct} <a className={linkStyle} href={mailto}>{email}</a>.</p></noscript>
  </div>;

  return <div lang={language} className="mt-5 max-w-xl rounded-xl border border-white/20 p-4 text-[15px] leading-6 text-[var(--bone-dim)] sm:p-6">
    {step === 'details' && <form onSubmit={review}>
      <h2 className="text-xl text-bone">{words.start}</h2>
      <p className="mt-2">{words.intro}</p>
      <div className="mt-4 space-y-4">
        <label className="block">{words.name}
          <input ref={nameInput} className={inputStyle} name="name" autoComplete="name" maxLength={120}
            required pattern={'.*\\S.*'} value={fields.name} onChange={e => setFields({...fields, name: e.target.value})}/>
        </label>
        <label className="block">{words.contract}
          <input className={inputStyle} name="order_number" maxLength={240} required pattern={'.*\\S.*'}
            aria-describedby="withdrawal-order-hint" value={fields.order_number} onChange={e => setFields({...fields, order_number: e.target.value})}/>
          <span id="withdrawal-order-hint" className="mt-1 block text-sm">{words.hint}</span>
        </label>
        <label className="block">{words.email}
          <input className={inputStyle} name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254}
            value={fields.email} onChange={e => {e.target.setCustomValidity(''); setFields({...fields, email: e.target.value});}}/>
        </label>
      </div>
      <p className="mt-3 text-sm"><a className="text-bone underline underline-offset-4" href="/privacy#withdrawal-statements">{words.privacy}</a></p>
      <button type="submit" className="btn-gold mt-5">{words.review}</button>
    </form>}

    {step === 'review' && <form onSubmit={confirm} aria-busy={sending}>
      <h2 ref={heading} tabIndex={-1} className="text-xl text-bone">{words.review}</h2>
      <p className="mt-2">{words.declaration}</p>
      <dl className="mt-4 space-y-2 break-words">
        <div><dt className="text-sm">{words.name}</dt><dd className="text-bone">{fields.name}</dd></div>
        <div><dt className="text-sm">{words.order}</dt><dd className="text-bone">{fields.order_number}</dd></div>
        <div><dt className="text-sm">{words.email}</dt><dd className="break-all text-bone">{fields.email}</dd></div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" className="btn-gold" disabled={sending}>{words.confirm}</button>
        <button type="button" className="btn-ghost" disabled={sending} onClick={() => {setError(''); setStep('details');}}>{words.edit}</button>
      </div>
      {sending && <p role="status" className="mt-3">{words.sending}</p>}
      {error && <p role="alert" className="mt-3 text-bone">{error}{' '}<a className={linkStyle} href={mailto}>{email}</a></p>}
    </form>}

    {step === 'receipt' && receipt && <div>
      <h2 ref={heading} tabIndex={-1} className="text-xl text-bone">{words.received}</h2>
      <p className="mt-2 break-words">{receipt.acknowledgement === 'sent'
        ? words.notified + ' ' + fields.email + '.'
        : words.saved}</p>
      <pre className={styles.receipt + ' mt-4 whitespace-pre-wrap break-words font-sans text-bone [overflow-wrap:anywhere]'}>{receiptText}</pre>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn-ghost" onClick={downloadReceipt}>{words.download}</button>
        <button type="button" className="btn-ghost" onClick={copyReceipt}>{words.copy}</button>
        <button type="button" className="btn-ghost" onClick={() => window.print()}>{words.print}</button>
      </div>
      <p role="status" className="mt-1">{copyStatus}</p>
    </div>}
  </div>;
}
