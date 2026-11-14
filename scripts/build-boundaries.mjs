// Builds public/data/regions.geojson and public/data/lads.geojson from the raw
// ONS files, and writes reports/boundaries.md. Run fetch-boundaries.mjs first.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import mapshaper from 'mapshaper';
import { areaKm2, bbox, levenshtein } from './geo.mjs';

const regions = JSON.parse(await readFile('data/regions.json', 'utf8')).regions;
const lads = JSON.parse(await readFile('data/raw/lad25_uk_bgc.geojson', 'utf8'));
const cauth = JSON.parse(await readFile('data/raw/cauth25_en_bgc.geojson', 'utf8'));

// 1. Match member district names against LAD25NM. Fail loudly.
const byName = new Map(lads.features.map((f) => [f.properties.LAD25NM, f]));
const errors = [];
const seen = new Map();
const members = [];
for (const region of regions) {
  for (const name of region.lads) {
    const feature = byName.get(name);
    if (!feature) {
      const closest = [...byName.keys()]
        .map((n) => [n, levenshtein(n.toLowerCase(), name.toLowerCase())])
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([n]) => n);
      errors.push(`${region.id}: "${name}" not found in LAD25NM. Closest: ${closest.join(', ')}`);
      continue;
    }
    if (seen.has(name)) errors.push(`"${name}" is listed in both ${seen.get(name)} and ${region.id}`);
    seen.set(name, region.id);
    members.push({
      type: 'Feature',
      properties: { region: region.id, code: feature.properties.LAD25CD, name },
      geometry: feature.geometry,
    });
  }
}
if (errors.length) {
  console.error('Boundary build failed:\n' + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}

// 2. Simplify the districts, then dissolve by region so shared edges agree.
const meta = regions.map((r) => ({ id: r.id, name: r.name, body: r.body, type: r.type, nation: r.nation }));
const out = await mapshaper.applyCommands(
  [
    '-i members.json name=lads',
    '-simplify 10% keep-shapes',
    '-clean',
    '-dissolve region target=lads + name=regions',
    '-join meta.json keys=region,id target=regions',
    '-rename-fields id=region target=regions',
    '-o target=lads lads.geojson precision=0.0001',
    '-o target=regions regions.geojson precision=0.0001',
  ].join(' '),
  {
    'members.json': JSON.stringify({ type: 'FeatureCollection', features: members }),
    'meta.json': JSON.stringify(meta),
  },
);
await mkdir('public/data', { recursive: true });
await writeFile('public/data/lads.geojson', out['lads.geojson']);
await writeFile('public/data/regions.geojson', out['regions.geojson']);

// 3. Cross-check English regions against ONS combined authority boundaries.
const lines = [
  '# Boundary build report',
  '',
  'Source: ONS Local Authority Districts (December 2025) Boundaries UK BGC.',
  'Cross-check: ONS Combined Authorities (December 2025) Boundaries EN BGC.',
  '',
  '## Regions built',
  '',
  '| Region | Districts | Area (km², unsimplified) |',
  '|---|---|---|',
];
const rawArea = new Map();
for (const region of regions) {
  const area = members.filter((m) => m.properties.region === region.id).reduce((s, m) => s + areaKm2(m.geometry), 0);
  rawArea.set(region.id, area);
  lines.push(`| ${region.name} | ${region.lads.length} | ${area.toFixed(0)} |`);
}
lines.push('', '## Combined authority cross-check', '');
lines.push('| Region | ONS combined authority | ONS area (km²) | Our area (km²) | Difference | Result |', '|---|---|---|---|---|---|');
let mismatches = 0;
const norm = (s) => s.toLowerCase().replace(/\b(mayoral|combined|county|authority)\b/g, '').replace(/[^a-z]/g, '');
for (const region of regions.filter((r) => r.nation === 'England')) {
  const match = cauth.features.find((f) => norm(f.properties.CAUTH25NM) === norm(region.name));
  if (!match) {
    mismatches++;
    lines.push(`| ${region.name} | not found | | ${rawArea.get(region.id).toFixed(0)} | | **No match** |`);
    continue;
  }
  const ons = areaKm2(match.geometry);
  const ours = rawArea.get(region.id);
  const diff = ((ours - ons) / ons) * 100;
  const a = bbox(match.geometry);
  const b = members.filter((m) => m.properties.region === region.id).map((m) => bbox(m.geometry));
  const ob = [Math.min(...b.map((x) => x[0])), Math.min(...b.map((x) => x[1])), Math.max(...b.map((x) => x[2])), Math.max(...b.map((x) => x[3]))];
  const boxOk = a.every((v, i) => Math.abs(v - ob[i]) < 0.002);
  const ok = Math.abs(diff) < 0.1 && boxOk;
  if (!ok) mismatches++;
  lines.push(`| ${region.name} | ${match.properties.CAUTH25NM} | ${ons.toFixed(0)} | ${ours.toFixed(0)} | ${diff.toFixed(3)}% | ${ok ? 'Match' : '**Mismatch**'} |`);
}
lines.push('', 'ONS combined authority names in the file: ' + cauth.features.map((f) => f.properties.CAUTH25NM).sort().join('; ') + '.', '');
lines.push('Note: West Midlands is built from constituent members only, which is how ONS draws it too.', '');
await mkdir('reports', { recursive: true });
await writeFile('reports/boundaries.md', lines.join('\n'));

console.log(`Matched ${members.length} districts across ${regions.length} regions.`);
console.log(mismatches ? `${mismatches} combined authority mismatch(es): see reports/boundaries.md` : 'Combined authority cross-check: all match.');
