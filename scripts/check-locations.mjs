// Checks hand-entered scheme coordinates and writes reports/locations.md.
// It never changes data/schemes.json: the report is for review.
// Geocoder: Nominatim (OpenStreetMap), one request a second, cached in data/raw/.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { distanceKm, distanceToGeometryKm } from './geo.mjs';

const SITE_LIMIT_KM = 2;
const REGION_LIMIT_KM = 10;
const USER_AGENT = 'regional-intel-map/0.1 (location check script)';
const CACHE = 'data/raw/geocode-cache.json';

const schemes = JSON.parse(await readFile('data/schemes.json', 'utf8')).schemes;
const regionNames = new Map(JSON.parse(await readFile('data/regions.json', 'utf8')).regions.map((r) => [r.id, r.name]));
const polygons = new Map(JSON.parse(await readFile('public/data/regions.geojson', 'utf8')).features.map((f) => [f.properties.id, f.geometry]));
await mkdir('data/raw', { recursive: true });
const cache = JSON.parse(await readFile(CACHE, 'utf8').catch(() => '{}'));

async function geocode(place) {
  const query = place.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (!query) return null;
  if (!(query in cache)) {
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=gb&q=' + encodeURIComponent(query);
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`Nominatim returned HTTP ${res.status} for "${query}"`);
    const [hit] = await res.json();
    cache[query] = hit ? { lat: +hit.lat, lng: +hit.lon, label: hit.display_name, kind: `${hit.category}/${hit.type}` } : null;
    await writeFile(CACHE, JSON.stringify(cache, null, 1));
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  return cache[query];
}

const rows = [];
for (const s of schemes.filter((x) => x.loc_precision !== 'region')) {
  const hit = await geocode(s.place);
  const offset = hit ? distanceKm([s.lng, s.lat], [hit.lng, hit.lat]) : null;
  const outside = distanceToGeometryKm([s.lng, s.lat], polygons.get(s.region));
  const flags = [];
  if (s.loc_precision === 'site' && offset != null && offset > SITE_LIMIT_KM) flags.push(`${offset.toFixed(1)}km from geocode`);
  if (outside > REGION_LIMIT_KM) flags.push(`${outside.toFixed(1)}km outside region`);
  rows.push({ s, hit, offset, outside, flags });
  process.stdout.write('.');
}
process.stdout.write('\n');

const km = (n) => (n == null ? 'n/a' : n.toFixed(1));
const line = ({ s, hit, offset, outside, flags }) =>
  `| ${s.id} | ${s.loc_precision} | ${s.place} | ${s.lat}, ${s.lng} | ${hit ? `${hit.lat.toFixed(4)}, ${hit.lng.toFixed(4)}` : 'not found'} | ${km(offset)} | ${outside ? km(outside) : 'inside'} | ${flags.join('; ')} |`;
const head = '| Scheme | Precision | Place | Entered (lat, lng) | Geocode (lat, lng) | Offset (km) | Outside region (km) | Flag |\n|---|---|---|---|---|---|---|---|';
const flagged = rows.filter((r) => r.flags.length);
const notFound = rows.filter((r) => !r.hit);
const justOutside = rows.filter((r) => r.outside > 0 && r.outside <= REGION_LIMIT_KM);
const dupes = Object.values(Object.groupBy(rows, (r) => `${r.s.lat},${r.s.lng}`)).filter((g) => g.length > 1);

const out = [
  '# Location check',
  '',
  `Checked ${rows.length} mapped schemes (site and area precision). Region-wide schemes are not on the map and are not checked.`,
  '',
  `Rules: flag a site more than ${SITE_LIMIT_KM}km from the Nominatim geocode of its \`place\`; flag any scheme more than ${REGION_LIMIT_KM}km outside its region polygon.`,
  'Coordinates in `data/schemes.json` have **not** been changed. A geocode of a town name gives the town centre, so a flag is a prompt to check, not proof of an error.',
  '',
  `## Flagged for review (${flagged.length})`,
  '',
  flagged.length ? [head, ...flagged.map(line)].join('\n') : 'None.',
  '',
  `## Place could not be geocoded (${notFound.length})`,
  '',
  notFound.length ? notFound.map((r) => `- ${r.s.id}: "${r.s.place}"`).join('\n') : 'None.',
  '',
  `## Outside the region boundary by ${REGION_LIMIT_KM}km or less (${justOutside.length})`,
  '',
  'Expected for some schemes, such as the Gigapark and the East Midlands Freeport airport site. Not corrected.',
  '',
  justOutside.length ? justOutside.map((r) => `- ${r.s.id}: ${km(r.outside)}km outside ${regionNames.get(r.s.region)}`).join('\n') : 'None.',
  '',
  `## Identical coordinates (${dupes.length} group${dupes.length === 1 ? '' : 's'})`,
  '',
  'These markers sit exactly on top of each other on the map. All remain reachable from the list.',
  '',
  dupes.length ? dupes.map((g) => `- ${g.map((r) => r.s.id).join(', ')}`).join('\n') : 'None.',
  '',
  '## All mapped schemes',
  '',
  head,
  ...rows.map(line),
  '',
].join('\n');
await mkdir('reports', { recursive: true });
await writeFile('reports/locations.md', out);
console.log(`${flagged.length} flagged, ${notFound.length} not geocoded. Report: reports/locations.md`);
