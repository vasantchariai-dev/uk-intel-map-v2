// Builds public/data/regions.geojson and public/data/lads.geojson from the raw
// ONS files, and writes reports/boundaries.md. Run fetch-boundaries.mjs first.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import mapshaper from 'mapshaper';
import { areaKm2, bbox, levenshtein, pointInGeometry, polygons } from './geo.mjs';

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
// 4. Other regions (non-priority, drawn in grey). Members come from a list of
// council names, an ONS code prefix, or the ONS combined authority of that name.
const othersFile = JSON.parse(await readFile('data/other-regions.json', 'utf8'));
// A district belongs to a combined authority when most points sampled inside
// the district are also inside the authority.
const mostlyInside = (district, area) => {
  const [w, s, e, n] = bbox(district);
  let inside = 0;
  let total = 0;
  for (let i = 1; i < 12; i++)
    for (let j = 1; j < 12; j++) {
      const point = [w + ((e - w) * i) / 12, s + ((n - s) * j) / 12];
      if (!pointInGeometry(point, district)) continue;
      total++;
      if (pointInGeometry(point, area)) inside++;
    }
  return total > 0 && inside / total > 0.5;
};
const otherMembers = [];
const otherErrors = [];
lines.push('## Other regions', '', '| Region | Rule | Councils | Area (km²) |', '|---|---|---|---|');
for (const region of othersFile.regions) {
  let found;
  let rule;
  if (region.cauth) {
    rule = `ONS combined authority "${region.cauth}"`;
    const area = cauth.features.find((f) => f.properties.CAUTH25NM === region.cauth);
    if (!area) {
      otherErrors.push(`${region.id}: no ONS combined authority called "${region.cauth}"`);
      continue;
    }
    found = lads.features.filter((f) => mostlyInside(f.geometry, area.geometry));
    const diff = Math.abs(found.reduce((t, f) => t + areaKm2(f.geometry), 0) / areaKm2(area.geometry) - 1);
    if (diff > 0.001) otherErrors.push(`${region.id}: councils found do not add up to the ONS area (${(diff * 100).toFixed(2)}% out)`);
    region.lads = found.map((f) => f.properties.LAD25NM).sort();
  } else if (region.lad_code_prefix) {
    rule = `ONS codes starting ${region.lad_code_prefix}`;
    found = lads.features.filter((f) => f.properties.LAD25CD.startsWith(region.lad_code_prefix));
    region.lads = found.map((f) => f.properties.LAD25NM).sort();
  } else {
    rule = 'Listed councils';
    found = [];
    for (const name of region.lads) {
      const feature = byName.get(name);
      if (feature) found.push(feature);
      else {
        const closest = [...byName.keys()].map((n) => [n, levenshtein(n.toLowerCase(), name.toLowerCase())]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([n]) => n);
        otherErrors.push(`${region.id}: "${name}" not found in LAD25NM. Closest: ${closest.join(', ')}`);
      }
    }
  }
  for (const f of found) {
    if (seen.has(f.properties.LAD25NM)) otherErrors.push(`"${f.properties.LAD25NM}" is in both ${seen.get(f.properties.LAD25NM)} and ${region.id}`);
    seen.set(f.properties.LAD25NM, region.id);
    otherMembers.push({ type: 'Feature', properties: { region: region.id, name: f.properties.LAD25NM }, geometry: f.geometry });
  }
  lines.push(`| ${region.name} | ${rule} | ${found.length} | ${found.reduce((t, f) => t + areaKm2(f.geometry), 0).toFixed(0)} |`);
}
if (otherErrors.length) {
  console.error('Other regions failed:\n' + otherErrors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
const otherOut = await mapshaper.applyCommands(
  [
    '-i members.json name=lads',
    '-simplify 6% keep-shapes',
    '-clean',
    '-dissolve region target=lads + name=regions',
    '-join meta.json keys=region,id target=regions',
    '-rename-fields id=region target=regions',
    '-o target=lads other-lads.geojson precision=0.0001',
    '-o target=regions other-regions.geojson precision=0.0001',
  ].join(' '),
  {
    'members.json': JSON.stringify({ type: 'FeatureCollection', features: otherMembers }),
    'meta.json': JSON.stringify(othersFile.regions.map((r) => ({ id: r.id, name: r.name, group: r.group }))),
  },
);
await writeFile('public/data/other-lads.geojson', otherOut['other-lads.geojson']);
await writeFile('public/data/other-regions.geojson', otherOut['other-regions.geojson']);
await writeFile('data/other-regions.json', JSON.stringify(othersFile, null, 2) + '\n');
lines.push('');
console.log(`Other regions: ${othersFile.regions.length} built from ${otherMembers.length} districts.`);

await mkdir('reports', { recursive: true });
await writeFile('reports/boundaries.md', lines.join('\n'));

console.log(`Matched ${members.length} districts across ${regions.length} regions.`);
console.log(mismatches ? `${mismatches} combined authority mismatch(es): see reports/boundaries.md` : 'Combined authority cross-check: all match.');
