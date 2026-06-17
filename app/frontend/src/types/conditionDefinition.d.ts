/**
 * Advanced Search 条件UIマスタデータの型定義
 *
 * `assets/GRCh3{7,8}/advanced_search_conditions.json` を読み込んだ結果の型を定義する。
 * 検索APIに送るクエリ構造（ConditionQuery など）は query.d.ts に分離されている。
 *
 * 条件種別（ConditionTypeValue）ごとにUI描画の方法が異なるため、
 * `type` フィールドで分岐できる discriminated union を使う。
 */

import type { ConditionTypeValue } from '../definition';
import type { SignificanceSource } from './query';

// ───────────────────────────────────────────────────────────────────────────
// 共通サブ型
// ───────────────────────────────────────────────────────────────────────────

/** チェックボックス・リスト選択肢1件分。value がAPIに送る値、label が表示文字列。 */
interface EnumerationItem {
  value: string;
  label: string;
}

/**
 * データセット・ジェノタイプなど、階層選択UIを持つ条件のツリーノード。
 * 再帰的な children を持つことでグループと選択肢を同じ型で扱う。
 */
type TreeNode =
  | { label: string; children: ReadonlyArray<TreeNode> }
  | { label: string; value: string; children?: ReadonlyArray<TreeNode> };

// ───────────────────────────────────────────────────────────────────────────
// peculiar 条件（値構造が他の種別と異なる）
// ───────────────────────────────────────────────────────────────────────────

/**
 * ツリー選択UIを持つ peculiar 条件のキー一覧。
 * UIがこのキーを参照して、フラット選択ではなくツリー選択UIを描画する。
 */
export type PeculiarWithTreeKeys = 'dataset' | 'genotype';

/**
 * 値を持たない peculiar 条件のキー一覧。
 * UIは値リストではなくキー自体から描画内容を決定する。
 */
export type PeculiarEmptyKeys = 'location' | 'pathogenicity_prediction';

/** データセット選択条件。階層ツリーで選択する peculiar 型。 */
export interface DatasetCondition {
  label: string;
  type: 'peculiar';
  values: ReadonlyArray<TreeNode>;
}

/** ジェノタイプ選択条件。階層ツリーで選択する peculiar 型。 */
export interface GenotypeCondition {
  label: string;
  type: 'peculiar';
  values: ReadonlyArray<TreeNode>;
}

/** 染色体位置条件。値リストを持たず、UIがエディター内部で座標入力を提供する。 */
export interface LocationCondition {
  label: string;
  type: 'peculiar';
}

/** 病原性予測条件。値リストを持たず、UIがスライダーを提供する。 */
export interface PathogenicityPredictionCondition {
  label: string;
  type: 'peculiar';
}

// ───────────────────────────────────────────────────────────────────────────
// enumeration 条件（チェックボックス選択）
// ───────────────────────────────────────────────────────────────────────────

/**
 * 臨床的意義（significance）の選択肢。mgend と clinvar でソースが異なるため
 * SignificanceSource をキーとしたレコードで管理する。
 * Mutable は内部で値を積み上げるときに使い、読み取りには SignificanceValues を使う。
 */
type MutableSignificanceValues = {
  [K in SignificanceSource]: EnumerationItem[];
};

/** 読み取り専用の significance 選択肢。コンポーネント間の受け渡しに使う。 */
type SignificanceValues = Readonly<
  Record<SignificanceSource, ReadonlyArray<EnumerationItem>>
>;

/** 臨床的意義条件。mgend/clinvar のソース別選択肢を持つ enumeration 型。 */
interface SignificanceCondition {
  label: string;
  type: 'enumeration';
  values: SignificanceValues;
}

/** バリアント種別などフラットな選択肢を持つ enumeration 型。 */
interface CheckboxesCondition {
  label: string;
  type: 'enumeration';
  values: ReadonlyArray<EnumerationItem>;
}

// ───────────────────────────────────────────────────────────────────────────
// tree 条件（consequence — 数値IDで参照するツリー構造）
// ───────────────────────────────────────────────────────────────────────────

/**
 * consequence ツリーの各ノード。
 * children は ID 配列で参照するため、TreeNode のような再帰ではなくフラット配列で持つ。
 * 描画時に ID を辿ってツリーを再構成する。
 */
export interface ConsequenceNodeBase {
  id: number;
  label: string;
  parent?: number;
  children?: number[];
  value?: string;
  description?: string;
}

/** consequence 選択条件。数値IDで参照するツリー構造を持つ。 */
export interface TreeCondition {
  label: string;
  type: 'tree';
  values: ConsequenceNodeBase[];
}

// ───────────────────────────────────────────────────────────────────────────
// text 条件（遺伝子名・疾患名などのテキスト入力）
// ───────────────────────────────────────────────────────────────────────────

/** テキスト入力で検索する条件。disease や gene が該当。選択肢は持たない。 */
interface TextCondition {
  label: string;
  type: 'text';
}

// ───────────────────────────────────────────────────────────────────────────
// 統合型
// ───────────────────────────────────────────────────────────────────────────

/**
 * 全条件種別の定義を束ねた discriminated union。
 * `type` フィールドで分岐することで、各エディターが必要な値構造だけを参照できる。
 */
export type ConditionDefinition =
  | DatasetCondition
  | GenotypeCondition
  | LocationCondition
  | PathogenicityPredictionCondition
  | TreeCondition
  | TextCondition
  | SignificanceCondition
  | CheckboxesCondition;

/**
 * 条件キーをキー、条件定義を値とするマップ。
 * 型が確定しているキーには具体型を当て、それ以外は unknown で受ける。
 * 将来の条件追加でここを拡張するだけで、エディター側の型推論が追随する。
 */
type AdvancedConditionMap = Partial<
  Record<
    Exclude<
      ConditionTypeValue,
      | 'dataset'
      | 'genotype'
      | 'location'
      | 'pathogenicity_prediction'
      | 'significance'
      | 'type'
    >,
    unknown
  >
> & {
  dataset?: DatasetCondition;
  genotype?: GenotypeCondition;
  location?: LocationCondition;
  pathogenicity_prediction?: PathogenicityPredictionCondition;
  significance?: SignificanceCondition;
  type?: CheckboxesCondition;
};

/** 参照ゲノム別 JSON（advanced_search_conditions.json）のルート型。 */
interface GRChConditions {
  conditions: AdvancedConditionMap;
}
