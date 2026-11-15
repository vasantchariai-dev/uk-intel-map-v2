// Browser test: the map must show all ten regions on first load.
// Run with `npm run test:e2e` (builds first). Needs Chromium: `npx playwright install chromium`.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { preview } from 'vite';

const UK = { west: -8.7, east: 1.8, south: 49.8, north: 60.9 };
const SIZES = [
  [1366, 768],
  [1920, 1080],
  [390, 844],
  [768, 1024],
];

let server;
let browser;
let url;

before(async () => {
  server = await preview({ preview: { port: 4321, strictPort: false }, logLevel: 'silent' });
  url = server.resolvedUrls.local[0];
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await server?.close();
});

async function open(width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const problems = [];
  page.on('console', (m) => {
    if (/cannot fit/i.test(m.text())) problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(e.message));
  // The test must not depend on the basemap: block everything that is not local.
  await page.route((u) => !u.href.startsWith(url), (route) => route.abort());
  await page.goto(url);
  await page.waitForFunction(() => typeof window.mapView === 'function', null, { timeout: 30000 });
  return { page, problems };
}

function assertGoodView(view, problems, label) {
  const [lng, lat] = view.centre;
  assert.ok(lng > UK.west && lng < UK.east && lat > UK.south && lat < UK.north, `${label}: map centre ${lng}, ${lat} is outside the UK`);
  assert.ok(view.allRegionsVisible, `${label}: not all ten regions are in view`);
  assert.deepEqual(problems, [], `${label}: console problems`);
}

for (const [width, height] of SIZES) {
  test(`all ten regions are visible on first load at ${width}×${height}`, async () => {
    const { page, problems } = await open(width, height);
    assertGoodView(await page.evaluate(() => window.mapView()), problems, `${width}×${height}`);
    await page.close();
  });
}

test('the map recovers when it loads in a very small window that then grows', async () => {
  const { page, problems } = await open(300, 120);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForTimeout(500);
  assertGoodView(await page.evaluate(() => window.mapView()), problems, 'after resize');
  await page.close();
});

test('"All regions" restores the full view after opening a scheme', async () => {
  const { page, problems } = await open(390, 844);
  await page.goto(url + '#region=tv&scheme=tv-teesworks');
  await page.waitForTimeout(500);
  await page.click('[data-action="back"]');
  await page.click('[data-action="home"]');
  await page.waitForTimeout(1500);
  assertGoodView(await page.evaluate(() => window.mapView()), problems, 'after All regions');
  await page.close();
});
