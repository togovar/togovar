class Variation
  module Searchable

    extend ActiveSupport::Concern
    include ElasticsearchIndex::Base

    included do
      include Elasticsearch::Model

      index_name :variation

      settings = {
        index: {
          number_of_shards: ENV.fetch('TOGOVAR_INDEX_VARIATION_NUMBER_OF_SHARDS') { 1 },
          number_of_replicas: ENV.fetch('TOGOVAR_INDEX_VARIATION_NUMBER_OF_REPLICAS') { 0 }
        }
      }

      settings settings do
        mapping dynamic: :strict do
          indexes :id, type: :long
          indexes :type, type: :keyword
          indexes :chromosome do
            indexes :index, type: :integer
            indexes :label, type: :keyword
          end
          indexes :start, type: :integer
          indexes :stop, type: :integer
          indexes :reference, type: :keyword
          indexes :alternative, type: :keyword
          indexes :vcf do
            indexes :position, type: :integer
            indexes :reference, type: :keyword
            indexes :alternative, type: :keyword
          end
          indexes :xref, type: :nested do
            indexes :source, type: :keyword
            indexes :id, type: :keyword
          end
          indexes :vep, type: :nested do
            indexes :transcript_id, type: :keyword
            indexes :consequence, type: :keyword
            indexes :gene_id, type: :keyword
            indexes :hgnc_id, type: :integer
            indexes :symbol, type: :nested do
              indexes :source, type: :keyword
              indexes :label, type: :keyword
            end
            indexes :hgvs_c, type: :keyword
            indexes :hgvs_p, type: :keyword
            indexes :hgvs_g, type: :keyword
            indexes :sift, type: :float
            indexes :polyphen, type: :float
          end
          indexes :clinvar do
            indexes :variation_id, type: :long
            indexes :allele_id, type: :long
            indexes :medgen, type: :keyword
            indexes :interpretation, type: :keyword
            # indexes :condition, {
            #   type: :text,
            #   analyzer: :standard,
            #   fields: {
            #     raw: {
            #       type: :keyword
            #     }
            #   }
            # }
          end
          indexes :frequency, type: :nested do
            indexes :source, type: :keyword
            indexes :filter, type: :keyword
            indexes :quality, type: :float
            indexes :allele do
              indexes :count, type: :long
              indexes :number, type: :long
              indexes :frequency, type: :float
            end
            indexes :genotype do
              indexes :alt_homo_count, type: :long
              indexes :hetero_count, type: :long
              indexes :ref_homo_count, type: :long
            end
          end
        end
      end
    end
  end
end
