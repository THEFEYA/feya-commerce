'use client';

import { ProductDetailClient } from '@/components/ProductDetailClient';

export function SeoDraftStorefrontPreview({ product, draft }: { product: any; draft: any }) {
  return <section className="overflow-hidden rounded-2xl border border-[rgba(216,214,211,.15)] bg-[#09090c]">
    <div className="border-b border-[rgba(216,214,211,.12)] bg-[rgba(212,178,106,.055)] px-5 py-3 text-[11px] leading-relaxed text-[var(--gold-warm)]">
      Реалистичный внутренний предпросмотр использует тот же компонент, структуру, иконки, порядок блоков и стили, что и настоящая карточка товара. Покупка, сохранение, применение и публикация отключены.
    </div>
    <ProductDetailClient
      product={product}
      related={[]}
      draft={draft}
      previewMode
      embedded
    />
  </section>;
}
