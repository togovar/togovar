/**
 * Advanced Search UIビルダー型定義
 *
 * 条件入力UIとクエリビルダーが使う型を定義する。
 * Store/APIレイヤーが扱う検索条件クエリ型（ConditionQuery、各Leaf型など）は
 * query.d.ts に分離されており、ここでは参照のみ行う。
 */

import type { ConditionTypeValue } from '../definition';
import type { NoRelationType } from '../conditions';
import type { ConditionItemView } from '../components/Condition/ConditionItemView';
import type ConditionValues from '../components/Condition/ConditionValues';
import type { ConditionItemValueView } from '../components/Condition/ConditionItemValueView';
import type { PredictionKey } from '../components/Condition/ConditionPathogenicityPredictionSearch/PredictionDatasets';
import type { ConditionQuery, Relation, Inequality } from './query';

// ───────────────────────────────────────────────────────────────────────────
// Builder
// ───────────────────────────────────────────────────────────────────────────
/** Context object passed to query builders */
type BuildContext<T extends ConditionTypeValue> = {
  type: T;
  values: ConditionItemValueView[];
  valuesContainer: HTMLDivElement;
} & (T extends NoRelationType
  ? { relation?: undefined }
  : { relation: Relation });

type BuilderMap = {
  [K in ConditionTypeValue]?: (ctx: BuildContext<K>) => ConditionQuery;
};

// ───────────────────────────────────────────────────────────────────────────
// Prediction UI イベント
// ───────────────────────────────────────────────────────────────────────────
/** 予測スコアUIコンポーネント間のカスタムイベントペイロード */
interface PredictionChangeDetail {
  dataset: PredictionKey;
  values: [number, number];
  inequalitySigns: [Inequality, Inequality];
  unassignedChecks?: string[];
  includeUnassigned?: boolean;
  includeUnknown?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// ツールバーコマンド
// ───────────────────────────────────────────────────────────────────────────
/** Command identifiers handled by the toolbar. */
type Command = 'add-condition' | 'group' | 'ungroup' | 'delete';

type CommandDef = Readonly<{
  command: Command;
  label: string;
  // TODO: Key codes (display only). Currently informational; no keybindings here.
  shortcut: number[];
}>;

/** Logical operator used to combine child conditions. */
type LogicalOperator = 'and' | 'or';

// ───────────────────────────────────────────────────────────────────────────
// エディター抽象
// ───────────────────────────────────────────────────────────────────────────
/** Minimal interface all editors must satisfy. */
interface ConditionValueEditor {
  keepLastValues(): void; // Capture current state when editing begins
  restore(): void; // Restore captured state when user cancels
  readonly isValid: boolean; // Whether this editor currently has a valid value
  applyOptions(options: unknown): void; // Apply initial options (e.g., from karyotype selection)
}

/** Constructor signature for editor classes. */
type EditorCtor = new (
  host: ConditionValues,
  view: ConditionItemView
) => ConditionValueEditor;

// ───────────────────────────────────────────────────────────────────────────
// エディターセクション
// ───────────────────────────────────────────────────────────────────────────
type EditorSectionClassName =
  | 'columns-editor-view' // dataset, consequence, genotype
  | 'frequency-count-editor-view' // dataset, genotype
  | 'clinical-significance-view' // significance
  | 'text-field-editor-view' // disease, gene, variant id
  | 'location-editor-view' // location
  | 'pathogenicity-editor-view' // pathogenicity
  | 'checkboxes-editor-view'; // variant type
