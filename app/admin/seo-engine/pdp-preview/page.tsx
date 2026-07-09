// @ts-nocheck
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, FileText, Ruler, Scissors, Sparkles, Truck, RotateCcw } from 'lucide-react';
import { buildSeoBriefContractBundle } from '@/lib/seoBriefContractServer';
import { buildMockSeoAgentOutput } from '@/lib/seoAgentMockDraft';
import { validateSeoAgentOutput } from '@/lib/seoAgentOutputValidator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function param(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

function money(value, currency = 'EUR') {
  const amount = typeof value === 'number' ? value : Number(value || 0);
  if (!amount) return '€160';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function titleParts(title = '') {
  const [head, ...tail] = String(title || '').split(' – ');
  return { head: head || title || 'TheFEYA product', tail: tail.join(' – ') };
}

function textBlock(blocks, key, fallback = '') {
  const block = (blocks || []).find((item) => item.block_key === key);
  return block?.body || fallback;
}

function splitBody(value) {
  return String(value || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function BulletList({ children }) {
  return <div className="space-y-2 text-[14px] leading-relaxed text-[var(--bone-dim)]">{children}</div>;
}

function PreviewDetail({ icon, title, lines, id }) {
  return <div id={id} className="border-t border-[rgba(216,214,211,0.12)] py-5">
    <div className="eyebrow-gold mb-3 flex items-center gap-2">{icon}{title}</div>
    <div className="space-y-1.5 text-[14px] text-[var(--bone-dim)] leading-relaxed">{lines.filter(Boolean).map((line) => <p key={line}>{line}</p>)}</div>
  </div>;
}

function PdpLeftDescription({ draft, leftBlocks }) {
  const about = textBlock(leftBlocks, 'about_this_piece', draft.intro || 'This TheFEYA piece is prepared as a statement look for festival, stage and editorial styling.');
  const why = textBlock(leftBlocks, 'why_youll_love_it', 'Handmade to order, adjustable for a secure fit, bold in photos and on stage, and designed as a strong TheFEYA statement piece.');
  const ideal = textBlock(leftBlocks, 'ideal_for', 'Festival looks, stage styling, Burning Man outfits, photoshoots and statement performance wear.');
  const included = textBlock(leftBlocks, 'whats_included', 'Included components are taken from product options and original listing source.');
  const material = textBlock(leftBlocks, 'material', 'Material and finish must be checked against source data before publish.');

  return <div className="space-y-6 text-[15px] text-[var(--bone-dim)] leading-[1.8]">
    <div>
      <div className="eyebrow-gold mb-3">About this piece</div>
      <p>{about}</p>
    </div>
    <div>
      <h3 className="text-bone text-[16px] mb-2 tracking-[0.08em] uppercase">Why you’ll love it</h3>
      <BulletList>{splitBody(why).map((line) => <p key={line}>✓ {line}</p>)}</BulletList>
    </div>
    <div>
      <h3 className="text-bone text-[16px] mb-2 tracking-[0.08em] uppercase">Ideal for</h3>
      <BulletList>{splitBody(ideal).map((line) => <p key={line}>✓ {line}</p>)}</BulletList>
    </div>
    <div>
      <h3 className="text-bone text-[16px] mb-2 tracking-[0.08em] uppercase">What’s included</h3>
      <p>{included}</p>
    </div>
    <div>
      <h3 className="text-bone text-[16px] mb-2 tracking-[0.08em] uppercase">Material & finish</h3>
      <p>{material}</p>
    </div>
  </div>;
}

function CanonicalRightPanel() {
  return <div className="space-y-0">
    <PreviewDetail icon={<Scissors size={15} />} title="What’s included" lines={['Shown product configuration from product options.', 'TheFEYA dust bag.', 'Care card and replacement hardware kit.']} />
    <PreviewDetail icon={<Ruler size={15} />} title="Sizing & fit" lines={['Use the size chart on the product photos to choose your size.', 'Most pieces adjust with straps, so the fit can be tuned on the body.', 'Custom sizing by your measurements is available by request.']} />
    <PreviewDetail icon={<Truck size={15} />} title="Production & delivery" id="shipping" lines={['Standard made-to-order production: 3–5 business days.', 'Standard UPS shipping: 10–14 business days.', 'Express DHL shipping: 6–9 business days.', 'For a specific event date, contact us in advance to discuss priority production.']} />
    <PreviewDetail icon={<FileText size={15} />} title="Material & care" lines={['Vegan/faux leather with a glossy mirror finish when supported by product data.', 'Easy to clean by hand with alcohol wipes or mild cleaning products.', 'Machine washing is not recommended.', 'Store carefully on a hanger and avoid long-term heavy pressure so the piece keeps its shape for years.']} />
    <PreviewDetail icon={<Sparkles size={15} />} title="Customization" lines={['Color, length, coverage or combinations with existing TheFEYA designs can be discussed.', 'Individual design work is possible only when the idea stays within TheFEYA style.']} />
    <PreviewDetail icon={<RotateCcw size={15} />} title="Returns & exchanges" id="returns" lines={['Standard-size pieces follow store policy.', 'Detailed cancellation, exchange and return rules will link to the store policy page.']} />
    <PreviewDetail icon={<CheckCircle2 size={15} />} title="Handmade variation" id="policies" lines={['Every TheFEYA piece is made by hand.', 'Small natural differences in shape, detail or shade can appear because each piece is made individually.']} />
  </div>;
}

export default async function SeoPdpVisualPreviewPage({ searchParams }) {
  const params = await searchParams;
  const productId = param(params?.product_id || params?.product).trim();
  const bundle = await buildSeoBriefContractBundle(productId);
  const product = bundle.product || null;
  const brief = bundle.brief || null;
  const seoPackDraft = bundle.seoPackDraft || null;
  const mockDraft = bundle.aiAgentInput ? buildMockSeoAgentOutput(bundle.aiAgentInput, brief) : null;
  const validation = mockDraft ? validateSeoAgentOutput(mockDraft) : null;

  if (!product || !brief || !seoPackDraft || !mockDraft) {
    return <main className="min-h-screen bg-[#07070A] text-bone">
      <section className="container-feya py-12">
        <Link href={`/admin/seo-engine/draft-preview?product_id=${productId}`} className="btn-ghost mb-6">Назад к draft preview</Link>
        <div className="rounded-2xl border border-[rgba(196,64,88,.35)] bg-[rgba(160,32,56,.10)] p-5 text-[var(--ruby-soft)]">Не удалось собрать визуальный PDP-preview. Проверь product_id и SEO-бриф.</div>
      </section>
    </main>;
  }

  const title = mockDraft.h1 || brief.productTitle || product.card_title || product.title || 'TheFEYA product';
  const { head, tail } = titleParts(title);
  const leftBlocks = (mockDraft.pdp_blocks || []).filter((block) => block.placement === 'left_description');
  const image = product.primary_image_url || product.secondary_image_url || product.hover_image_url || '';
  const currency = product.currency || 'EUR';
  const price = product.full_set_display_price_amount || product.max_price || product.min_price || 160;
  const optionLabel = product.configurations?.[0]?.public_label || product.configurations?.[0]?.label || 'Shoulders';
  const color = product.color || 'Gold';

  return <main className="relative min-h-screen bg-[radial-gradient(circle_at_78%_0%,rgba(212,178,106,.12),transparent_34%),linear-gradient(180deg,#07070A,#111016_46%,#07070A)] text-bone">
    <section className="container-feya pt-7 pb-5 border-b border-[rgba(216,214,211,.12)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow-gold mb-2">SEO PDP visual preview · draft-only</div>
          <h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(34px,5vw,64px)' }}>Визуальная проверка карточки</h1>
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-[var(--bone-dim)]">Это не storefront publish. Это визуальный предпросмотр того, как SEO-черновик ляжет в реальную структуру товара: hero, цена, options, левый основной текст и правая каноническая колонка.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/seo-engine/draft-preview?product_id=${productId}`} className="btn-ghost">Назад к техническому preview <ArrowUpRight size={13} /></Link>
          {product.product_slug ? <Link href={`/shop/${product.product_slug}`} className="btn-ghost" target="_blank">Открыть текущий товар <ArrowUpRight size={13} /></Link> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="chip">source: baseline/mock</span>
        <span className="chip">validator: {validation?.status || 'unknown'}</span>
        <span className="chip">без публикации</span>
        <span className="chip">без изменения товара</span>
        <span className="chip">перед финалом нужны research-файлы</span>
      </div>
    </section>

    <section className="container-feya py-5 grid grid-cols-12 gap-5 lg:gap-7">
      <div className="col-span-12 lg:col-span-7 grid grid-cols-12 gap-3 lg:gap-4">
        <div className="col-span-2 hidden lg:flex flex-col gap-3 max-h-[650px] overflow-y-auto pr-1">
          {[image, product.secondary_image_url, product.hover_image_url].filter(Boolean).slice(0, 5).map((url, index) => <div key={`${url}-${index}`} className={`relative w-full aspect-[4/5] rounded-sm overflow-hidden border shrink-0 bg-[rgba(255,255,255,0.025)] ${index === 0 ? 'border-white opacity-100' : 'border-[rgba(216,214,211,0.12)] opacity-55'}`}>
            <img src={String(url)} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
          </div>)}
        </div>
        <div className="col-span-12 lg:col-span-10 flex justify-center">
          <div className="relative w-full max-w-[520px] aspect-[4/5] rounded-md overflow-hidden bg-[rgba(255,255,255,0.025)] border border-[rgba(216,214,211,0.12)] text-left">
            {image ? <img src={String(image)} alt={mockDraft.image_alt_candidates?.[0]?.alt_text || head} className="absolute inset-0 w-full h-full object-cover object-center" /> : <div className="absolute inset-0 flex items-center justify-center text-[12px] text-[var(--bone-dim)]">нет фото</div>}
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/55 backdrop-blur text-xs text-white">preview</span>
          </div>
        </div>
      </div>

      <aside className="col-span-12 lg:col-span-5 lg:sticky lg:top-[104px] self-start">
        <h1 className="font-tall text-bone leading-[0.98] tracking-[0.01em] line-clamp-2" style={{ fontSize: 'clamp(28px, 2.8vw, 38px)' }}>{head}</h1>
        {tail ? <p className="editorial-italic text-[var(--bone-dim)] text-[12px] mt-1 leading-relaxed line-clamp-1">{tail}</p> : null}
        <div className="mt-3 font-price text-gold-grad text-[42px] leading-none">{money(price, currency)}</div>

        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5"><div className="eyebrow text-[10px]">Configuration</div><div className="eyebrow-dim">preview</div></div>
          <div className="w-full h-10 rounded-md bg-[rgba(255,255,255,0.035)] border border-[rgba(216,214,211,0.18)] text-bone px-4 flex items-center justify-between text-left"><span className="truncate">{optionLabel}</span></div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5"><div className="eyebrow text-[10px]">Color · {color}</div><div className="eyebrow-dim">preview</div></div>
          <div className="w-8 h-8 rounded-full border-2 border-white bg-[radial-gradient(circle_at_30%_30%,#fff7cf,#d4b26a_48%,#7a5a1d)]" />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5"><div className="eyebrow text-[10px]">Size · M</div><span className="eyebrow-dim flex items-center gap-1"><Ruler size={12} /> Size guide</span></div>
          <div className="flex flex-wrap gap-1.5">{['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Custom'].map((size) => <span key={size} className={`size-pill ${size === 'M' ? 'size-pill-active' : ''}`}>{size}</span>)}</div>
        </div>

        <div className="mt-3 rounded-md border border-[rgba(216,214,211,.10)] bg-[rgba(255,255,255,.018)] px-3 py-2 text-[11px] text-[var(--bone-dim)]">Shipping method and delivery dates are selected in the cart.</div>
        <div className="mt-3 border-t border-[rgba(216,214,211,0.12)] pt-3 flex items-end justify-between"><div className="eyebrow text-[10px]">Total · 1 × {money(price, currency)}</div><div className="font-price text-gold-grad text-[29px] leading-none">{money(price, currency)}</div></div>
        <div className="mt-2 grid grid-cols-[112px_1fr] gap-2.5"><div className="h-10 rounded-md border border-[rgba(216,214,211,0.18)] grid grid-cols-3 items-center text-center"><span>−</span><span>1</span><span>+</span></div><button className="btn-chrome justify-center rounded-md h-10" disabled>Add to bag</button></div>
        <button className="btn-gold justify-center rounded-md h-10 w-full mt-2" disabled>Buy it now <ArrowUpRight size={13} /></button>
      </aside>
    </section>

    <section id="description" className="container-feya py-8 border-t border-[rgba(216,214,211,0.12)] grid grid-cols-12 gap-7">
      <div className="col-span-12 lg:col-span-7">
        <div className="eyebrow-gold mb-3">Generated left PDP description</div>
        <h2 className="display-section text-bone mb-5" style={{ fontSize: 'clamp(24px, 2.3vw, 34px)' }}>{head}</h2>
        <PdpLeftDescription draft={mockDraft} leftBlocks={leftBlocks} />
      </div>
      <div className="col-span-12 lg:col-span-5"><CanonicalRightPanel /></div>
    </section>

    <section className="container-feya py-8 border-t border-[rgba(216,214,211,0.12)]">
      <div className="rounded-2xl border border-[rgba(212,178,106,.26)] bg-[rgba(212,178,106,.06)] p-4 text-[12px] leading-relaxed text-[var(--bone-dim)]">
        Следующий инженерный шаг: этот визуальный preview подключается к сохранённому OpenAI draft output, а не только к baseline/mock. После этого можно будет генерировать AI-черновик, сохранять его в очередь проверки и открывать именно эту визуальную страницу для одобрения/правок перед apply-to-product.
      </div>
    </section>
  </main>;
}
