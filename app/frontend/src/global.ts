import grch37Json from '../assets/GRCh37/advanced_search_conditions.json';
import grch38Json from '../assets/GRCh38/advanced_search_conditions.json';
import type {
  GRChConditions,
  AdvancedConditionMap,
  Column,
  ColumnConfig,
} from './types';

// ================================
// グローバル定数・設定値
// ================================

/** 現在のページ ID（HTML data-page 属性から取得） */
export const PAGE = document.getElementsByTagName('html')[0].dataset.page;

/** 検索結果テーブルの行高さ（ピクセル） */
export const TR_HEIGHT = 27;

/** 共通ヘッダー高さ（ピクセル） */
export const COMMON_HEADER_HEIGHT = 30;

/** 共通フッター高さ（ピクセル） */
export const COMMON_FOOTER_HEIGHT = 22;

/** TogoVar API エンドポイント */
export const API_URL = TOGOVAR_FRONTEND_API_URL || 'https://togovar.org';


const GRCh37 = grch37Json as GRChConditions;
const GRCh38 = grch38Json as GRChConditions;

/** 染色体バージョンごとの検索条件マップ */
const CONDITIONS_MAP = {
  GRCh37: GRCh37.conditions,
  GRCh38: GRCh38.conditions,
} as const;

/** 染色体バージョンキーの型定義 */
export type Reference = keyof typeof CONDITIONS_MAP;

/** 現在の参照ゲノム（GRCh37 または GRCh38）に対応した検索条件 */
export const ADVANCED_CONDITIONS: Readonly<AdvancedConditionMap> =
  Object.freeze(CONDITIONS_MAP[TOGOVAR_FRONTEND_REFERENCE as Reference]);

// ================================
// 検索結果テーブルの列定義
// ================================

/** 検索結果テーブルで利用可能な全列の定義（TogoVar ID は常に先頭・固定） */
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

/** 列 ID から列定義オブジェクトへの高速マップ */
const COLUMN_MAP = new Map(COLUMNS.map((column) => [column.id, column]));


// ================================
// 列設定管理用のヘルパー関数
// ================================

/**
 * デフォルトの列設定配列を取得
 * - Type 列はデフォルトで非表示（isUsed: false）
 * - その他の列は全て表示
 * @returns デフォルト列設定の配列
 */
export function getDefaultColumnConfigs(): ColumnConfig[] {
  return COLUMNS.map((column) => ({
    id: column.id,
    isUsed: column.id !== 'type',
  }));
}

/**
 * 列設定を正規化（重複排除・欠落列補充・順序保証）
 * - 既に定義済みの列設定を検証し、欠落している列を追加
 * - 重複や不正な列 ID を削除
 * - 常に COLUMNS の定義順序を保証
 * @param columns 正規化対象の列設定配列（オプション）
 * @returns 正規化済みの列設定配列
 */
export function normalizeColumnConfigs(columns: ColumnConfig[] = []): ColumnConfig[] {
  const normalized: ColumnConfig[] = [];
  const usedIds = new Set<string>();

  columns.forEach((column) => {
    if (!COLUMN_MAP.has(column.id) || usedIds.has(column.id)) {
      return;
    }

    normalized.push({ id: column.id, isUsed: column.isUsed });
    usedIds.add(column.id);
  });

  getDefaultColumnConfigs().forEach((column) => {
    if (usedIds.has(column.id)) {
      return;
    }

    normalized.push(column);
  });

  return normalized;
}

/**
 * 表示対象の列オブジェクト配列を取得（isUsed かつ定義順）
 * - normalizeColumnConfigs() で順序保証済みの列から表示対象のみを抽出
 * - テーブル描画に使用
 * @param columns 列設定配列（オプション）
 * @returns 表示対象の Column オブジェクト配列
 */
export function getOrderedColumns(columns: ColumnConfig[] = []): Column[] {
  return normalizeColumnConfigs(columns)
    .map((column) => COLUMN_MAP.get(column.id))
    .filter((column): column is Column => column !== undefined);
}

/**
 * 列 ID から表示用ラベル文字列を取得
 * - 列定義が存在する場合はラベルを返却
 * - 存在しない場合は列 ID をそのまま返却（フォールバック）
 * @param columnId 列 ID
 * @returns ラベル文字列（例: "TogoVar ID"、"Gene"）
 */
export function getColumnLabel(columnId: string): string {
  return COLUMN_MAP.get(columnId)?.label || columnId;
}
