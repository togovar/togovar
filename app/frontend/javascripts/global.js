export const PAGE = document.getElementsByTagName('html')[0].dataset.page;
export const TR_HEIGHT = 27;
export const COMMON_HEADER_HEIGHT = 30;
export const COMMON_FOOTER_HEIGHT = 22;
export const API_URL = TOGOVAR_FRONTEND_API_URL || 'https://togovar.org';
export const ADVANCED_CONDITIONS = Object.freeze(
  ((reference) => {
    switch (reference) {
      case 'GRCh37':
        return require('../assets/GRCh37/advanced_search_conditions.json')
          .conditions;
      case 'GRCh38':
        return require('../assets/GRCh38/advanced_search_conditions.json')
          .conditions;
      default:
        return [];
    }
  })(TOGOVAR_FRONTEND_REFERENCE)
);

export const COLUMNS = [
  { label: 'TogoVar ID', id: 'togovar_id' },
  { label: 'RefSNP ID', id: 'refsnp_id' },
  { label: 'Position', id: 'position' },
  { label: 'Ref / Alt', id: 'ref_alt' },
  { label: 'Type', id: 'type' },
  { label: 'Gene', id: 'gene' },
  { label: 'Alt frequency', id: 'alt_frequency' },
  { label: 'Consequence', id: 'consequence' },
  { label: 'SIFT', id: 'sift' },
  { label: 'PolyPhen', id: 'polyphen' },
  { label: 'AlphaMissense', id: 'alpha_missense' },
  { label: 'Clinical significance', id: 'clinical_significance' },
];

export function strIns(str, idx, val) {
  return str.slice(0, idx) + val + str.slice(idx);
}
