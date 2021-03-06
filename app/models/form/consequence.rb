module Form
  class Consequence < ParameterBase
    register(:transcript_ablation, 'Transcript ablation', 'SO_0001893', '1')
    register(:splice_acceptor_variant, 'Splice acceptor variant', 'SO_0001574', '1')
    register(:splice_donor_variant, 'Splice donor variant', 'SO_0001575', '1')
    register(:stop_gained, 'Stop gained', 'SO_0001587', '1')
    register(:frameshift_variant, 'Frameshift variant', 'SO_0001589', '1')
    register(:stop_lost, 'Stop lost', 'SO_0001578', '1')
    register(:start_lost, 'Start lost', 'SO_0002012', '1')
    register(:transcript_amplification, 'Transcript amplification', 'SO_0001889', '1')
    register(:inframe_insertion, 'Inframe insertion', 'SO_0001821', '1')
    register(:inframe_deletion, 'Inframe deletion', 'SO_0001822', '1')
    register(:missense_variant, 'Missense variant', 'SO_0001583', '1')
    register(:protein_altering_variant, 'Protein altering variant', 'SO_0001818', '1')
    register(:splice_region_variant, 'Splice region variant', 'SO_0001630', '1')
    register(:incomplete_terminal_codon_variant, 'Incomplete terminal codon variant', 'SO_0001626', '1')
    register(:start_retained_variant, 'Start retained variant', 'SO_0002019', '1')
    register(:stop_retained_variant, 'Stop retained variant', 'SO_0001567', '1')
    register(:synonymous_variant, 'Synonymous variant', 'SO_0001819', '1')
    register(:coding_sequence_variant, 'Coding sequence variant', 'SO_0001580', '1')
    register(:mature_mirna_variant, 'Mature miRNA variant', 'SO_0001620', '1')
    register(:five_prime_utr_variant, '5 prime UTR variant', 'SO_0001623', '1')
    register(:three_prime_utr_variant, '3 prime UTR variant', 'SO_0001624', '1')
    register(:non_coding_transcript_exon_variant, 'Non coding transcript exon variant', 'SO_0001792', '1')
    register(:intron_variant, 'Intron variant', 'SO_0001627', '1')
    register(:nmd_transcript_variant, 'NMD transcript variant', 'SO_0001621', '1')
    register(:non_coding_transcript_variant, 'Non coding transcript variant', 'SO_0001619', '1')
    register(:upstream_gene_variant, 'Upstream gene variant', 'SO_0001631', '1')
    register(:downstream_gene_variant, 'Downstream gene variant', 'SO_0001632', '1')
    register(:tfbs_ablation, 'TFBS ablation', 'SO_0001895', '1')
    register(:tfbs_amplification, 'TFBS amplification', 'SO_0001892', '1')
    register(:tf_binding_site_variant, 'TF binding site variant', 'SO_0001782', '1')
    register(:regulatory_region_ablation, 'Regulatory region ablation', 'SO_0001894', '1')
    register(:regulatory_region_amplification, 'Regulatory region amplification', 'SO_0001891', '1')
    register(:feature_elongation, 'Feature elongation', 'SO_0001907', '1')
    register(:regulatory_region_variant, 'Regulatory region variant', 'SO_0001566', '1')
    register(:feature_truncation, 'Feature truncation', 'SO_0001906', '1')
    register(:intergenic_variant, 'Intergenic variant', 'SO_0001628', '1')
  end
end
