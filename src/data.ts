import type { Asset, Region, Scheme } from './schema';

// The JSON files in data/ are the source of truth. They are checked by
// `npm run validate` before every build, copied to public/data/ and fetched
// here when the page loads, so a data update never changes the app code.
export let regions: Region[] = [];
export let schemes: Scheme[] = [];
export let assets: Asset[] = [];
export let lastChecked = '';

export const regionById = new Map<string, Region>();
export const schemeById = new Map<string, Scheme>();
export const assetById = new Map<string, Asset>();

export async function loadData(): Promise<void> {
  const get = async (name: string) => {
    const res = await fetch(`${import.meta.env.BASE_URL}data/${name}.json`);
    if (!res.ok) throw new Error(`Could not load ${name}.json (${res.status})`);
    return res.json();
  };
  const [r, s, a] = await Promise.all([get('regions'), get('schemes'), get('assets')]);
  regions = r.regions;
  schemes = s.schemes;
  assets = a.assets;
  lastChecked = s._meta.last_checked;
  for (const x of regions) regionById.set(x.id, x);
  for (const x of schemes) schemeById.set(x.id, x);
  for (const x of assets) assetById.set(x.id, x);
}

export const schemesIn = (regionId: string) => schemes.filter((s) => s.region === regionId);
export const assetsIn = (regionId: string) => assets.filter((a) => a.region === regionId);
export const isMapped = (s: Scheme) => s.loc_precision !== 'region';
export const childrenOf = (id: string) => schemes.filter((s) => s.parent === id);

export interface Filters {
  q: string;
  regions: string[];
  themes: string[];
  types: string[];
  stages: string[];
  confidence: string[];
  catapults: string[];
  unknowns: boolean;
  nwf: boolean;
}

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);
const matches = (q: string, parts: (string | undefined)[]) => {
  const text = parts.filter(Boolean).join(' ').toLowerCase();
  return words(q).every((w) => text.includes(w));
};
const any = (wanted: string[], have: string[]) => !wanted.length || have.some((v) => wanted.includes(v));

/** True when a filter that only applies to schemes is switched on. */
export const schemeOnlyFilters = (f: Filters) => Boolean(f.themes.length || f.types.length || f.stages.length || f.confidence.length || f.unknowns || f.nwf);

/** Search covers name, other names, place, status text, corridor and region. Every word must appear. */
export function filterSchemes(f: Filters): Scheme[] {
  if (f.catapults.length) return [];
  return schemes.filter(
    (s) =>
      any(f.regions, [s.region]) &&
      any(f.themes, s.themes) &&
      any(f.types, [s.type]) &&
      any(f.stages, [s.stage]) &&
      any(f.confidence, [s.confidence]) &&
      (!f.unknowns || Boolean(s.unknowns)) &&
      (!f.nwf || Boolean(s.nwf_support)) &&
      matches(f.q, [s.name, ...s.aliases, s.place, s.status, s.corridor, regionById.get(s.region)?.name]),
  );
}

export function filterAssets(f: Filters): Asset[] {
  if (schemeOnlyFilters(f)) return [];
  return assets.filter(
    (a) =>
      any(f.regions, [a.region]) &&
      (!f.catapults.length || (a.catapult !== undefined && f.catapults.includes(a.catapult))) &&
      matches(f.q, [a.name, a.summary, a.catapult && `${a.catapult} Catapult`, a.centre, a.address, regionById.get(a.region)?.name]),
  );
}
