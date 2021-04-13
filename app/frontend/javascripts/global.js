export const PAGE = document.getElementsByTagName('html')[0].dataset.page;
export const TR_HEIGHT = 27;
export const COMMON_HEADER_HEIGHT = 30;
export const COMMON_FOOTER_HEIGHT = 22;
export const API_URL = process.env.TOGOVAR_FRONTEND_API_URL || 'https://togovar.biosciencedbc.jp';

export const COLUMNS = [
  {label: 'TogoVar ID', id: 'togovar_id', tooltip: 'Scores which indicate the predicted effects on the protein function when an amino acid sequence undergoes alteration due to a variant. No Link'},
  {label: 'RefSNP ID', id: 'refsnp_id', tooltip: 'Scores which indicate the predicted effects on the protein function when an amino acid sequence undergoes alteration due to a variant.' , link: 'link'},
  {label: 'Position', id: 'position', tooltip: 'Value of clinical significance calculated in ClinVar. no link'},
  {label: 'Ref / Alt', id: 'ref_alt', tooltip: 'Value of clinical significance calculated in ClinVar.' , link: 'link'},
  {label: 'Type', id: 'type', tooltip: 'Value of clinical significance calculated in ClinVar.' , link: 'link'},
  {label: 'Gene', id: 'gene' , tooltip: 'Value of clinical significance calculated in ClinVar.' , link: 'link'},
  {label: 'Alt frequency', id: 'alt_frequency' , tooltip: 'The indicator represents the alternative allele frequency for each dataset.' , link: 'link'},
  {label: 'Consequence', id: 'consequence' , tooltip: 'The value of variant consequence in Variant Effect Predictor (VEP).s which indicate the predicted effects on the protein function when an amino acid sequence undergoes alteration due to a variant.' , link: 'link'},
  {label: 'SIFT', id: 'sift', tooltip: 'Scores which indicate the predicted effects on the protein function when an amino acid sequence undergoes alteration due to a variant.' , link: 'link'},
  {label: 'PolyPhen', id: 'polyphen', tooltip: 'Scores which indicate the predicted effects on the protein function when an amino acid sequence undergoes alteration due to a variant.' , link: 'link'},
  {label: 'Clinical significance', id: 'clinical_significance', tooltip: 'Value of clinical significance calculated in ClinVar.' , link: 'link'}
];

export function strIns(str, idx, val) {
  return str.slice(0, idx) + val + str.slice(idx);
}
