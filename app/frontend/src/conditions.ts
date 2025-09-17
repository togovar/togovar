import grch37Json from '../assets/GRCh37/advanced_search_conditions.json';
import grch38Json from '../assets/GRCh38/advanced_search_conditions.json';
import type { GRChConditions } from './types';
import type { ConditionTypeValue, ConditionMeta } from './definition';

type Reference = 'GRCh37' | 'GRCh38';
declare const TOGOVAR_FRONTEND_REFERENCE: Reference;

const RAW_BY_REF = {
  GRCh37: (grch37Json as GRChConditions).conditions,
  GRCh38: (grch38Json as GRChConditions).conditions,
} as const;

const NO_RELATION_BY_REF: Readonly<
  Record<Reference, Readonly<Partial<Record<ConditionTypeValue, true>>>>
> = {
  GRCh37: {
    dataset: true,
    genotype: true,
    pathogenicity_prediction: true,
    id: true,
    location: true,
  },
  GRCh38: {
    dataset: true,
    genotype: true,
    pathogenicity_prediction: true,
    id: true,
    location: true,
  },
};

function normalizeConditions(
  raw: Partial<Record<ConditionTypeValue, string | { label: string }>>,
  noRel: Readonly<Partial<Record<ConditionTypeValue, true>>>
): Readonly<Partial<Record<ConditionTypeValue, ConditionMeta>>> {
  const out: Partial<Record<ConditionTypeValue, ConditionMeta>> = {};
  for (const k in raw) {
    const key = k as ConditionTypeValue;
    const v = raw[key];
    if (!v) continue;
    const label = typeof v === 'string' ? v : v.label;
    out[key] = { label, supportsRelation: !noRel[key] };
  }
  return out;
}

export const ADVANCED_CONDITIONS = normalizeConditions(
  RAW_BY_REF[TOGOVAR_FRONTEND_REFERENCE],
  NO_RELATION_BY_REF[TOGOVAR_FRONTEND_REFERENCE]
);

export const supportsRelation = (t: ConditionTypeValue) =>
  ADVANCED_CONDITIONS[t]?.supportsRelation ?? true;
