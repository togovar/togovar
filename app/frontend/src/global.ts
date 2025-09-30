import grch37Json from '../assets/GRCh37/advanced_search_conditions.json';
import grch38Json from '../assets/GRCh38/advanced_search_conditions.json';
import type { ConditionTypeValue } from './definition';
import type { GRChConditions, ConditionDefinition } from './types';

export const PAGE = document.getElementsByTagName('html')[0].dataset.page;
export const TR_HEIGHT = 27;
export const COMMON_HEADER_HEIGHT = 30;
export const COMMON_FOOTER_HEIGHT = 22;
export const API_URL = TOGOVAR_FRONTEND_API_URL || 'https://togovar.org';

const GRCh37: GRChConditions = grch37Json as unknown as GRChConditions;
const GRCh38: GRChConditions = grch38Json as unknown as GRChConditions;

const CONDITIONS_MAP = {
  GRCh37: GRCh37.conditions,
  GRCh38: GRCh38.conditions,
} as const;

export type Reference = keyof typeof CONDITIONS_MAP;

export const ADVANCED_CONDITIONS = Object.freeze(
  CONDITIONS_MAP[TOGOVAR_FRONTEND_REFERENCE as Reference]
) as Readonly<Partial<Record<ConditionTypeValue, ConditionDefinition>>>;

export const COLUMNS = [
  { label: 'TogoVar ID', id: 'togovar_id' },
  { label: 'RefSNP ID', id: 'refsnp_id' },
  { label: 'Position', id: 'position' },
  { label: 'Ref / Alt', id: 'ref_alt' },
  { label: 'Type', id: 'type' },
  { label: 'Gene', id: 'gene' },
  { label: 'Alt frequency', id: 'alt_frequency' },
  { label: 'Consequence', id: 'consequence' },
  { label: 'Clinical significance', id: 'clinical_significance' },
  { label: 'AlphaMissense', id: 'alphamissense' },
  { label: 'SIFT', id: 'sift' },
  { label: 'PolyPhen', id: 'polyphen' },
];
