import type { ConditionTypeValue } from './definition';
import type { Reference } from './global';

const NO_RELATION_BY_REF = {
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
} as const satisfies Record<
  Reference,
  Readonly<Partial<Record<ConditionTypeValue, true>>>
>;

export type NoRelationType = keyof (typeof NO_RELATION_BY_REF)[Reference];
export type KeysWithRelation = Exclude<ConditionTypeValue, NoRelationType>;

export const supportsRelation = <T extends ConditionTypeValue>(
  t: T
): t is Exclude<T, NoRelationType> =>
  !((t as NoRelationType) in NO_RELATION_BY_REF[TOGOVAR_FRONTEND_REFERENCE]);
