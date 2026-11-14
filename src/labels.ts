import type { Asset, AssetKind, Scheme, SchemeType, Stage } from './schema';

// Colour-blind-safe palette (Paul Tol, muted), one colour per region.
export const REGION_COLOURS: Record<string, string> = {
  sy: '#332288',
  wm: '#882255',
  em: '#117733',
  wy: '#aa4499',
  yny: '#999933',
  tv: '#cc6677',
  ne: '#44aa99',
  gcr: '#0077bb',
  bel: '#ee7733',
  ccr: '#661100',
};

// Nine scheme types shown in seven colours: the three policy types share one.
export type TypeGroup = 'designation' | 'capital_project' | 'private_investment' | 'transport' | 'fund' | 'programme' | 'policy';
export const TYPE_GROUP: Record<SchemeType, TypeGroup> = {
  designation: 'designation',
  capital_project: 'capital_project',
  private_investment: 'private_investment',
  transport: 'transport',
  fund: 'fund',
  programme: 'programme',
  strategy: 'policy',
  power: 'policy',
  governance: 'policy',
};
export const GROUP_COLOURS: Record<TypeGroup, string> = {
  designation: '#1d70b8',
  capital_project: '#00703c',
  private_investment: '#4c2c92',
  transport: '#f47738',
  fund: '#d53880',
  programme: '#28a197',
  policy: '#505a5f',
};
export const GROUP_LABELS: Record<TypeGroup, string> = {
  designation: 'Designation or zone',
  capital_project: 'Capital project',
  private_investment: 'Private investment',
  transport: 'Transport',
  fund: 'Fund',
  programme: 'Programme',
  policy: 'Strategy, power or governance',
};
export const TYPE_LABELS: Record<SchemeType, string> = {
  fund: 'Fund',
  capital_project: 'Capital project',
  programme: 'Programme',
  designation: 'Designation',
  transport: 'Transport',
  strategy: 'Strategy',
  power: 'Power',
  governance: 'Governance',
  private_investment: 'Private investment',
};
export const STAGE_LABELS: Record<Stage, string> = {
  proposed: 'Proposed',
  pipeline: 'Pipeline',
  business_case: 'Business case',
  approved: 'Approved',
  delivering: 'Delivering',
  at_risk: 'At risk',
  complete: 'Complete',
  adopted: 'Adopted',
};
// Marker shape shows stage in four classes.
export type StageClass = 'early' | 'active' | 'complete' | 'risk';
export const STAGE_CLASS: Record<Stage, StageClass> = {
  proposed: 'early',
  pipeline: 'early',
  business_case: 'early',
  approved: 'active',
  delivering: 'active',
  adopted: 'active',
  complete: 'complete',
  at_risk: 'risk',
};
export const STAGE_CLASS_LABELS: Record<StageClass, string> = {
  early: 'Proposed, pipeline or business case',
  active: 'Approved, delivering or adopted',
  complete: 'Complete',
  risk: 'At risk',
};
export const KIND_LABELS: Record<AssetKind, string> = {
  university: 'University',
  catapult: 'Catapult centre',
  research: 'Research or innovation centre',
};
export const KIND_PLURALS: Record<AssetKind, string> = {
  university: 'Universities',
  catapult: 'Catapult centres',
  research: 'Research and innovation centres',
};
export const KIND_LETTER: Record<AssetKind, string> = { university: 'U', catapult: 'C', research: 'R' };
export const CONFIDENCE_HELP: Record<string, string> = {
  high: 'High confidence: the primary paper was read.',
  medium: 'Medium confidence: from official sources or trade press.',
  low: 'Low confidence: from a secondary source or an AI summary. Verify before use.',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : '';
}

export function formatValue(millions: number | null): string {
  if (millions == null) return '';
  if (millions >= 1000) return `£${+(millions / 1000).toFixed(2)}bn`;
  return `£${+millions.toFixed(2)}m`;
}

export function shortValue(s: Scheme): string {
  if (s.value_gbp_m != null) return formatValue(s.value_gbp_m);
  if (!s.value_note) return '';
  return s.value_note.length > 60 ? s.value_note.slice(0, 57).trimEnd() + '…' : s.value_note;
}

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).replace(/_/g, ' ');
}

export function esc(text: string | number | null | undefined): string {
  return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export const schemeIconName = (s: Scheme) => `s-${TYPE_GROUP[s.type]}-${STAGE_CLASS[s.stage]}`;
export const assetIconName = (a: Asset) => `a-${a.kind}`;
