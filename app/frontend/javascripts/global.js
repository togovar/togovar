export const PAGE = document.getElementsByTagName('html')[0].dataset.page;
export const TR_HEIGHT = 27;
export const COMMON_HEADER_HEIGHT = 30;
export const COMMON_FOOTER_HEIGHT = 22;
export const API_URL = process.env.TOGOVAR_FRONTEND_API_URL || 'https://togovar.biosciencedbc.jp';
  
export const COLUMNS = [
  {id: 'tgv_id', label: 'TogoVar ID', header: 'tgv_id'},
  {id: 'rs', label: 'RefSNP ID', header: 'rs'},
  {id: 'chr_position', label: 'Position', header: 'chr_position'},
  {id: 'ref_alt', label: 'Ref / Alt', header: 'ref_alt'},
  {id: 'variant_type', label: 'Type', header: 'variant_type'},
  {id: 'symbol', label: 'Gene', header: 'symbol'},
  {id: 'allele_freq', label: 'Alt frequency', header: 'allele_freq'},
  {id: 'consequence', label: 'Consequence', header: 'consequence'},
  {id: 'sift_value', label: 'SIFT', header: 'sift_value'},
  {id: 'polyphen2_value', label: 'PolyPhen', header: 'polyphen2_value'},
  {id: 'clinical_significance', label: 'Clinical significance', header: 'clinical_significance'}
];

/*
tgv_id
rs
variant_type 
chr 
position_grch37
ref 
alt 
variant_type 
symbol
jga_ngs_alt_allele_freq
jga_snp_alt_allele_freq 
tommo_8.5kjpn_alt_allele_freq
hgvd_alt_allele_freq 
gnomad_genome_total_alt_allele_freq
gnomad_exome_total_alt_allele_freq   
consequence     
sift_value
polyphen2_value 
clinical_significance
*/

export function strIns(str, idx, val) {
  return str.slice(0, idx) + val + str.slice(idx);
}
