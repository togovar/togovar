import grch37Json from '../assets/GRCh37/advanced_search_conditions.json';
import grch38Json from '../assets/GRCh38/advanced_search_conditions.json';
import type {
  GRChConditions,
  AdvancedConditionMap,
} from './types';

// ================================
// グローバル定数・設定値
// ================================

/** 現在のページ ID（HTML data-page 属性から取得） */
export const PAGE =
  typeof document !== 'undefined'
    ? document.getElementsByTagName('html')[0]?.dataset.page
    : undefined;

/** 検索結果テーブルの行高さ（ピクセル） */
export const TR_HEIGHT = 27;

/** 共通ヘッダー高さ（ピクセル） */
export const COMMON_HEADER_HEIGHT = 30;

/** 共通フッター高さ（ピクセル） */
export const COMMON_FOOTER_HEIGHT = 22;

/** TogoVar API エンドポイント */
export const API_URL =
  typeof TOGOVAR_FRONTEND_API_URL !== 'undefined'
    ? TOGOVAR_FRONTEND_API_URL
    : 'https://togovar.org';


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
const currentReference: Reference =
  typeof TOGOVAR_FRONTEND_REFERENCE !== 'undefined' &&
  TOGOVAR_FRONTEND_REFERENCE in CONDITIONS_MAP
    ? (TOGOVAR_FRONTEND_REFERENCE as Reference)
    : 'GRCh38';

export const ADVANCED_CONDITIONS: Readonly<AdvancedConditionMap> =
  Object.freeze(CONDITIONS_MAP[currentReference]);
