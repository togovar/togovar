export const PAGE = document.getElementsByTagName('html')[0].dataset.page;
export const TR_HEIGHT = 27;
export const COMMON_HEADER_HEIGHT = 30;
export const COMMON_FOOTER_HEIGHT = 22;
export const API_URL = process.env.TOGOVAR_FRONTEND_API_URL || 'https://togovar.biosciencedbc.jp';

export const COLUMNS = [
  {id: 'tgv_id', label: 'TogoVar ID', },
  {id: 'rs', label: 'RefSNP ID', },
  {id: 'position', label: 'Position', },
  {id: 'ref_alt', label: 'Ref / Alt', },
  {id: 'variant_type', label: 'Type', },
  {id: 'symbol', label: 'Gene', },
  {id: 'freq', label: 'Alt frequency', },
  {id: 'consequence', label: 'Consequence', },
  {id: 'sift_value', label: 'SIFT', },
  {id: 'polyphen2_value', label: 'PolyPhen', },
  {id: 'clinical_significance', label: 'Clinical significance', }
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
