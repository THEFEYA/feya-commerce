import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {brandAwareTitle} from '../../lib/pageTitle.ts';

test('titles that already carry the brand bypass the "%s | TheFEYA" template', () => {
  assert.deepEqual(brandAwareTitle('Costume Belts & Statement Waist Pieces | TheFEYA'), {absolute: 'Costume Belts & Statement Waist Pieces | TheFEYA'});
  assert.deepEqual(brandAwareTitle('Contact TheFEYA '), {absolute: 'Contact TheFEYA'});
});

test('titles without the brand keep the layout template', () => {
  assert.equal(brandAwareTitle('Gold Warrior Armor Costume for Men'), 'Gold Warrior Armor Costume for Men');
  assert.equal(brandAwareTitle('TheFEYA studio notes'), 'TheFEYA studio notes');
});

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'admin' ? [] : pages(path);
    return name === 'page.tsx' ? [path] : [];
  });
}

test('no public page passes a brand-suffixed plain string title to the template', () => {
  // Excluded: Product OS visual-freeze surfaces and Search Wave A foundational
  // pages whose source blobs are pinned in the immutable release ledger
  // (supabase/migrations/20261001151500_phase12_foundational_page_versions_v2.sql).
  // Those need an owner-approved Version Ledger release, not a silent edit.
  const frozen = new Set([
    'app/collections/page.tsx', 'app/shop/[slug]/page.tsx', 'app/events-performance/page.tsx', 'app/style/page.tsx',
    'app/care/page.tsx', 'app/size-guide/page.tsx', 'app/contact/page.tsx',
  ].map(p => join(...p.split('/'))));
  const offenders = pages('app')
    .filter(path => !frozen.has(path))
    .filter(path => /^\s*title:\s?'[^'\n]*TheFEYA'/m.test(readFileSync(path, 'utf8')));
  assert.deepEqual(offenders, []);
  assert.match(readFileSync('app/collections/[slug]/page.tsx', 'utf8'), /title:brandAwareTitle\(content\?\.seo_title \|\| candidate\.title\)/);
});
