import Link from 'next/link';

export const revalidate = 300;

export default function MediaSeoPipelinePage() {
  return <main className="min-h-screen bg-[#07070A]"><section className="container-feya pt-10 pb-16"><div className="eyebrow-gold mb-3">Admin · Media SEO Pipeline</div><h1 className="font-tall text-bone leading-none" style={{ fontSize: 'clamp(44px,7vw,88px)' }}>Media SEO</h1><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--bone-dim)]">Media readiness screen for filenames, alt text, web export status, image sitemap and Pinterest readiness.</p><Link href="/admin/media" className="btn-ghost mt-6">Media QA</Link></section></main>;
}
