/**
 * 統計情報・フィルターパネルの基底クラス。
 * 各パネルの開閉状態をローカルストレージで永続化する共通機能を提供する。
 *
 * 以下のサブクラスで継承される:
 * {@link PanelViewCheckList} - チェックリスト形式のフィルター
 * {@link PanelViewFilterAlternativeAlleleFrequency} - アレル頻度フィルター
 * {@link PanelViewFilterConsequence} - Consequenceフィルター
 * {@link PanelViewFilterVariantCallingQuality} - バリアントコール品質フィルター
 * {@link PanelViewPreviewAlternativeAlleleFrequencies} - アレル頻度プレビュー
 * {@link PanelViewPreviewClinicalSignificance} - 臨床的意義プレビュー
 * {@link PanelViewPreviewConsequence} - Consequenceプレビュー
 * {@link PanelViewPreviewExternalLinks} - 外部リンクプレビュー
 * {@link PanelViewPreviewGene} - 遺伝子プレビュー
 * {@link PreviewToVariantReport} - バリアントレポートへのリンク
 */
class PanelView {
  /** パネルのルート要素 (section.panel-view) */
  elm: Element;
  /** パネルの種別ID (dataset / frequency / quality / type / significance / consequence / sift / polyphen / alphamissense) */
  kind: string;
  /** ローカルストレージに開閉状態を保存するキー名 */
  localStorageKey: string;

  /**
   * @param elm - パネルのルート要素 (section.panel-view)
   * @param kind - パネルの種別ID
   */
  constructor(elm: Element, kind: string) {
    this.elm = elm;
    this.kind = kind;
    // ローカルストレージのキーはパネルごとに一意になるよう kind を付加する
    this.localStorageKey = 'panel_' + kind;

    // 前回のセッションで折りたたまれていた場合、初期表示も折りたたみ状態にする
    if (window.localStorage.getItem(this.localStorageKey) === 'collapsed') {
      elm.classList.add('-collapsed');
    }

    // タイトルクリックでパネルの開閉をトグルし、状態をローカルストレージに保存する
    elm.querySelector('.title')?.addEventListener('click', () => {
      elm.classList.toggle('-collapsed');
      window.localStorage.setItem(
        this.localStorageKey,
        elm.classList.contains('-collapsed') ? 'collapsed' : ''
      );
    });
  }
}

export default PanelView;
