import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Next.js 16.3.8 packages/next/src/shared/lib/router/utils/html-bots.ts.
// Representative names for every default matcher replaced by htmlLimitedBots.
const NEXT_16_3_8_DEFAULT_HTML_LIMITED_BOTS = [
  'AdsBot-Google', 'Google-InspectionTool', 'Chrome-Lighthouse', 'Slurp', 'DuckDuckBot',
  'baiduspider', 'yandex', 'sogou', 'bitlybot', 'tumblr', 'vkShare',
  'quora link preview', 'redditbot', 'ia_archiver', 'Bingbot', 'BingPreview',
  'applebot', 'facebookexternalhit', 'facebookcatalog', 'Twitterbot',
  'LinkedInBot', 'Slackbot', 'Discordbot', 'WhatsApp', 'SkypeUriPreview', 'Yeti',
  'googleweblight',
];

function configuredHtmlLimitedBots() {
  const config = readFileSync(new URL('../../next.config.ts', import.meta.url), 'utf8');
  const match = config.match(/^\s*htmlLimitedBots:\s*\/(.+)\/([a-z]*),\s*$/m);
  assert.ok(match, 'next.config.ts must declare htmlLimitedBots as a regex literal');
  return {
    runtime: new RegExp(match[1], match[2]),
    wholeHeader: new RegExp(`^(?:${match[1]})$`, match[2]),
  };
}

test('full crawler user agents select blocking metadata in Next and bypass the prerendered shell', () => {
  const { runtime, wholeHeader } = configuredHtmlLimitedBots();
  for (const ua of [
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.139 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/131.0.6778.139 Safari/537.36',
    'Googlebot-Image/1.0',
    'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)',
    'Mozilla/5.0 (X11; Linux x86_64; Storebot-Google/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
  ]) {
    assert.ok(runtime.test(ua), ua);
    assert.ok(wholeHeader.test(ua), `prerender bypass: ${ua}`);
  }
});

test('ordinary visitors keep streaming metadata', () => {
  const { runtime, wholeHeader } = configuredHtmlLimitedBots();
  for (const ua of [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  ]) {
    assert.equal(runtime.test(ua), false, ua);
    assert.equal(wholeHeader.test(ua), false, ua);
  }
});

test('override keeps every Next.js 16.3.8 default html-limited bot', () => {
  const { runtime, wholeHeader } = configuredHtmlLimitedBots();
  for (const bot of NEXT_16_3_8_DEFAULT_HTML_LIMITED_BOTS) {
    const ua = `Mozilla/5.0 (compatible; ${bot}/1.0)`;
    assert.ok(runtime.test(ua), ua);
    assert.ok(wholeHeader.test(ua), ua);
  }
});
