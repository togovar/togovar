class SequenceOntology
  class << self
    def find(id)
      const_get(id)
    end

    def find_by_label(label)
      label = case label
              when 'Deletion'
                'deletion'
              when 'Insertion'
                'insertion'
              when 'Indel'
                'indel'
              when 'MNV'
                'substitution'
              else
                label
              end

      constants.select do |sym|
        sym.to_s.starts_with?('SO_') && const_get(sym).label == label
      end.map(&method(:const_get)).first
    end

    # @param [Array<String>] so_label
    def most_severe_consequence(*so_label)
      CONSEQUENCES_IN_ORDER.each do |so|
        return so.id if so_label.include?(so.label)
      end

      nil
    end
  end

  TERM = Struct.new(:id, :label, :display_term)

  # Variant classification
  SO_0001483 = TERM.new('SO_0001483', 'SNV')
  SO_0000667 = TERM.new('SO_0000667', 'insertion')
  SO_0000159 = TERM.new('SO_0000159', 'deletion')
  SO_1000032 = TERM.new('SO_1000032', 'indel')
  SO_1000002 = TERM.new('SO_1000002', 'substitution')

  # Variant consequences
  SO_0001893 = TERM.new('SO_0001893', 'transcript_ablation', 'Transcript ablation')
  SO_0001574 = TERM.new('SO_0001574', 'splice_acceptor_variant', 'Splice acceptor variant')
  SO_0001575 = TERM.new('SO_0001575', 'splice_donor_variant', 'Splice donor variant')
  SO_0001587 = TERM.new('SO_0001587', 'stop_gained', 'Stop gained')
  SO_0001589 = TERM.new('SO_0001589', 'frameshift_variant', 'Frameshift variant')
  SO_0001578 = TERM.new('SO_0001578', 'stop_lost', 'Stop lost')
  SO_0002012 = TERM.new('SO_0002012', 'start_lost', 'Start lost')
  SO_0001889 = TERM.new('SO_0001889', 'transcript_amplification', 'Transcript amplification')
  SO_0001821 = TERM.new('SO_0001821', 'inframe_insertion', 'Inframe insertion')
  SO_0001822 = TERM.new('SO_0001822', 'inframe_deletion', 'Inframe deletion')
  SO_0001583 = TERM.new('SO_0001583', 'missense_variant', 'Missense variant')
  SO_0001818 = TERM.new('SO_0001818', 'protein_altering_variant', 'Protein altering variant')
  SO_0001630 = TERM.new('SO_0001630', 'splice_region_variant', 'Splice region variant')
  SO_0001626 = TERM.new('SO_0001626', 'incomplete_terminal_codon_variant', 'Incomplete terminal codon variant')
  SO_0002019 = TERM.new('SO_0002019', 'start_retained_variant', 'Start retained variant')
  SO_0001567 = TERM.new('SO_0001567', 'stop_retained_variant', 'Stop retained variant')
  SO_0001819 = TERM.new('SO_0001819', 'synonymous_variant', 'Synonymous variant')
  SO_0001580 = TERM.new('SO_0001580', 'coding_sequence_variant', 'Coding sequence variant')
  SO_0001620 = TERM.new('SO_0001620', 'mature_miRNA_variant', 'Mature miRNA variant')
  SO_0001623 = TERM.new('SO_0001623', '5_prime_UTR_variant', '5 prime UTR variant')
  SO_0001624 = TERM.new('SO_0001624', '3_prime_UTR_variant', '3 prime UTR variant')
  SO_0001792 = TERM.new('SO_0001792', 'non_coding_transcript_exon_variant', 'Non coding transcript exon variant')
  SO_0001627 = TERM.new('SO_0001627', 'intron_variant', 'Intron variant')
  SO_0001621 = TERM.new('SO_0001621', 'NMD_transcript_variant', 'NMD transcript variant')
  SO_0001619 = TERM.new('SO_0001619', 'non_coding_transcript_variant', 'Non coding transcript variant')
  SO_0001631 = TERM.new('SO_0001631', 'upstream_gene_variant', 'Upstream gene variant')
  SO_0001632 = TERM.new('SO_0001632', 'downstream_gene_variant', 'Downstream gene variant')
  SO_0001895 = TERM.new('SO_0001895', 'TFBS_ablation', 'TFBS ablation')
  SO_0001892 = TERM.new('SO_0001892', 'TFBS_amplification', 'TFBS amplification')
  SO_0001782 = TERM.new('SO_0001782', 'TF_binding_site_variant', 'TF binding site variant')
  SO_0001894 = TERM.new('SO_0001894', 'regulatory_region_ablation', 'Regulatory region ablation')
  SO_0001891 = TERM.new('SO_0001891', 'regulatory_region_amplification', 'Regulatory region amplification')
  SO_0001907 = TERM.new('SO_0001907', 'feature_elongation', 'Feature elongation')
  SO_0001566 = TERM.new('SO_0001566', 'regulatory_region_variant', 'Regulatory region variant')
  SO_0001906 = TERM.new('SO_0001906', 'feature_truncation', 'Feature truncation')
  SO_0001628 = TERM.new('SO_0001628', 'intergenic_variant', 'Intergenic variant')

  CONSEQUENCES_IN_ORDER = [SO_0001893,
                           SO_0001574,
                           SO_0001575,
                           SO_0001587,
                           SO_0001589,
                           SO_0001578,
                           SO_0002012,
                           SO_0001889,
                           SO_0001821,
                           SO_0001822,
                           SO_0001583,
                           SO_0001818,
                           SO_0001630,
                           SO_0001626,
                           SO_0002019,
                           SO_0001567,
                           SO_0001819,
                           SO_0001580,
                           SO_0001620,
                           SO_0001623,
                           SO_0001624,
                           SO_0001792,
                           SO_0001627,
                           SO_0001621,
                           SO_0001619,
                           SO_0001631,
                           SO_0001632,
                           SO_0001895,
                           SO_0001892,
                           SO_0001782,
                           SO_0001894,
                           SO_0001891,
                           SO_0001907,
                           SO_0001566,
                           SO_0001906,
                           SO_0001628].freeze
end
