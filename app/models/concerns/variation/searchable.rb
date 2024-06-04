class Variation
  module Searchable
    extend ActiveSupport::Concern
    include ElasticsearchIndex::Base

    included do
      include Elasticsearch::Model

      index_name :variant

      settings = {
        index: {
          number_of_shards: (ENV.fetch('TOGOVAR_INDEX_VARIANT_NUMBER_OF_SHARDS') { 1 }).to_i,
          number_of_replicas: (ENV.fetch('TOGOVAR_INDEX_VARIANT_NUMBER_OF_REPLICAS') { 0 }).to_i
        }
      }

      settings settings do
        mapping dynamic: :strict do
          indexes :id, type: :long
          indexes :active, type: :boolean
          indexes :type, type: :keyword
          indexes :chromosome do
            indexes :index, type: :integer
            indexes :label, type: :keyword
          end
          indexes :start, type: :integer
          indexes :stop, type: :integer
          indexes :reference, type: :keyword
          indexes :alternate, type: :keyword
          indexes :vcf do
            indexes :position, type: :integer
            indexes :reference, type: :keyword
            indexes :alternate, type: :keyword
          end
          indexes :xref, type: :nested do
            indexes :source, type: :keyword
            indexes :id, type: :keyword
          end
          indexes :most_severe_consequence, type: :keyword
          indexes :sift, type: :float
          indexes :polyphen, type: :float
          indexes :alphamissense, type: :float
          indexes :vep, type: :nested do
            indexes :consequence_type, type: :keyword
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
            indexes :alphamissense, type: :float
          end
          indexes :clinvar do
            indexes :id, type: :long
            indexes :accession, type: :keyword
            indexes :condition, type: :nested do
              indexes :medgen, type: :keyword
              indexes :interpretation, type: :keyword
              indexes :submission_count, type: :integer
            end
          end
          indexes :frequency, type: :nested do
            indexes :source, type: :keyword
            indexes :filter, type: :keyword
            indexes :quality, type: :float
            indexes :allele do # TODO: flatten nested object
              indexes :count, type: :long
              indexes :number, type: :long
              indexes :frequency, type: :float
            end
            indexes :genotype do # TODO: flatten nested object
              indexes :alt_homo_count, type: :long
              indexes :hetero_count, type: :long
              indexes :ref_homo_count, type: :long
            end
          end
        end
      end
    end

    module Datasets
      DATASETS = Rails.application.config.application[:datasets]
      private_constant :DATASETS
      FREQUENCY_WITH_FILTER = Array(DATASETS[:frequency].filter_map { |x| x[:id] if x[:filter] }).map(&:to_sym)
      FREQUENCY = FREQUENCY_WITH_FILTER + Array(DATASETS[:frequency].filter_map { |x| x[:id] unless x[:filter] }).map(&:to_sym)
      ALL = FREQUENCY + Array(DATASETS[:annotation].filter_map { |x| x[:id] }).map(&:to_sym)
    end

    module ClassMethods
      # @return [Hash]
      def cardinality
        return @cardinality if @cardinality

        query = Elasticsearch::DSL::Search.search do
          size 0
          aggregation :types do
            cardinality do
              field :type
            end
          end
          aggregation :clinvar_interpretations do
            nested do
              path 'clinvar.conditions'
              aggregation :clinvar_interpretations do
                cardinality do
                  field :'clinvar.conditions.interpretation'
                end
              end
            end
          end
          aggregation :vep_consequences do
            cardinality do
              field :'most_severe_consequence'
            end
          end
        end

        response = __elasticsearch__.search(query, request_cache: true)

        @cardinality = response.aggregations
                         .map { |k, v| [k, v.key?('value') ? v['value'] : v[k]['value']] }
                         .to_h
                         .symbolize_keys
                         .merge(frequency_sources: Datasets::FREQUENCY.size)
      end

      def default_condition
        Elasticsearch::DSL::Search.search do
          query do
            match active: true
          end
        end.to_hash[:query]
      end
    end
  end
end
