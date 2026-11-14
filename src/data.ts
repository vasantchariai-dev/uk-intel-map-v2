import regionsFile from '../data/regions.json';
import schemesFile from '../data/schemes.json';
import assetsFile from '../data/assets.json';
import type { Asset, Region, Scheme } from './schema';

// The JSON files are the source of truth. They are checked by `npm run validate`
// before every build, so they are not re-parsed in the browser.
export const regions = regionsFile.regions as Region[];
export const schemes = schemesFile.schemes as unknown as Scheme[];
export const assets = assetsFile.assets as unknown as Asset[];
export const lastChecked: string = schemesFile._meta.last_checked;

export const regionById = new Map(regions.map((r) => [r.id, r]));
export const schemeById = new Map(schemes.map((s) => [s.id, s]));
export const assetById = new Map(assets.map((a) => [a.id, a]));

export const schemesIn = (regionId: string) => schemes.filter((s) => s.region === regionId);
export const assetsIn = (regionId: string) => assets.filter((a) => a.region === regionId);
export const isMapped = (s: Scheme) => s.loc_precision !== 'region';

function haystack(parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

/** Plain search: every word must appear somewhere in the record. */
export function search(query: string): { schemes: Scheme[]; assets: Asset[] } {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return { schemes: [], assets: [] };
  const hit = (text: string) => words.every((w) => text.includes(w));
  return {
    schemes: schemes.filter((s) => hit(haystack([s.name, ...s.aliases, s.place, s.status, regionById.get(s.region)?.name]))),
    assets: assets.filter((a) => hit(haystack([a.name, a.summary, regionById.get(a.region)?.name]))),
  };
}
