export const instant = false;

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import catalog from '@/config/bonanzaColorReviewCatalog20261020.json';
import reviewed from '@/config/bonanzaReviewedColors20261011.json';
import overrides from '@/config/bonanzaColorDisplayOverrides.json';
import { OwnerColorDefaultsReview } from '@/components/OwnerColorDefaultsReview';

export const metadata: Metadata = {
  title: 'Проверка исходных цветов — TheFEYA',
  robots: { index: false, follow: false, noarchive: true },
};

/** Owner's private Vercel Preview, not a public Production / admin bypass. */
function isAuthorizedColorReviewPreview() {
  return process.env.VERCEL === '1'
    && process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_PROJECT_ID === 'prj_ePIymo4sUG33wrRjHBxWrSlaxPID'
    && process.env.VERCEL_GIT_COMMIT_REF === 'work/bonanza-color-variants-20261020'
    && process.env.FEYA_OWNER_PREVIEW_DISABLED !== 'true';
}

export default async function ColorDefaultReviewPage() {
  await connection();
  if (!isAuthorizedColorReviewPreview()) notFound();

  const map = reviewed.products as Record<string,{colors:string[];held:boolean}>;
  if (catalog.count !== 207 || Object.keys(map).length !== 207
    || catalog.products.length !== 207
    || new Set(catalog.products.map(p=>p.id)).size !== 207
    || catalog.products.some(p=>!map[p.id])) {
    throw new Error('OWNER_COLOR_REVIEW_SOURCE_MISMATCH');
  }

  const rows = catalog.products.map(p => ({
    ...p,
    choices: map[p.id].colors,
    held: map[p.id].held,
  }));
  return <OwnerColorDefaultsReview
    rows={rows}
    appliedDefaults={overrides.products as Record<string,{primary:string;filter_colors:string[]}>}
  />;
}
