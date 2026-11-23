'use client';

import {useEffect, useRef, useState, type FormEvent} from 'react';
import {
  readWithdrawalReceipt, withdrawalAttempt, withdrawalReceiptText,
  type GuestWithdrawalReceipt, type WithdrawalAttempt, type WithdrawalFields,
} from '@/lib/withdrawal/browser';
import {validWithdrawalEmail, WITHDRAWAL_DECLARATION} from '@/lib/withdrawal/contract';
import styles from './GuestWithdrawal.module.css';

const inputStyle = 'mt-1 block min-h-11 w-full rounded-lg border border-white/25 bg-[#101015] px-3 py-2 text-base text-bone focus-visible:outline-2 focus-visible:outline-[#d4b26a]';
const linkStyle = 'break-all text-bone underline underline-offset-4';
const emptyFields: WithdrawalFields = {name: '', order_number: '', email: ''};

export function GuestWithdrawal({seller, email}: {seller: string; email: string}) {
  const [step, setStep] = useState<'closed' | 'details' | 'review' | 'receipt'>('closed');
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
      emailInput.setCustomValidity('Enter a full email address for your acknowledgement.');
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
      attempt.current = await withdrawalAttempt(fields, attempt.current);
      const response = await fetch('/api/withdrawal', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: {'Content-Type': 'application/json'}, signal: controller.signal,
        body: JSON.stringify({...fields, idempotency_key: attempt.current.key, confirm: true}),
      });
      if (!response.ok) {
        if (response.status === 400) setError('Please edit your details and check the three fields.');
        else if (response.status === 429) setError('Please wait a moment before trying again. You can also send your notice by email now.');
        else if (response.status === 409) setError('We could not confirm these details for this submission. You can send your notice by email now.');
        else throw new Error('Receipt unavailable');
        return;
      }
      const saved = readWithdrawalReceipt(await response.json());
      if (!saved) throw new Error('Receipt unavailable');
      setReceipt(saved);
      setStep('receipt');
    } catch {
      setError('We could not confirm receipt. Try again with the same details, or email your notice now.');
    } finally {
      window.clearTimeout(timer);
      busy.current = false;
      setSending(false);
    }
  }

  const mailto = 'mailto:' + email + '?subject=TheFEYA%20withdrawal%20notice';
  const receiptText = receipt ? withdrawalReceiptText(fields, receipt, seller) : '';

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
      setCopyStatus('Receipt copied.');
    } catch {
      setCopyStatus('Select the receipt text to copy it, or use Download receipt.');
    }
  }

  if (step === 'closed') return <div className="mt-5">
    <button type="button" className="btn-gold" onClick={() => setStep('details')}>Withdraw from contract here</button>
    <noscript><p className="mt-2">You can email your notice to <a className={linkStyle} href={mailto}>{email}</a>.</p></noscript>
  </div>;

  return <div className="mt-5 max-w-xl rounded-xl border border-white/20 p-4 text-[15px] leading-6 text-[var(--bone-dim)] sm:p-6">
    {step === 'details' && <form onSubmit={review}>
      <h2 className="text-xl text-bone">Withdraw from your purchase</h2>
      <p className="mt-2">Identify your purchase and choose the email address for your acknowledgement.</p>
      <div className="mt-4 space-y-4">
        <label className="block">Your name
          <input ref={nameInput} className={inputStyle} name="name" autoComplete="name" maxLength={120}
            required pattern={'.*\\S.*'} value={fields.name} onChange={e => setFields({...fields, name: e.target.value})}/>
        </label>
        <label className="block">Order number or other identifying details
          <input className={inputStyle} name="order_number" maxLength={240} required pattern={'.*\\S.*'}
            aria-describedby="withdrawal-order-hint" value={fields.order_number} onChange={e => setFields({...fields, order_number: e.target.value})}/>
          <span id="withdrawal-order-hint" className="mt-1 block text-sm">You can use the item name and order date if you do not have the order number.</span>
        </label>
        <label className="block">Email for your acknowledgement
          <input className={inputStyle} name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254}
            value={fields.email} onChange={e => {e.target.setCustomValidity(''); setFields({...fields, email: e.target.value});}}/>
        </label>
      </div>
      <button type="submit" className="btn-gold mt-5">Review withdrawal</button>
    </form>}

    {step === 'review' && <form onSubmit={confirm} aria-busy={sending}>
      <h2 ref={heading} tabIndex={-1} className="text-xl text-bone">Review your withdrawal</h2>
      <p className="mt-2">{WITHDRAWAL_DECLARATION}</p>
      <dl className="mt-4 space-y-2 break-words">
        <div><dt className="text-sm">Name</dt><dd className="text-bone">{fields.name}</dd></div>
        <div><dt className="text-sm">Order or purchase</dt><dd className="text-bone">{fields.order_number}</dd></div>
        <div><dt className="text-sm">Acknowledgement email</dt><dd className="break-all text-bone">{fields.email}</dd></div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" className="btn-gold" disabled={sending}>Confirm withdrawal</button>
        <button type="button" className="btn-ghost" disabled={sending} onClick={() => {setError(''); setStep('details');}}>Edit details</button>
      </div>
      {sending && <p role="status" className="mt-3">Sending your statement…</p>}
      {error && <p role="alert" className="mt-3 text-bone">{error}{' '}<a className={linkStyle} href={mailto}>{email}</a></p>}
    </form>}

    {step === 'receipt' && receipt && <div>
      <h2 ref={heading} tabIndex={-1} className="text-xl text-bone">Withdrawal statement received</h2>
      <p className="mt-2 break-words">{receipt.acknowledgement === 'sent'
        ? 'An acknowledgement has been sent to ' + fields.email + '.'
        : 'You can save a copy of your statement and its submission time below.'}</p>
      <pre className={styles.receipt + ' mt-4 whitespace-pre-wrap break-words font-sans text-bone [overflow-wrap:anywhere]'}>{receiptText}</pre>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn-ghost" onClick={downloadReceipt}>Download receipt</button>
        <button type="button" className="btn-ghost" onClick={copyReceipt}>Copy receipt</button>
        <button type="button" className="btn-ghost" onClick={() => window.print()}>Print receipt</button>
      </div>
      <p role="status" className="mt-1">{copyStatus}</p>
    </div>}
  </div>;
}
