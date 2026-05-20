import type { Column, ColumnConfig } from './types';

const MIN_COLUMN_WIDTH = 48;

/** 検索結果テーブルで利用可能な全列の定義（TogoVar ID は常に先頭・固定） */
export const COLUMNS = [
  { label: 'TogoVar ID', id: 'togovar_id', defaultWidth: 124 },
  { label: 'RefSNP ID', id: 'refsnp_id', defaultWidth: 116 },
  { label: 'Position', id: 'position', defaultWidth: 164 },
  { label: 'Ref / Alt', id: 'ref_alt', defaultWidth: 104 },
  { label: 'Type', id: 'type', defaultWidth: 96 },
  { label: 'Gene', id: 'gene', defaultWidth: 116 },
  { label: 'Alt frequency', id: 'alt_frequency', defaultWidth: 236 },
  { label: 'Consequence', id: 'consequence', defaultWidth: 176 },
  {
    label: 'Clinical significance',
    id: 'clinical_significance',
    defaultWidth: 276,
  },
  { label: 'AlphaMissense', id: 'alphamissense', defaultWidth: 126 },
  { label: 'SIFT', id: 'sift', defaultWidth: 88 },
  { label: 'PolyPhen', id: 'polyphen', defaultWidth: 98 },
];

/** 列 ID から列定義オブジェクトへの高速マップ */
const COLUMN_MAP = new Map(COLUMNS.map((column) => [column.id, column]));

/** 常に先頭に固定される列の ID（TogoVar ID） */
export const LOCKED_COLUMN_ID = 'togovar_id';

/** 値が有効な列設定かどうかを判定 */
function isColumnConfig(value: unknown): value is ColumnConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<ColumnConfig>).id === 'string' &&
    typeof (value as Partial<ColumnConfig>).isUsed === 'boolean'
  );
}

function getColumnOrThrow(columnId: string): Column {
  const column = COLUMN_MAP.get(columnId);

  if (!column) {
    throw new Error(`Unknown column: ${columnId}`);
  }

  return column;
}

function normalizeColumnWidth(columnId: string, width: unknown): number {
  const column = getColumnOrThrow(columnId);

  if (typeof width !== 'number' || !Number.isFinite(width)) {
    return column.defaultWidth;
  }

  return Math.max(MIN_COLUMN_WIDTH, Math.round(width));
}

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
    width: column.defaultWidth,
  }));
}

/**
 * 列設定を正規化（固定列制約・ユーザー順序保持・重複排除・欠落列補充）
 * - TogoVar ID 列は常に先頭かつ表示状態に固定
 * - 既に定義済みの列設定を検証し、固定列以外は渡された列順を保持
 * - 重複や不正な列 ID を削除
 * - 欠落している列は COLUMNS の定義順で末尾に追加
 * @param columns 正規化対象の値（配列以外は空配列として扱う）
 * @returns 正規化済みの列設定配列
 */
export function normalizeColumnConfigs(
  columns: readonly unknown[] | unknown = []
): ColumnConfig[] {
  const normalized: ColumnConfig[] = [];
  const usedIds = new Set<string>();

  const sourceColumns = Array.isArray(columns) ? columns : [];

  sourceColumns.forEach((column) => {
    if (!isColumnConfig(column)) {
      return;
    }

    if (!COLUMN_MAP.has(column.id) || usedIds.has(column.id)) {
      return;
    }

    normalized.push({
      id: column.id,
      isUsed: column.id === LOCKED_COLUMN_ID ? true : column.isUsed,
      width: normalizeColumnWidth(column.id, column.width),
    });
    usedIds.add(column.id);
  });

  getDefaultColumnConfigs().forEach((column) => {
    if (usedIds.has(column.id)) {
      return;
    }

    normalized.push(column);
  });

  const lockedIndex = normalized.findIndex(
    (column) => column.id === LOCKED_COLUMN_ID
  );

  if (lockedIndex === -1) {
    normalized.unshift({ id: LOCKED_COLUMN_ID, isUsed: true });
    return normalized;
  }

  const [lockedColumn] = normalized.splice(lockedIndex, 1);
  normalized.unshift({ ...lockedColumn, isUsed: true });
  return normalized;
}

/**
 * 列設定順に対応する列オブジェクト配列を取得
 * - normalizeColumnConfigs() で正規化済みの列を Column 定義へ変換
 * - isUsed による表示/非表示は呼び出し側の CSS 制御で扱う
 * - テーブル DOM 生成に使用
 * @param columns 列設定配列（オプション）
 * @returns 列設定順に対応する Column オブジェクト配列
 */
export function getOrderedColumns(
  columns: readonly unknown[] | unknown = []
): Column[] {
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

export function getColumnDefaultWidth(columnId: string): number {
  return COLUMN_MAP.get(columnId)?.defaultWidth || 100;
}

export function getMinColumnWidth(): number {
  return MIN_COLUMN_WIDTH;
}
