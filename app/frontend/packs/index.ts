// 全ページ共通スタイルシート。エントリポイントで一括ロードしてwebpackに依存関係を認識させる。
import '../stylesheets/main.sass';

// PAGEはWebpackのDefinePluginでHTMLテンプレートごとに埋め込まれるページ識別子。
import { PAGE } from '../src/global';

// カスタム要素の登録はimport副作用で行われるため、明示的な参照がなくてもここで読み込む必要がある。
import '../src/components/FrequencyBlockView';

// file-loaderでdistにそのままコピーし、ファビコンのURLをwebpackの管理下に置く。
import '!file-loader?name=[name].[ext]!../images/favicon.svg';

/**
 * ページ種別に応じたモジュールを動的importで遅延ロードする。
 * 静的importにするとすべてのページでhomeモジュールがバンドルされるため、
 * 不要なコードを読み込まないよう動的importでコード分割する。
 */
async function init(): Promise<void> {
  if (PAGE === 'home') {
    try {
      const homeModule = await import('../src/home');
      homeModule.initHome();
    } catch (error) {
      console.error('Failed to import home module:', error);
    }
  }
}

// DOMContentLoaded前にスクリプトが実行された場合はイベント待ち、
// すでにDOM構築済み（defer/async）の場合は即時実行する。
if (
  document.readyState === 'complete' ||
  document.readyState === 'interactive'
) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}