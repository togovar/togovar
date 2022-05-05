export const PAGE = document.getElementsByTagName('html')[0].dataset.page;
export const TR_HEIGHT = 27;
export const COMMON_HEADER_HEIGHT = 30;
export const COMMON_FOOTER_HEIGHT = 22;
// export const API_URL = process.env.TOGOVAR_FRONTEND_API_URL || 'https://togovar.biosciencedbc.jp';
export const API_URL = 'https://togovar-stg.biosciencedbc.jp';
export const ADVANCED_CONDITIONS = Object.freeze((require('../assets/advanced_search_conditions.json')).conditions);


export const COLUMNS = [
  {label: 'TogoVar ID', id: 'togovar_id'},
  {label: 'RefSNP ID', id: 'refsnp_id'},
  {label: 'Position', id: 'position'},
  {label: 'Ref / Alt', id: 'ref_alt'},
  {label: 'Type', id: 'type'},
  {label: 'Gene', id: 'gene'},
  {label: 'Alt frequency', id: 'alt_frequency'},
  {label: 'Consequence', id: 'consequence'},
  {label: 'SIFT', id: 'sift'},
  {label: 'PolyPhen', id: 'polyphen'},
  {label: 'Clinical significance', id: 'clinical_significance'}
];

export function strIns(str, idx, val) {
  return str.slice(0, idx) + val + str.slice(idx);
}
