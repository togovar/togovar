/**
 * API レスポンス・データモデルの型定義
 *
 * TogoVar API から返るデータ構造を型として管理する。
 * バックエンドのレスポンス形式が変わった場合は、ここを起点に影響範囲を把握する。
 */

// ============================================
// 検索結果・統計データの型
// ============================================

/**
 * /search エンドポイントのレスポンス全体。
 * data と scroll を分離しているのは、ページング処理をデータ本体から独立して扱うため。
 */
export type SearchResults = {
  data: ResultData[];
  scroll: ScrollData;
};

/**
 * /statistics エンドポイントのレスポンス全体。
 * SearchResults と同じ scroll 構造を使うことで、ページング処理を共通化できる。
 */
export type SearchStatistics = {
  statistics: StatisticsData;
  scroll: ScrollData;
};

/**
 * 検索結果のページング情報。
 * limit・offset・max_rows の3値でスクロールフェッチの状態を管理する。
 */
export type ScrollData = {
  limit: number;
  max_rows: number;
  offset: number;
};

/**
 * 検索結果の統計情報。
 * dataset・type・significance・consequence は「ID → 件数」のマップで返るため Record を使う。
 */
export type StatisticsData = {
  total: number;
  filtered: number;
  dataset: Record<string, number>;
  type: Record<string, number>;
  significance: Record<string, number>;
  consequence: Record<string, number>;
};

// ============================================
// マスタデータ・設定の型
// ============================================

/** データセットマスタ全体。配列を直接返さず items でラップしているのは API 仕様に合わせた形。 */
export type DatasetMaster = {
  items: DatasetMasterItem[];
};

/**
 * データセットマスタの各エントリ。
 * has_freq は頻度情報を持つデータセットかどうかを示し、検索条件UIの出し分けに使う。
 */
export type DatasetMasterItem = {
  id: string;
  label: string;
  type: string;
  default: string;
  has_freq: boolean;
};

/** バリアント種別マスタの各エントリ。 */
export type TypeMasterItem = {
  id: string;
  label: string;
  type: string;
  default: string;
};

/**
 * 臨床的意義（consequence）マスタの各エントリ。
 * description は他のマスタにはない追加フィールドで、検索UIのツールチップ表示に使う。
 */
export type ConsequenceMasterItem = {
  id: string;
  label: string;
  type: string;
  default: string;
  description: string;
};

// ============================================
// テーブル・カラム設定の型
// ============================================

/**
 * 検索結果テーブルのカラム定義。
 * defaultWidth はユーザー操作によるリサイズ前の初期幅で、レイアウト計算の基準値になる。
 */
export type Column = {
  id: string;
  label: string;
  defaultWidth: number;
  resizable?: boolean;
};

// ============================================
// 結果データ・エンティティの型
// ============================================

/**
 * バリアント1件分の検索結果データ。
 * TogoVar API の /search レスポンスの data 配列の各要素に対応する。
 */
export type ResultData = {
  id: string;
  type: string;
  chromosome: string;
  position: number;
  start: number;
  stop: number;
  reference: string;
  alternate: string;
  vcf: Vcf;
  existing_variations: string[];
  symbols: GeneSymbol[];
  external_link: ExternalLink;
  significance: Significance[];
  most_severe_consequence: string;
  sift: number;
  polyphen: number;
  alphamissense: number;
  transcripts: Transcript[];
  frequencies: Frequency[];
};

/** VCF形式の座標・アレル情報。position は VCF の POS カラム、reference/alternate は REF/ALT に対応する。 */
export type Vcf = {
  position: number;
  reference: string;
  alternate: string;
};

/**
 * バリアントに関連する遺伝子シンボル。
 * synonyms は同じ遺伝子の別名一覧で、検索・表示時の名寄せに使う。
 */
export type GeneSymbol = {
  name: string;
  id: number;
  synonyms: string[];
};

/**
 * 外部データベースへのリンク情報。
 * バリアントによってリンク先が存在しない場合があるため、各フィールドをオプショナルにしている。
 */
export type ExternalLink = {
  dbsnp?: ExternalLinkItem[];
  clinvar?: ExternalLinkItem[];
  tommo?: ExternalLinkItem[];
  gnomad?: ExternalLinkItem[];
};

/** 外部リンク1件分。title は表示ラベル、xref はリンク先の識別子。 */
export type ExternalLinkItem = {
  title: string;
  xref: string;
};

/**
 * ClinVar 等の臨床的意義情報。
 * conditions は関連疾患の一覧、interpretations は pathogenic/benign 等の分類ラベル。
 */
export type Significance = {
  conditions: { name: string; medgen: string }[];
  interpretations: string[];
  submission_count: number;
  source: string;
};

/**
 * トランスクリプト単位のバリアント影響情報。
 * consequence は配列で複数の機能影響を同時に持てる仕様になっている。
 */
export type Transcript = {
  hgnc_id: number;
  symbol: { source: string; label: string };
  sift: number;
  transcript_id: string;
  consequence: string[];
  consequence_type: string;
  hgvs_p: string;
  hgvs_c: string;
  alphamissense: number;
  gene_id: string;
  polyphen: number;
  hgvs_g: string;
};

/**
 * データセット別のアレル頻度情報。
 * データセットによって提供される値が異なるため、各フィールドをオプショナルにしている。
 * ac: アレル数 / aac: 代替アレル数 / af: アレル頻度 / an: 総アレル数 / hac: ホモ接合数
 */
export type Frequency = {
  ac?: number;
  aac?: number;
  af?: number;
  an?: number;
  hac?: number;
  filter?: string[];
  source?: string;
};

/**
 * Results テーブルで使う頻度情報のマップ。
 * キーはデータセットID。FrequencyElement を介しているのは将来の型変更を1箇所で吸収するため。
 */
export type TdFrequencies = Record<string, FrequencyElement>;
export type FrequencyElement = FrequencyBlockElement;

// ============================================
// Results 表示・処理の型
// ============================================

/**
 * Results テーブルの行データ型。
 * chromosome と start は必須だが、その他の表示カラムはAPIレスポンスの構造が確定していないため
 * index signatureで受けている。
 * TODO: APIレスポンスの実際のキーを調査して具体的な型に置き換える
 */
export type ResultsRecord = {
  chromosome: string;
  start: number;
  [key: string]: unknown;
};
