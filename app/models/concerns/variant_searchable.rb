module VariantSearchable
  extend ActiveSupport::Concern

  included do
    include Elasticsearch::Model

    index_name :variants

    config = Rails.configuration.elasticsearch

    settings index: {
      number_of_shards: config.dig('indices', 'variants', 'number_of_shards'),
      number_of_replicas: config.dig('indices', 'variants', 'number_of_replicas')
    } do
      mapping dynamic: false do
        indexes :tgv_id, type: :long

        indexes :chromosome, type: :keyword
        indexes :start, type: :integer
        indexes :stop, type: :integer

        indexes :variant_type, type: :keyword
        indexes :reference, type: :keyword
        indexes :alternative, type: :keyword
        indexes :hgvs_g, type: :keyword

        indexes :vcf do
          indexes :position, type: :integer
          indexes :reference, type: :keyword
          indexes :alternative, type: :keyword
        end

        indexes :existing_variations, type: :keyword

        indexes :transcripts, type: :nested do
          indexes :transcript_id, type: :keyword
          indexes :consequences, type: :keyword
          indexes :gene_id, type: :keyword
          indexes :hgnc_id, type: :integer
          indexes :symbol, type: :keyword
          indexes :symbol_source, type: :keyword
          indexes :hgvs_c, type: :keyword
          indexes :hgvs_p, type: :keyword
          indexes :polyphen, type: :float
          indexes :sift, type: :float
        end

        indexes :conditions, type: :nested do
          indexes :vcv, type: :keyword
          indexes :rcv, type: :keyword
          indexes :condition, type: :keyword
          indexes :interpretations, type: :keyword
        end

        indexes :frequencies, type: :nested do
          indexes :source, type: :keyword
          indexes :ref_allele_count, type: :long
          indexes :alt_allele_count, type: :long
          indexes :allele_count, type: :long
          indexes :num_genotype_alt_homo_count, type: :long
          indexes :num_genotype_hetero_count, type: :long
          indexes :num_genotype_ref_homo_count, type: :long
          indexes :frequency, type: :double
          indexes :filter, type: :keyword
          indexes :quality, type: :double
        end
      end
    end
  end
end
