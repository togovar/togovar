/** The core of PanelView.
 * Superclass of
 * {@link PanelViewCheckList},
 * {@link PanelViewFilterAlternativeAlleleFrequency},
 * {@link PanelViewFilterConsequence},
 * {@link PanelViewFilterVariantCallingQuality},
 * {@link PanelViewPreviewAlternativeAlleleFrequencies},
 * {@link PanelViewPreviewClinicalSignificance},
 * {@link PanelViewPreviewConsequence},
 * {@link PanelViewPreviewExternalLinks},
 * {@link PanelViewPreviewGene},
 * {@link PreviewToVariantReport},
 * */
class PanelView {
  /**
   * @param {Element} elm - Panel element section.panel-view
   * @param {string} kind - Panel id (dataset, ferequency, quality, type, significance, consequence, shift, polyphen, alpha_missense) */
  constructor(elm, kind) {
    this.elm = elm;
    this.kind = kind;
    this.localStorageKey = 'panel_' + kind;

    // Use local storage and manage panel opening/closing
    if (window.localStorage.getItem(this.localStorageKey) === 'collapsed') {
      elm.classList.add('-collapsed');
    }
    // collapse event
    elm.querySelector('.title').addEventListener('click', () => {
      elm.classList.toggle('-collapsed');
      window.localStorage.setItem(this.localStorageKey, elm.classList.contains('-collapsed') ? 'collapsed' : '');
    })

  }
}

export default PanelView