export const PAGE = document.getElementsByTagName('html')[0].dataset.page;
export const TR_HEIGHT = 27;

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

export const PREVIEWS = [
  {id: 'Gene', label: 'Genes'},
  {id: 'ExternalLinks', label: 'External Links'},
  {id: 'AlternativeAlleleFrequencies', label: 'Alternative allele frequencies'},
  {id: 'Consequence', label: 'Consequence'},
  {id: 'ClinicalSignificance', label: 'Clinical significance'}
];

export const FILTERS = [
  {id: 'Datasets', label: 'Dataset'},
  {id: 'AlternativeAlleleFrequency', label: 'Alternative allele frequency'},
  {id: 'VariantCallingQuality', label: 'Variant calling quality'},
  {id: 'VariantType', label: 'Variant type'},
  {id: 'ClinicalSignificance', label: 'Clinical significance'},
  {id: 'Consequence', label: 'Consequence'},
  {id: 'SIFT', label: 'SIFT'},
  {id: 'PolyPhen', label: 'PolyPhen'}
];

export function strIns(str, idx, val) {
  var res = str.slice(0, idx) + val + str.slice(idx);
  return res;
}
