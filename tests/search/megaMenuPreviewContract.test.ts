import assert from 'node:assert/strict';
import test from 'node:test';
import { STOREFRONT_NAVIGATION_PANELS } from '../../config/storefrontNavigation.ts';
import {
  EVENTS_PERFORMANCE_MEGA_PREVIEWS,
  SHOP_MEGA_PREVIEWS,
  STYLE_MEGA_PREVIEWS,
} from '../../config/megaMenuPresentation.ts';

function enabledClickableLabels(panelCode: string) {
  const panel = STOREFRONT_NAVIGATION_PANELS[panelCode];
  const labels: string[] = [];
  for (const group of panel.groups) {
    labels.push(group.label);
    for (const item of group.items) {
      if (item.enabled && item.href) labels.push(item.label);
      for (const child of item.children || []) {
        if (child.enabled && child.href) labels.push(child.label);
      }
    }
  }
  return labels;
}

test('Shop mega-menu has curated visual previews for every live clickable shopper path', () => {
  const missing = enabledClickableLabels('shop').filter((label) => !SHOP_MEGA_PREVIEWS[label]);
  assert.deepEqual(missing, []);
});

test('Events & Performance mega-menu has visual previews for every live path', () => {
  const missing = enabledClickableLabels('events_performance').filter((label) => !EVENTS_PERFORMANCE_MEGA_PREVIEWS[label]);
  assert.deepEqual(missing, []);
});

test('Style mega-menu has visual previews for every style and persona item', () => {
  const panel = STOREFRONT_NAVIGATION_PANELS.style;
  const labels = panel.groups.flatMap((group) => group.items.filter((item) => item.enabled && item.href).map((item) => item.label));
  const missing = labels.filter((label) => !STYLE_MEGA_PREVIEWS[label]);
  assert.deepEqual(missing, []);
});

test('all mega preview assets resolve to real storefront product routes instead of decorative-only placeholders', () => {
  for (const map of [SHOP_MEGA_PREVIEWS, EVENTS_PERFORMANCE_MEGA_PREVIEWS, STYLE_MEGA_PREVIEWS]) {
    for (const preview of Object.values(map)) {
      assert.match(preview.productId, /^[0-9a-f-]{36}$/i);
      assert.ok(preview.productSlug.length > 20);
      assert.match(preview.imageUrl, /^https:\/\//);
    }
  }
});
