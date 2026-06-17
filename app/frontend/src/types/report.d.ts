/**
 * レポートページの型定義
 *
 * variant / gene / disease レポートページで使うStanza設定と
 * ルーティング情報の型を管理する。
 */

// ============================================
// 環境・エンドポイント設定
// ============================================

/**
 * Stanzaコンポーネントが参照するAPIエンドポイントと設定値をまとめた型。
 * global.d.ts の定数とは別で、Stanzaに渡すオブジェクトとして使う。
 */
export interface EnvironmentConfig {
  readonly TOGOVAR_FRONTEND_API_URL: string;
  readonly TOGOVAR_FRONTEND_REFERENCE: string;
  readonly TOGOVAR_STANZA_SPARQL: string;
  readonly TOGOVAR_STANZA_SPARQLIST: string;
  readonly TOGOVAR_STANZA_SEARCH: string;
  readonly TOGOVAR_STANZA_JBROWSE: string;
}

// ============================================
// Stanza設定
// ============================================

/**
 * Stanzaコンポーネント1つ分の設定。
 * scriptUrl を省略すると、デフォルトのStanza配信URLを使う。
 * references を指定すると、現在の参照ゲノムが一致するときだけ描画する。
 */
export interface StanzaConfig {
  id: string;
  targetSelector: string;
  scriptUrl?: string;
  options?: Record<string, unknown>;
  references?: string[];
}

/**
 * レポートページ1種別分の設定。
 * stanza 配列に並べた順に描画される。
 * id は URL パスから取得するレポート識別子のキー名（省略時は 'id'）。
 */
export interface ReportConfig {
  base_options?: Record<string, unknown>;
  stanza?: StanzaConfig[];
  id?: string;
}

// ============================================
// ルーティング
// ============================================

/**
 * URLパスを解析した結果。
 * reportType は variant / gene / disease など、reportId はそれぞれの識別子。
 */
export interface RouteInfo {
  reportType: string;
  reportId: string;
}
