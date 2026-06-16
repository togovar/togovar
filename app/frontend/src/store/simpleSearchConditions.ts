import { storeManager } from './StoreManager';
import type {
  MasterConditionId,
  MasterConditions,
  SimpleSearchCurrentConditions,
} from '../types';

/**
 * Simple SearchのURL/API送信用条件だけを取り出すため、マスター定義のdefaultと比較する。
 */
export function extractSearchCondition(
  currentConditions: SimpleSearchCurrentConditions = {} as SimpleSearchCurrentConditions
): Record<string, unknown> {
  const masterSearchConditions: MasterConditions[] = storeManager.getData(
    'simpleSearchConditionsMaster'
  );

  const diffConditions: Record<string, unknown> = {};
  const conditionMap = new Map(
    masterSearchConditions.map((condition) => [condition.id, condition])
  );

  for (const [conditionKey, conditionValue] of Object.entries(
    currentConditions
  )) {
    const masterCondition = conditionMap.get(conditionKey as MasterConditionId);
    if (!masterCondition) continue;

    switch (masterCondition.type) {
      case 'array': {
        const filteredValues: Record<string, string | number> = {};
        if (typeof conditionValue === 'object' && conditionValue !== null) {
          for (const [itemKey, itemValue] of Object.entries(conditionValue)) {
            const defaultValue = masterCondition.items?.find(
              (item) => item.id === itemKey
            )?.default;
            if (itemValue !== defaultValue) {
              filteredValues[itemKey] = itemValue;
            }
          }
        }
        if (Object.keys(filteredValues).length > 0) {
          diffConditions[conditionKey] = filteredValues;
        }
        break;
      }

      case 'boolean':
      case 'string': {
        const defaultValue = masterCondition.default;
        if (conditionValue !== defaultValue) {
          diffConditions[conditionKey] = conditionValue;
        }
        break;
      }
    }
  }

  return diffConditions;
}
