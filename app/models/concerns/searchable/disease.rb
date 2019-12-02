module Searchable
  module Disease
    extend ActiveSupport::Concern

    included do
      include Elasticsearch::Model

      index_name :diseases

      config = Rails.configuration.elasticsearch

      settings = {
        index: {
          number_of_shards: config.dig('indices', 'diseases', 'number_of_shards') || 1,
          number_of_replicas: config.dig('indices', 'diseases', 'number_of_replicas') || 0
        },
        analysis: {
          analyzer: {
            condition_search_analyzer: {
              type: :custom,
              tokenizer: :standard,
              filter: :lowercase
            },
            condition_suggest_analyzer: {
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
        mapping dynamic: false do
          indexes :term,
                  type: :keyword,
                  fields: {
                    search: {
                      type: :text,
                      analyzer: :condition_search_analyzer
                    },
                    suggest: {
                      type: :text,
                      analyzer: :condition_suggest_analyzer
                    },
                    lowercase: {
                      type: :keyword,
                      normalizer: :lowercase
                    }
                  }
        end
      end
    end
  end
end
