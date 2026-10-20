import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {BONANZA_COLOR_PARTS,constituentColors,inferredDefaultColorCode} from '../../lib/bonanzaColorChoices.ts';

test('private owner HTML review has 207 exact photo IDs and accepts only genuine selected colorways',()=>{
  const meta=JSON.parse(readFileSync('config/bonanzaColorReviewCatalog20261020.json','utf8'));
  const choices=JSON.parse(readFileSync('config/bonanzaReviewedColors20261011.json','utf8'));
  assert.equal(meta.schema,'feya-owner-color-review-catalog-v1');
  assert.equal(meta.products.length,207);
  assert.equal(meta.count,207);
  assert.equal(new Set(meta.products.map((r:any)=>r.id)).size,207);
  assert.equal(Object.keys(choices.products).length,207);
  for(const row of meta.products){
    assert.ok(row.id in choices.products);
    assert.match(row.image,/^https:\/\//);
    assert.match(row.slug,/^[a-z0-9-]+$/);
    for(const code of choices.products[row.id].colors)assert.ok(code in BONANZA_COLOR_PARTS);
  }
  const red=meta.products.find((r:any)=>r.slug.includes('4389332118'));
  assert.ok(red);
  assert.deepEqual(choices.products[red.id].colors,['black_gold','black_silver','white_gold','white_silver','black_red']);
  assert.equal(inferredDefaultColorCode(red.title,choices.products[red.id].colors),'black_red');
  assert.deepEqual(constituentColors(['black_red']),['Black','Red']);
});

test('owner photo review is private preview only and cannot write the database or public copy',()=>{
  const page=readFileSync('app/color-review/page.tsx','utf8');
  const client=readFileSync('components/OwnerColorDefaultsReview.tsx','utf8');
  const overlay=readFileSync('lib/bonanzaColorCatalogServer.ts','utf8');
  assert.match(page,/VERCEL_ENV === 'preview'/);
  assert.match(page,/VERCEL_PROJECT_ID === 'prj_ePIymo4sUG33wrRjHBxWrSlaxPID'/);
  assert.match(page,/notFound\(\)/);
  assert.match(page,/robots: \{ index: false/);
  assert.match(client,/localStorage\.setItem/);
  assert.match(client,/TheFEYA-Approved-Default-Colors\.json/);
  assert.match(client,/verifySelections/);
  assert.match(overlay,/bonanzaColorDisplayOverrides\.json/);
  for(const raw of [client,page,overlay]){
    assert.doesNotMatch(raw,/\.insert\(|\.update\(|\.upsert\(|\.delete\(|SUPABASE_SERVICE_ROLE_KEY/);
  }
});

test('PDP requires deliberate size, auto-selects approved full set and preserves single option convenience',()=>{
  const page=readFileSync('components/ProductDetailClient.tsx','utf8');
  assert.match(page,/options\.length === 1 \? optionKey\(options\[0\], 0\) : ''/);
  assert.match(page,/const \[size, setSize\] = useState\(''\)/);
  assert.match(page,/if \(!activeConfig \|\| \(pricedColors!==null && !pricedColors\.some/);
  assert.match(page,/\|\| \(isCoupleSet \? !womenSize \|\| !menSize : !size\)/);
  assert.match(page,/\|\| customMeasurementSelectionNeedsReview\(sizingSelection,customMeasurementsEnabled\)/);
  assert.match(page,/\{options\.length > 1 && pricedColors===null \? <div/);
  assert.match(page,/role="radiogroup" aria-label="Select a complete colorway"/);
  assert.match(page,/color_code: selectedColorCode/);
  assert.doesNotMatch(page,/setColorIdx\(i\).*setQty\(/);
});
