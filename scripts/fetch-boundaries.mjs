// Downloads ONS boundary files into data/raw/ (gitignored).
// Source: ONS Open Geography Portal feature services (BGC, generalised 20m).
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services';
const LAYERS = [
  { service: 'Local_Authority_Districts_DEC_2025_Boundaries_UK_BGC', fields: 'LAD25CD,LAD25NM', out: 'lad25_uk_bgc.geojson' },
  { service: 'Combined_Authorities_December_2025_Boundaries_EN_BGC', fields: 'CAUTH25CD,CAUTH25NM', out: 'cauth25_en_bgc.geojson' },
];

async function fetchLayer({ service, fields, out }) {
  const features = [];
  const page = 100;
  for (let offset = 0; ; offset += page) {
    const url = `${BASE}/${service}/FeatureServer/0/query?where=1%3D1&outFields=${fields}&outSR=4326&orderByFields=FID&resultOffset=${offset}&resultRecordCount=${page}&f=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${service}: HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`${service}: ${JSON.stringify(json.error)}`);
    features.push(...json.features);
    process.stdout.write(`\r${service}: ${features.length} features`);
    if (json.features.length < page) break;
  }
  process.stdout.write('\n');
  await writeFile(`data/raw/${out}`, JSON.stringify({ type: 'FeatureCollection', features }));
}

await mkdir('data/raw', { recursive: true });
for (const layer of LAYERS) await fetchLayer(layer);
