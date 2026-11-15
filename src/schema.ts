import { z } from 'zod';

// Vocabularies. These must match _meta.vocab in data/schemes.json and
// data/assets.json; scripts/validate.ts checks that they do.
export const SCHEME_TYPES = ['fund', 'capital_project', 'programme', 'designation', 'transport', 'strategy', 'power', 'governance', 'private_investment'] as const;
export const THEMES = ['innovation', 'growth', 'commercialisation', 'transport', 'housing', 'energy', 'culture', 'skills', 'nature', 'governance'] as const;
export const STAGES = ['proposed', 'pipeline', 'business_case', 'approved', 'delivering', 'at_risk', 'complete', 'adopted'] as const;
export const LOC_PRECISIONS = ['site', 'area', 'region'] as const;
export const CONFIDENCES = ['high', 'medium', 'low'] as const;
export const ASSET_KINDS = ['university', 'catapult', 'research'] as const;
export const CATAPULTS = [
  'Cell and Gene Therapy',
  'Satellite Applications',
  'Offshore Renewable Energy',
  'Medicines Discovery',
  'Energy Systems',
  'High Value Manufacturing',
  'Digital',
  'Connected Places',
  'Semiconductor',
] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use an ISO date (YYYY-MM-DD)');
const lat = z.number().min(49).max(61);
const lng = z.number().min(-9).max(2.5);

export const sourceSchema = z.object({ title: z.string().min(1), url: z.url() });

export const imageSchema = z.object({
  url: z.url(),
  caption: z.string().min(1),
  credit: z.string().min(1),
  licence: z.string().min(1),
  source_url: z.url(),
  /** Year the photo was taken, where Wikimedia Commons records it. */
  date: z.string().regex(/^(\d{4})?$/).optional(),
});

const historySchema = z.array(z.object({ date: isoDate, change: z.string().min(1), source: z.url() }));

export const regionSchema = z.object({
  id: z.string().regex(/^[a-z]+$/),
  name: z.string().min(1),
  body: z.string().min(1),
  type: z.string().min(1),
  nation: z.enum(['England', 'Scotland', 'Wales', 'Northern Ireland']),
  boundary_rule: z.string(),
  lads: z.array(z.string().min(1)).min(1),
  governance_sources: z.array(z.object({ label: z.string(), url: z.url(), notes: z.string() })),
  watch_notes: z.string(),
  boundary_source: sourceSchema,
  boundary_note: z.string().min(1),
  nwf_partnership: z.object({ wave: z.union([z.literal(1), z.literal(2)]), agreed: isoDate, source: sourceSchema }).nullable(),
});

export const schemeSchema = z.object({
  id: z.string().regex(/^[a-z]+-[a-z0-9-]+$/),
  region: z.string(),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  type: z.enum(SCHEME_TYPES),
  themes: z.array(z.enum(THEMES)).min(1),
  value_gbp_m: z.number().positive().nullable(),
  value_note: z.string(),
  funding: z.string(),
  stage: z.enum(STAGES),
  status: z.string().min(1),
  status_date: z.union([isoDate, z.literal('')]),
  unknowns: z.string(),
  lat,
  lng,
  loc_precision: z.enum(LOC_PRECISIONS),
  place: z.string(),
  sources: z.array(sourceSchema).min(1, 'Every scheme needs at least one source'),
  confidence: z.enum(CONFIDENCES),
  image: imageSchema.optional(),
  parent: z.string().optional(),
  /** Growth corridor or grouping used by the region's prospectus or pipeline. */
  corridor: z.string().optional(),
  nwf_support: z.object({ type: z.string().min(1), source: sourceSchema }).optional(),
  history: historySchema,
  last_checked: isoDate,
});

export const assetSchema = z.object({
  id: z.string().regex(/^[a-z]+-asset-[a-z0-9-]+$/),
  region: z.string(),
  name: z.string().min(1),
  kind: z.enum(ASSET_KINDS),
  /** Catapult sites only: which of the nine Catapults, and the centre within it. */
  catapult: z.enum(CATAPULTS).optional(),
  centre: z.string().optional(),
  address: z.string().optional(),
  nearby: z.boolean().optional(),
  nearby_note: z.string().optional(),
  summary: z.string(),
  established: z.number().int().nullable(),
  students: z.number().int().nullable(),
  website: z.union([z.url(), z.literal('')]),
  lat,
  lng,
  loc_source: z.string().min(1),
  loc_precision: z.enum(['site', 'area']),
  image: imageSchema.nullable(),
  sources: z.array(sourceSchema).min(1, 'Every asset needs at least one source'),
  confidence: z.enum(CONFIDENCES),
  history: historySchema,
  last_checked: isoDate,
});

export type Region = z.infer<typeof regionSchema>;
export type Scheme = z.infer<typeof schemeSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type SchemeType = (typeof SCHEME_TYPES)[number];
export type Stage = (typeof STAGES)[number];
export type AssetKind = (typeof ASSET_KINDS)[number];
