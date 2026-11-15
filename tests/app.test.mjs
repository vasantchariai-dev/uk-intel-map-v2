// Browser tests. Run with `npm run test:e2e` (builds first).
// Needs Chromium once: `npx playwright install chromium`.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { preview } from 'vite';

const UK = { west: -8.7, east: 1.8, south: 49.8, north: 60.9 };
const SIZES = [
  [1366, 768],
  [1920, 1080],
  [390, 844],
  [768, 1024],
];
const schemes = JSON.parse(readFileSync('data/schemes.json', 'utf8')).schemes;
const assets = JSON.parse(readFileSync('data/assets.json', 'utf8')).assets;
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

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

async function open(width, height, hash = '') {
  const page = await browser.newPage({ viewport: { width, height }, acceptDownloads: true });
  const problems = [];
  page.on('console', (m) => {
    if (/cannot fit/i.test(m.text())) problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(e.message));
  // The tests must not depend on the basemap: block everything that is not local.
  await page.route((u) => !u.href.startsWith(url) && !u.href.startsWith('blob:'), (route) => route.abort());
  await page.goto(url + hash);
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
  const { page, problems } = await open(390, 844, '#region=tv&scheme=tv-teesworks');
  await page.click('#sheet-button');
  await page.click('[data-action="back"]');
  await page.click('[data-action="home"]');
  await page.waitForTimeout(1500);
  assertGoodView(await page.evaluate(() => window.mapView()), problems, 'after All regions');
  await page.close();
});

test('search finds schemes by their other names', async () => {
  const { page } = await open(1366, 768);
  for (const [query, id] of [['Greenpower Park', 'wm-gigapark'], ['DSA', 'sy-airport-city'], ['MDC', 'wm-bemdc']]) {
    await page.fill('#search', query);
    await page.waitForSelector(`[data-scheme="${id}"]`, { timeout: 3000 });
  }
  await page.close();
});

test('a filtered view survives a reload, and the CSV matches the list', async () => {
  const expected = schemes.filter((s) => s.region === 'wm' && s.stage === 'at_risk').map((s) => s.id).sort();
  assert.ok(expected.length > 0);
  const { page } = await open(1366, 768, '#view=list&fr=wm&st=at_risk');
  const listed = () => page.$$eval('#panel-body [data-scheme]', (els) => els.map((e) => e.dataset.scheme).sort());
  assert.deepEqual(await listed(), expected);
  await page.reload();
  await page.waitForFunction(() => typeof window.mapView === 'function');
  assert.deepEqual(await listed(), expected);
  assert.ok(await page.isChecked('input[data-filter="stages"][value="at_risk"]'));

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="csv"]')]);
  const csv = readFileSync(await download.path(), 'utf8');
  const ids = csv.trim().split('\r\n').slice(1).map((line) => line.split(',')[1]).sort();
  assert.deepEqual(ids, expected);
  await page.close();
});

test('Catapult sites: 28 inside the regions, 4 just outside, all sourced to catapult.org.uk', async () => {
  const sites = assets.filter((a) => a.kind === 'catapult');
  assert.equal(sites.filter((a) => !a.nearby).length, 28);
  assert.equal(sites.filter((a) => a.nearby).length, 4);
  assert.ok(sites.every((a) => a.sources.some((s) => s.url.includes('catapult.org.uk')) && a.catapult && a.address));
  const { page } = await open(1366, 768, '#region=wm');
  assert.match(await page.textContent('#panel-body'), /Catapult sites \(4 in the region, 1 just outside\)/);
  await page.goto(url + '#view=list&cat=Connected%20Places');
  await page.waitForSelector('[data-asset="wm-asset-catapult-connected-places-catapult-birmingham"]');
  assert.equal(await page.$$eval('#panel-body .row', (els) => els.length), 1);
  await page.close();
});

test('National Wealth Fund: six partner regions and four supported schemes', async () => {
  const { page } = await open(1366, 768);
  assert.equal(await page.$$eval('.row-region .chip-nwf', (els) => els.length), 6);
  await page.goto(url + '#view=list&nwf=1');
  await page.waitForSelector('#panel-body [data-scheme]');
  assert.deepEqual(
    await page.$$eval('#panel-body [data-scheme]', (els) => els.map((e) => e.dataset.scheme).sort()),
    ['gcr-clyde-metro', 'wm-gigapark', 'wm-sports-quarter', 'wy-mass-transit'],
  );
  await page.close();
});

test('council boundaries switch on when a region is opened', async () => {
  const { page } = await open(1366, 768);
  assert.equal(await page.isChecked('#toggle-councils'), false);
  await page.click('[data-region="bel"]');
  await page.waitForFunction(() => document.getElementById('toggle-councils').checked);
  assert.match(await page.textContent('#panel-body'), /Ballymena.*Newry/);
  await page.close();
});

test('on a phone the sheet starts at about a quarter of the screen', async () => {
  const { page } = await open(390, 844);
  const fraction = await page.evaluate(() => document.getElementById('panel').offsetHeight / document.getElementById('main').clientHeight);
  assert.ok(fraction > 0.2 && fraction < 0.3, `sheet is ${Math.round(fraction * 100)}% of the map area`);
  await page.click('#sheet-button');
  await page.waitForTimeout(400);
  assert.ok((await page.evaluate(() => document.getElementById('panel').offsetHeight / document.getElementById('main').clientHeight)) > 0.8);
  await page.close();
});

test('no serious accessibility problems on the main views (axe-core)', async () => {
  const { page } = await open(1366, 768);
  for (const hash of ['', '#region=wm', '#region=wm&scheme=wm-bkq', '#region=wm&asset=wm-asset-catapult-connected-places-catapult-birmingham', '#view=list', '#view=compare', '#view=moved']) {
    await page.goto(url + hash);
    await page.waitForTimeout(300);
    if (hash === '#view=list') await page.click('#filters summary');
    await page.evaluate(axeSource);
    const results = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }));
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    assert.deepEqual(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0].target.join(' ')}`), [], `view "${hash || 'overview'}"`);
  }
  await page.close();
});
