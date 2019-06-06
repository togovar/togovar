export const PAGE = document.getElementsByTagName('html')[0].dataset.page;
export const TR_HEIGHT = 27;

export const DEFAULT_CONDITIONS = {
  term: '',
  dataset: {
    jga_ngs: '1',
    jga_snp: '1',
    tommo: '1',
    hgvd: '1',
    exac: '1',
    //mgend: '1',
    clinvar: '1'
  },
  frequency: {
    from: '0',
    to: '1',
    invert: '0',
    match: 'any'
  },
  quality: '1',
  type: {
    SO_0001483: '1',
    SO_0000667: '1',
    SO_0000159: '1',
    SO_1000032: '1',
    SO_1000002: '1'
  },
  significance: {
    NC: '1',
    P: '1',
    LP: '1',
    US: '1',
    LB: '1',
    B: '1',
    CI: '1',
    DR: '1',
    A: '1',
    RF: '1',
    PR: '1',
    AF: '1',
    //CD: '1',
    O: '1',
    NP: '1',
    AN: '1'
  },
  consequence: {
    SO_0001893: '1',
    SO_0001574: '1',
    SO_0001575: '1',
    SO_0001587: '1',
    SO_0001589: '1',
    SO_0001578: '1',
    SO_0002012: '1',
    SO_0001889: '1',
    SO_0001821: '1',
    SO_0001822: '1',
    SO_0001583: '1',
    SO_0001818: '1',
    SO_0001630: '1',
    SO_0001626: '1',
    SO_0002019: '1',
    SO_0001567: '1',
    SO_0001819: '1',
    SO_0001580: '1',
    SO_0001620: '1',
    SO_0001623: '1',
    SO_0001624: '1',
    SO_0001792: '1',
    SO_0001627: '1',
    SO_0001621: '1',
    SO_0001619: '1',
    SO_0001631: '1',
    SO_0001632: '1',
    SO_0001895: '1',
    SO_0001892: '1',
    SO_0001782: '1',
    SO_0001894: '1',
    SO_0001891: '1',
    SO_0001907: '1',
    SO_0001566: '1',
    SO_0001906: '1',
    SO_0001628: '1'
  },
  sift: {
    D: '1',
    T: '1'
  },
  polyphen: {
    PROBD: '1',
    POSSD: '1',
    B: '1',
    U: '1'
  }
};

export const VARIANT_TYPE_LABELS = {
  SO_0001483: 'SNV',
  SO_0000667: 'Ins',
  SO_0000159: 'Del',
  SO_1000032: 'Indel',
  SO_1000002: 'Sub'
};
export const DATASETS = {
  jga_ngs: {
    label: 'JGA-NGS',
    search: 'jga_ngs'
  },
  jga_snp: {
    label: 'JGA-SNP',
    search: 'jga_snp'
  },
  tommo: {
    label: '3.5KJPN',
    search: 'tommo'
  },
  hgvd: {
    label: 'HGVD',
    search: 'hgvd'
  },
  exac: {
    label: 'ExAC',
    search: 'exac'
  },
  gnomad: {
    label: 'gnomAD',
    search: 'gnomad'
  },
  mgend: {
    label: 'MGeND',
    search: 'mgend'
  },
  clinvar: {
    label: 'ClinVar',
    search: 'clinvar'
  }
};
export const CONSEQUENCES = [
  {
    term: 'transcript_ablation',
    description: 'A feature ablation whereby the deleted region includes a transcript feature',
    accession: 'SO_0001893',
    label: 'Transcript ablation',
    impact: 'high'
  },
  {
    term: 'splice_acceptor_variant',
    description: 'A splice variant that changes the 2 base region at the 3\' end of an intron',
    accession: 'SO_0001574',
    label: 'Splice acceptor variant',
    impact: 'high'
  },
  {
    term: 'splice_donor_variant',
    description: 'A splice variant that changes the 2 base region at the 5\' end of an intron',
    accession: 'SO_0001575',
    label: 'Splice donor variant',
    impact: 'high'
  },
  {
    term: 'stop_gained',
    description: 'A sequence variant whereby at least one base of a codon is changed, resulting in a premature stop codon, leading to a shortened transcript',
    accession: 'SO_0001587',
    label: 'Stop gained',
    impact: 'high'
  },
  {
    term: 'frameshift_variant',
    description: 'A sequence variant which causes a disruption of the translational reading frame, because the number of nucleotides inserted or deleted is not a multiple of three',
    accession: 'SO_0001589',
    label: 'Frameshift variant',
    impact: 'high'
  },
  {
    term: 'stop_lost',
    description: 'A sequence variant where at least one base of the terminator codon (stop) is changed, resulting in an elongated transcript',
    accession: 'SO_0001578',
    label: 'Stop lost',
    impact: 'high'
  },
  {
    term: 'start_lost',
    description: 'A codon variant that changes at least one base of the canonical start codon',
    accession: 'SO_0002012',
    label: 'Start lost',
    impact: 'high'
  },
  {
    term: 'transcript_amplification',
    description: 'A feature amplification of a region containing a transcript',
    accession: 'SO_0001889',
    label: 'Transcript amplification',
    impact: 'high'
  },
  {
    term: 'inframe_insertion',
    description: 'An inframe non synonymous variant that inserts bases into in the coding sequence',
    accession: 'SO_0001821',
    label: 'Inframe insertion',
    impact: 'moderate'
  },
  {
    term: 'inframe_deletion',
    description: 'An inframe non synonymous variant that deletes bases from the coding sequence',
    accession: 'SO_0001822',
    label: 'Inframe deletion',
    impact: 'moderate'
  },
  {
    term: 'missense_variant',
    description: 'A sequence variant, that changes one or more bases, resulting in a different amino acid sequence but where the length is preserved',
    accession: 'SO_0001583',
    label: 'Missense variant',
    impact: 'moderate'
  },
  {
    term: 'protein_altering_variant',
    description: 'A sequence_variant which is predicted to change the protein encoded in the coding sequence',
    accession: 'SO_0001818',
    label: 'Protein altering variant',
    impact: 'moderate'
  },
  {
    term: 'splice_region_variant',
    description: 'A sequence variant in which a change has occurred within the region of the splice site, either within 1-3 bases of the exon or 3-8 bases of the intron',
    accession: 'SO_0001630',
    label: 'Splice region variant',
    impact: 'low'
  },
  {
    term: 'incomplete_terminal_codon_variant',
    description: 'A sequence variant where at least one base of the final codon of an incompletely annotated transcript is changed',
    accession: 'SO_0001626',
    label: 'Incomplete terminal codon variant',
    impact: 'low'
  },
  {
    term: 'start_retained_variant',
    description: 'A sequence variant where at least one base in the start codon is changed, but the start remains',
    accession: 'SO_0002019',
    label: 'Start retained variant',
    impact: 'low'
  },
  {
    term: 'stop_retained_variant',
    description: 'A sequence variant where at least one base in the terminator codon is changed, but the terminator remains',
    accession: 'SO_0001567',
    label: 'Stop retained variant',
    impact: 'low'
  },
  {
    term: 'synonymous_variant',
    description: 'A sequence variant where there is no resulting change to the encoded amino acid',
    accession: 'SO_0001819',
    label: 'Synonymous variant',
    impact: 'low'
  },
  {
    term: 'coding_sequence_variant',
    description: 'A sequence variant that changes the coding sequence',
    accession: 'SO_0001580',
    label: 'Coding sequence variant',
    impact: 'modifier'
  },
  {
    term: 'mature_miRNA_variant',
    description: 'A transcript variant located with the sequence of the mature miRNA',
    accession: 'SO_0001620',
    label: 'Mature miRNA variant',
    impact: 'modifier'
  },
  {
    term: '5_prime_UTR_variant',
    description: 'A UTR variant of the 5\' UTR',
    accession: 'SO_0001623',
    label: '5 prime UTR variant',
    impact: 'modifier'
  },
  {
    term: '3_prime_UTR_variant',
    description: 'A UTR variant of the 3\' UTR',
    accession: 'SO_0001624',
    label: '3 prime UTR variant',
    impact: 'modifier'
  },
  {
    term: 'non_coding_transcript_exon_variant',
    description: 'A sequence variant that changes non-coding exon sequence in a non-coding transcript',
    accession: 'SO_0001792',
    label: 'Non coding transcript exon variant',
    impact: 'modifier'
  },
  {
    term: 'intron_variant',
    description: 'A transcript variant occurring within an intron',
    accession: 'SO_0001627',
    label: 'Intron variant',
    impact: 'modifier'
  },
  {
    term: 'NMD_transcript_variant',
    description: 'A variant in a transcript that is the target of NMD',
    accession: 'SO_0001621',
    label: 'NMD transcript variant',
    impact: 'modifier'
  },
  {
    term: 'non_coding_transcript_variant',
    description: 'A transcript variant of a non coding RNA gene',
    accession: 'SO_0001619',
    label: 'Non coding transcript variant',
    impact: 'modifier'
  },
  {
    term: 'upstream_gene_variant',
    description: 'A sequence variant located 5\' of a gene',
    accession: 'SO_0001631',
    label: 'Upstream gene variant',
    impact: 'modifier'
  },
  {
    term: 'downstream_gene_variant',
    description: 'A sequence variant located 3\' of a gene',
    accession: 'SO_0001632',
    label: 'Downstream gene variant',
    impact: 'modifier'
  },
  {
    term: 'TFBS_ablation',
    description: 'A feature ablation whereby the deleted region includes a transcription factor binding site',
    accession: 'SO_0001895',
    label: 'TFBS ablation',
    impact: 'modifier'
  },
  {
    term: 'TFBS_amplification',
    description: 'A feature amplification of a region containing a transcription factor binding site',
    accession: 'SO_0001892',
    label: 'TFBS amplification',
    impact: 'modifier'
  },
  {
    term: 'TF_binding_site_variant',
    description: 'A sequence variant located within a transcription factor binding site',
    accession: 'SO_0001782',
    label: 'TF binding site variant',
    impact: 'modifier'
  },
  {
    term: 'regulatory_region_ablation',
    description: 'A feature ablation whereby the deleted region includes a regulatory region',
    accession: 'SO_0001894',
    label: 'Regulatory region ablation',
    impact: 'moderate'
  },
  {
    term: 'regulatory_region_amplification',
    description: 'A feature amplification of a region containing a regulatory region',
    accession: 'SO_0001891',
    label: 'Regulatory region amplification',
    impact: 'modifier'
  },
  {
    term: 'feature_elongation',
    description: 'A sequence variant that causes the extension of a genomic feature, with regard to the reference sequence',
    accession: 'SO_0001907',
    label: 'Feature elongation',
    impact: 'modifier'
  },
  {
    term: 'regulatory_region_variant',
    description: 'A sequence variant located within a regulatory region',
    accession: 'SO_0001566',
    label: 'Regulatory region variant',
    impact: 'modifier'
  },
  {
    term: 'feature_truncation',
    description: 'A sequence variant that causes the reduction of a genomic feature, with regard to the reference sequence',
    accession: 'SO_0001906',
    label: 'Feature truncation',
    impact: 'modifier'
  },
  {
    term: 'intergenic_variant',
    description: 'A sequence variant located in the intergenic region, between genes',
    accession: 'SO_0001628',
    label: 'Intergenic variant',
    impact: 'modifier'
  }
];

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
