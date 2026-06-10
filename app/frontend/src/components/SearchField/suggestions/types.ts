/**
 * APIから返るサジェスト候補の共通構造。
 * suggestions/ 内の複数ファイルで使うため循環依存を避けてこのファイルに集約する。
 * エンドポイントによってキーが異なるため汎用インデックス型を持つが、
 * anyを避けてunknownにすることで意図しない型操作を防ぐ
 */
export interface SuggestionData {
  term?: string;
  alias_of?: string;
  highlight?: string;
  id?: string;
  name?: string;
  symbol?: string;
  [key: string]: unknown;
}
