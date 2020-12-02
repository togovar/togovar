# frozen_string_literal: true

module TogoVar
  module API
    module Models
      module Version1
        class VariationConsequence < StrictTerms
          self.key_name = :consequence

          ACCEPTABLE_TERMS = %w[
            SO_0001893 SO_0001574 SO_0001575 SO_0001587 SO_0001589 SO_0001578 SO_0002012 SO_0001889 SO_0001821
            SO_0001822 SO_0001583 SO_0001818 SO_0001630 SO_0001626 SO_0002019 SO_0001567 SO_0001819 SO_0001580
            SO_0001620 SO_0001623 SO_0001624 SO_0001792 SO_0001627 SO_0001621 SO_0001619 SO_0001631 SO_0001632
            SO_0001895 SO_0001892 SO_0001782 SO_0001894 SO_0001891 SO_0001907 SO_0001566 SO_0001906 SO_0001628
            transcript_ablation splice_acceptor_variant splice_donor_variant stop_gained frameshift_variant stop_lost
            start_lost transcript_amplification inframe_insertion inframe_deletion missense_variant
            protein_altering_variant splice_region_variant incomplete_terminal_codon_variant start_retained_variant
            stop_retained_variant synonymous_variant coding_sequence_variant mature_miRNA_variant
            5_prime_UTR_variant 3_prime_UTR_variant non_coding_transcript_exon_variant intron_variant
            NMD_transcript_variant non_coding_transcript_variant upstream_gene_variant downstream_gene_variant
            TFBS_ablation TFBS_amplification TF_binding_site_variant regulatory_region_ablation
            regulatory_region_amplification feature_elongation regulatory_region_variant feature_truncation
            intergenic_variant
          ].freeze

          def to_hash
            validate

            terms = @terms
                      .map { |x| (SequenceOntology.find(x) || SequenceOntology.find_by_key(x))&.key }
                      .compact

            q = Elasticsearch::DSL::Search.search do
              query do
                nested do
                  path :vep
                  query do
                    terms 'vep.consequence': terms
                  end
                end
              end
            end

            (@relation == 'ne' ? negate(q) : q).to_hash[:query]
          end

          protected

          def acceptable_terms
            ACCEPTABLE_TERMS
          end
        end
      end
    end
  end
end
