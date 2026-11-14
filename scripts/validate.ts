// npm run validate: checks the data files against the zod schemas.
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { regionSchema, schemeSchema, assetSchema, SCHEME_TYPES, THEMES, STAGES, LOC_PRECISIONS, CONFIDENCES, ASSET_KINDS } from '../src/schema';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const errors: string[] = [];
const warnings: string[] = [];

function parseAll<T extends z.ZodType>(label: string, schema: T, records: unknown[]): z.infer<T>[] {
  const ok: z.infer<T>[] = [];
  records.forEach((record, i) => {
    const result = schema.safeParse(record);
    if (result.success) ok.push(result.data);
    else {
      const id = (record as { id?: string })?.id ?? `#${i}`;
      for (const issue of result.error.issues) errors.push(`${label} ${id}: ${issue.path.join('.')}: ${issue.message}`);
    }
  });
  return ok;
}

function sameVocab(label: string, inFile: readonly string[] | undefined, inSchema: readonly string[]) {
  if (!inFile || [...inFile].sort().join() !== [...inSchema].sort().join())
    errors.push(`Vocabulary "${label}" in the data file does not match src/schema.ts`);
}

const regionsFile = read('data/regions.json');
const schemesFile = read('data/schemes.json');
const assetsFile = read('data/assets.json');

const vocab = schemesFile._meta.vocab;
sameVocab('type', vocab.type, SCHEME_TYPES);
sameVocab('themes', vocab.themes, THEMES);
sameVocab('stage', vocab.stage, STAGES);
sameVocab('loc_precision', vocab.loc_precision, LOC_PRECISIONS);
sameVocab('confidence', vocab.confidence, CONFIDENCES);
sameVocab('asset kind', assetsFile._meta.vocab.kind, ASSET_KINDS);

const regions = parseAll('region', regionSchema, regionsFile.regions);
const schemes = parseAll('scheme', schemeSchema, schemesFile.schemes);
const assets = parseAll('asset', assetSchema, assetsFile.assets);

const regionIds = new Set(regions.map((r) => r.id));
const ids = new Set<string>();
for (const record of [...regions, ...schemes, ...assets]) {
  if (ids.has(record.id)) errors.push(`Duplicate id: ${record.id}`);
  ids.add(record.id);
}
const today = new Date();
const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()).toISOString().slice(0, 10);
for (const s of schemes) {
  if (!regionIds.has(s.region)) errors.push(`scheme ${s.id}: unknown region "${s.region}"`);
  if (!s.id.startsWith(s.region + '-')) errors.push(`scheme ${s.id}: id must start with its region prefix "${s.region}-"`);
  if (s.parent && !schemes.some((p) => p.id === s.parent)) errors.push(`scheme ${s.id}: parent "${s.parent}" does not exist`);
  if (!s.status_date) warnings.push(`scheme ${s.id}: no status_date`);
  else if (s.status_date < sixMonthsAgo) warnings.push(`scheme ${s.id}: status_date ${s.status_date} is more than 6 months old`);
}
for (const a of assets) {
  if (!regionIds.has(a.region)) errors.push(`asset ${a.id}: unknown region "${a.region}"`);
}

for (const w of warnings) console.warn('Warning: ' + w);
if (errors.length) {
  console.error(`\nValidation failed with ${errors.length} error(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`Valid: ${regions.length} regions, ${schemes.length} schemes, ${assets.length} assets. ${warnings.length} warning(s).`);
