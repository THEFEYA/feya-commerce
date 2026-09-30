import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {publicPrimaryNavigation,STOREFRONT_NAVIGATION_PANELS} from '../../config/storefrontNavigation.ts';

test('Phase 8 desktop parents are real links with adjacent disclosure buttons',()=>{
  const header=readFileSync('components/Header.tsx','utf8');
  assert.match(header,/aria-label="Main"/);
  assert.match(header,/submenu/);
  assert.match(header,/aria-controls=\{\`nav-panel-\${panelCode}\`\}/);
  assert.match(header,/aria-expanded=\{expanded\}/);
  assert.match(header,/schedulePanelOpen\(panelCode\)/);
  assert.match(header,/openPanel !== panelCode \? 80 : 320/);
  assert.match(header,/setTimeout\(\(\) => setOpenPanel\(null\), 300\)/);
});

test('mega-menu and mobile drawer links stay in rendered markup while disclosures hide visually',()=>{
  const header=readFileSync('components/Header.tsx','utf8');
  assert.match(header,/primaryNavigation\.filter\(\(item\) => 'panel' in item/);
  assert.match(header,/aria-hidden=\{!expanded\}/);
  assert.doesNotMatch(header,/\{panel && groups\.length > 0 \?/);
  assert.match(header,/id="mobile-site-navigation"/);
  assert.match(header,/role="dialog"/);
  assert.match(header,/aria-modal="true"/);
  assert.doesNotMatch(header,/\{mobileOpen && \(/);
});

test('mobile navigation has accordion disclosure, View-all destination and focus trap',()=>{
  const header=readFileSync('components/Header.tsx','utf8');
  assert.match(header,/aria-controls=\{mobilePanelId\}/);
  assert.match(header,/Shop all/);
  assert.match(header,/View all/);
  assert.match(header,/mobileDialogRef/);
  assert.match(header,/event\.key !== 'Tab'/);
  assert.match(header,/mobileMenuButtonRef\.current\?\.focus\(\)/);
});

test('top-level destinations follow the Phase 8 hub contract',()=>{
  const primary=publicPrimaryNavigation();
  assert.equal(primary.find((item)=>item.code==='shop')?.href,'/shop');
  assert.equal(primary.find((item)=>item.code==='events_performance')?.href,'/events-performance');
  assert.equal(primary.find((item)=>item.code==='style')?.href,'/style');
  assert.ok(STOREFRONT_NAVIGATION_PANELS.events_performance.groups.length>0);
  assert.ok(STOREFRONT_NAVIGATION_PANELS.style.groups.length>0);
});
