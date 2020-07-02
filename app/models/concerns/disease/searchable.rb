class Disease
  module Searchable
    extend ActiveSupport::Concern
    include ElasticsearchIndex::Base

    included do
      include Elasticsearch::Model

      index_name :disease

      settings = {
        index: {
          number_of_shards: ENV.fetch('TOGOVAR_INDEX_DISEASE_NUMBER_OF_SHARDS') { 1 },
          number_of_replicas: ENV.fetch('TOGOVAR_INDEX_DISEASE_NUMBER_OF_REPLICAS') { 0 }
        },
        analysis: {
          analyzer: {
            name_search_analyzer: {
              type: :custom,
              tokenizer: :standard,
              filter: :lowercase
            },
            name_suggest_analyzer: {
              type: :custom,
              tokenizer: :standard,
              filter: %i[min_length lowercase edge_ngram_filter]
            }
          },
          filter: {
            min_length: {
              type: :length,
              min: 3
            },
            edge_ngram_filter: {
              type: :edge_ngram,
              min_gram: 3,
              max_gram: 20
            }
          },
          normalizer: {
            lowercase: {
              type: :custom,
              filter: :lowercase
            }
          }
        }
      }

      settings settings do
        mapping dynamic: :strict do
          indexes :id, type: :keyword
          indexes :name, type: :keyword,
                  fields: {
                    search: {
                      type: :text,
                      analyzer: :name_search_analyzer
                    },
                    suggest: {
                      type: :text,
                      analyzer: :name_suggest_analyzer
                    },
                    lowercase: {
                      type: :keyword,
                      normalizer: :lowercase
                    }
                  }
          indexes :source, type: :keyword
        end
      end
    end

    module ClassMethods
      # @param [String] keyword
      # @return [Elasticsearch::Model::Response] response
      def suggest(keyword)
        query = ::Elasticsearch::DSL::Search.search do
          query do
            bool do
              should do
                match 'name.search': { query: keyword, boost: 2 }
              end
              should do
                match 'name.suggest': keyword
              end
            end
          end
        end

        __elasticsearch__.search(query)
      end

      # @param [String] keyword
      # @return [Hash]
      def exact_match(keyword)
        query = ::Elasticsearch::DSL::Search.search do
          query do
            match 'name.lowercase': keyword.downcase
          end
        end

        (r = __elasticsearch__.search(query).results.first) ? r['_source'].slice('id', 'name') : {}
      end

      # @param [String] keyword
      # @return [Hash]
      def condition_search(keyword)
        query = ::Elasticsearch::DSL::Search.search do
          query do
            match 'name.search': keyword.downcase
          end
        end

        __elasticsearch__.search(query).results.map { |x| x['_source'].slice('id', 'name') }
      end
    end
  end
end
