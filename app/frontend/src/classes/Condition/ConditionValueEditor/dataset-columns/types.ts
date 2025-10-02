/**
 * Type definitions for dataset columns editor
 */

export type UiNode = {
  id: string;
  label: string;
  value?: string;
  children?: UiNode[];
  checked: boolean;
  indeterminate?: boolean;
};

export const ROOT_NODE_ID = '-1';
