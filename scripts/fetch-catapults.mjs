// Rebuilds the Catapult entries in data/assets.json from the official network
// map at catapult.org.uk. The map's location data is embedded in the page as
// one pop-up per site; this script reads those rather than re-keying them.
// Coordinates are postcode centres from postcodes.io, taken from each address.
// Behind a proxy, run with NODE_USE_ENV_PROXY=1.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pointInGeometry, distanceToGeometryKm } from './geo.mjs';

const PAGE = 'https://catapult.org.uk/about-us/why-the-catapult-network/';
const TODAY = new Date().toISOString().slice(0, 10);

// Sites just outside a region that we still show, flagged as nearby.
const NEARBY = { markers_hvm_9: 'wm', markers_hvm_27: 'gcr', markers_hvm_24: 'ccr', markers_satellite_1: 'em' };
// Addresses the page gives without a usable postcode, or with two buildings.
const POSTCODE_FIXES = { markers_hvm_5: 'TS21 3FE', markers_hvm_5_1: 'TS21 3FG' };
const ADDRESS_FIXES = {
  markers_hvm_5: 'The Coxon Building, John Walker Road, Sedgefield, TS21 3FE',
  markers_hvm_5_1: 'The Neville Hamlin Building, Thomas Wright Way, Sedgefield, TS21 3FG',
};
const CATAPULTS = {
  'CELL AND GENE THERAPY': 'Cell and Gene Therapy',
  'SATELLITE APPLICATIONS': 'Satellite Applications',
  'OFFSHORE RENEWABLE ENERGY': 'Offshore Renewable Energy',
  'MEDICINES DISCOVERY': 'Medicines Discovery',
  'ENERGY SYSTEMS': 'Energy Systems',
  'HIGH VALUE MANUFACTURING': 'High Value Manufacturing',
  DIGITAL: 'Digital',
  'CONNECTED PLACES': 'Connected Places',
  SEMICONDUCTOR: 'Semiconductor',
};
const ACRONYMS = new Set(['CPI', 'AMRC', 'NMIS', 'MTC', 'WMG', 'NCC', 'SEL']);
const CENTRES = ['NUCLEAR AMRC', 'AMRC', 'CPI', 'NMIS', 'MTC', 'WMG', 'NCC'];

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&times;/g, '×');
const text = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const titleCase = (s) =>
  s
    .split(' ')
    .map((w) => {
      const bare = w.replace(/[^A-Z]/g, '');
      if (ACRONYMS.has(bare)) return w;
      return w.toLowerCase().replace(/[a-z]/, (c) => c.toUpperCase());
    })
    .join(' ')
    .replace(/\bAmrc\b/g, 'AMRC');
const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

await mkdir('data/raw', { recursive: true });
const res = await fetch(PAGE, { headers: { 'User-Agent': 'regional-intel-map/0.1 (data build script)' } });
if (!res.ok) throw new Error(`Catapult page returned HTTP ${res.status}`);
const html = await res.text();
await writeFile('data/raw/catapult-network.html', html);

// One pop-up per site.
const parts = html.split(/<div class="modal fade" id="(markers_[a-z]+_\d+(?:_\d+)?)_modal"/);
const sites = [];
for (let i = 1; i < parts.length; i += 2) {
  const id = parts[i];
  const chunk = parts[i + 1];
  const title = text(/<span class="font-weight-bold">([\s\S]*?)<\/span>/.exec(chunk)?.[1] ?? '');
  const url = /modal-title[\s\S]*?<a[^>]*href="([^"]+)"/.exec(chunk)?.[1] ?? '';
  const body = chunk.slice(chunk.indexOf('modal-body'));
  const [descHtml, sideHtml = ''] = body.split(/<div class="col-12 col-md-5[^"]*">/);
  const description = text(descHtml.slice(descHtml.indexOf('>') + 1));
  const address = ADDRESS_FIXES[id] ?? text(sideHtml.split('<div')[0]).replace(/Links 360 Tour/, '').replace(/[.,\s]+$/, '');
  const [catapultRaw, siteRaw = ''] = title.split(/ CATAPULT: /);
  const catapult = CATAPULTS[catapultRaw];
  if (!catapult) throw new Error(`Unknown Catapult in "${title}"`);
  const postcodes = [...address.replace('HP18 OXB', 'HP18 0XB').matchAll(/\b([A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})\b/g)].map((m) => m[1]);
  sites.push({ id, catapult, siteRaw, url, description, address, postcode: POSTCODE_FIXES[id] ?? postcodes.at(-1) ?? null });
}
console.log(`${sites.length} locations on the Catapult network map.`);

const wanted = [...new Set(sites.map((s) => s.postcode).filter(Boolean))];
const lookup = await fetch('https://api.postcodes.io/postcodes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ postcodes: wanted }),
});
const found = new Map((await lookup.json()).result.map((r) => [r.query, r.result]));

const regions = JSON.parse(await readFile('public/data/regions.geojson', 'utf8')).features;
const file = JSON.parse(await readFile('data/assets.json', 'utf8'));
const previous = new Map(file.assets.map((a) => [a.id, a]));
const built = [];
const skipped = [];
for (const s of sites) {
  const hit = s.postcode && found.get(s.postcode);
  if (!hit) {
    skipped.push(`${s.catapult}: ${s.siteRaw} (no postcode on the page)`);
    continue;
  }
  const point = [hit.longitude, hit.latitude];
  const inside = regions.find((f) => pointInGeometry(point, f.geometry))?.properties.id;
  const region = inside ?? NEARBY[s.id];
  if (!region) continue;
  const centreRaw = s.catapult === 'High Value Manufacturing' ? CENTRES.find((c) => s.siteRaw.startsWith(c)) : undefined;
  const isLab = s.siteRaw.startsWith('SEL ');
  const centre = centreRaw ? titleCase(centreRaw) : isLab ? 'Space Enterprise Lab' : '';
  let name;
  if (s.catapult === 'High Value Manufacturing') name = centreRaw ? titleCase(s.siteRaw).replace(', Digital', ' Digital') : `High Value Manufacturing Catapult, ${titleCase(s.siteRaw)}`;
  else if (isLab) name = `Satellite Applications Catapult: Space Enterprise Lab ${titleCase(s.siteRaw.slice(4))}`;
  else name = `${s.catapult} Catapult, ${titleCase(s.siteRaw)}`;
  const id = `${region}-asset-catapult-${slug(name)}`;
  const firstSentence = (/^.*?[.!?](?=\s|$)/.exec(s.description)?.[0] ?? s.description).slice(0, 300);
  const outsideKm = inside ? 0 : distanceToGeometryKm(point, regions.find((f) => f.properties.id === region).geometry);
  built.push({
    id,
    region,
    name,
    kind: 'catapult',
    catapult: s.catapult,
    centre,
    summary: firstSentence,
    address: s.address,
    nearby: !inside,
    nearby_note: inside ? '' : `Just outside the region boundary (about ${Math.round(outsideKm)}km).`,
    established: null,
    students: null,
    website: s.url,
    lat: +hit.latitude.toFixed(5),
    lng: +hit.longitude.toFixed(5),
    loc_source: `postcodes.io (centre of postcode ${s.postcode})`,
    loc_precision: 'site',
    image: null,
    sources: [{ title: 'Catapult Network: map of locations', url: PAGE }],
    confidence: 'high',
    history: previous.get(id)?.history ?? [],
    last_checked: TODAY,
  });
}
built.sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name));
file.assets = [...file.assets.filter((a) => a.kind !== 'catapult'), ...built].sort(
  (a, b) => a.region.localeCompare(b.region) || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name),
);
file._meta.vocab.catapult = Object.values(CATAPULTS);
await writeFile('data/assets.json', JSON.stringify(file, null, 2) + '\n');
console.log(`${built.filter((a) => !a.nearby).length} sites inside the regions, ${built.filter((a) => a.nearby).length} nearby.`);
if (skipped.length) console.log('Not geocoded, so not checked against the regions:\n  ' + skipped.join('\n  '));
