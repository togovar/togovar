/**
 * Type definitions for the hierarchical dataset column interface.
 *
 * These types define the data structures used throughout the dataset selection
 * system, from raw configuration data to fully interactive UI elements.
 */

/**
 * Represents a dataset or category node in the hierarchical selection interface.
 *
 * This type extends the basic tree node structure with UI-specific properties
 * needed for the interactive column interface:
 * - Selection state management (checked, indeterminate)
 * - Unique identification for DOM element association
 * - Optional dataset values for actual selection data
 *
 * @interface UiNode
 */
export type UiNode = {
  /** Unique identifier for DOM element association and event handling */
  id: string;

  /** Human-readable name displayed to users in the interface */
  label: string;

  /** Optional dataset value used for actual data selection (undefined for categories) */
  value?: string;

  /** Child nodes for hierarchical navigation (undefined for leaf nodes) */
  children?: UiNode[];

  /** Whether this node is currently selected by the user */
  checked: boolean;

  /** Whether this node is in an indeterminate state (some but not all children selected) */
  indeterminate?: boolean;
};

/**
 * Identifier for the synthetic root node that unifies the entire dataset tree.
 *
 * This root node is not displayed to users but provides a consistent starting
 * point for tree traversal algorithms and ensures all visible categories have
 * a common parent for hierarchical operations.
 */
export const ROOT_NODE_ID = 'synthetic-root';
